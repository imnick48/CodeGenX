import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import chalk from 'chalk';
import figlet from 'figlet';
import { InputSection } from './InpSection.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDatabase, createTable } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));


console.log(
    chalk.cyanBright(
        figlet.textSync('CodeGenX', { font: 'Big' }),
    ),
);
console.log(chalk.dim('  AI Code Generator  ·  MCP Architecture  ·  v2.0.0\n'));

// Per-project Config Resolution

const DB_DIR = './.CodeGenX';
const DB_PATH = `${DB_DIR}/ProjectGX.sqlite`;

let apiKey = process.env.OPENROUTER_API_KEY || '';
let apiModel = process.env.OPENROUTER_API_MODEL || '';

if (!apiKey || !apiModel) {
    const isNewProject = !fs.existsSync(DB_PATH);

    fs.mkdirSync(DB_DIR, { recursive: true });
    const db = initDatabase(DB_PATH);

    createTable(db, 'CONFIG', `
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      key   TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL
    `);

    if (isNewProject) {
        console.log(chalk.yellow('  ⚡ New project detected — setting up .CodeGenX database…\n'));
    }

    // API Key
    if (!apiKey) {
        const existingKey = db.prepare(`SELECT value FROM CONFIG WHERE key = ?`).get('api_key');
        if (existingKey) {
            apiKey = existingKey.value;
            console.log(chalk.green('  ✓ API Key loaded from project database'));
        } else {
            apiKey = (await InputSection(chalk.yellow('  Enter your OpenRouter API Key'))).trim();
            db.prepare(`INSERT INTO CONFIG (key, value) VALUES (?, ?)`).run('api_key', apiKey);
            console.log(chalk.green('  ✓ API Key saved to project database'));
        }
    }

    // Model
    if (!apiModel) {
        const existingModel = db.prepare(`SELECT value FROM CONFIG WHERE key = ?`).get('api_model');
        if (existingModel) {
            apiModel = existingModel.value;
            console.log(chalk.green('  ✓ Model loaded from project database'));
        } else {
            apiModel = (await InputSection(chalk.yellow('  Enter your OpenRouter Model (e.g. mistralai/mistral-7b-instruct:free)'))).trim();
            db.prepare(`INSERT INTO CONFIG (key, value) VALUES (?, ?)`).run('api_model', apiModel);
            console.log(chalk.green('  ✓ Model saved to project database'));
        }
    }

    console.log();
    db.close();
}

// Spawn MCP Server

const serverPath = path.join(__dirname, 'server.js');

const transport = new StdioClientTransport({
    command: 'node',
    args: [serverPath],
    env: { ...process.env, OPENROUTER_API_KEY: apiKey, OPENROUTER_API_MODEL: apiModel },
});

const client = new Client(
    { name: 'CodeGenX-CLI', version: '2.0.0' },
    { capabilities: {} },
);

process.stdout.write(chalk.dim('  Connecting to CodeGenX server…'));
await client.connect(transport);
console.log(chalk.green(' ✓\n'));


async function callTool(name, args) {
    const response = await client.callTool({ name, arguments: args });

    if (!response.content || response.content.length === 0) {
        return { text: '', isError: false };
    }

    const text = response.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('\n');

    return { text, isError: response.isError ?? false };
}


console.log(chalk.yellow('  Available commands:'));
console.log(chalk.dim('    /list [path]    — list directory structure'));
console.log(chalk.dim('    /read <path>    — read a file'));
console.log(chalk.dim('    /history        — show prompt history'));
console.log(chalk.dim('    /tools          — list available MCP tools'));
console.log(chalk.dim('    /quit  or  /exit — exit'));
console.log();

while (true) {
    let userInput;
    try {
        userInput = (await InputSection(chalk.cyanBright('You'))).trim();
    } catch {
        break;
    }

    if (!userInput) continue;

    if (userInput === '/quit' || userInput === '/exit') {
        console.log(chalk.dim('\n  Goodbye! 👋\n'));
        break;
    }

    if (userInput === '/tools') {
        const toolsResponse = await client.listTools();
        console.log(chalk.yellow('\n  Available MCP Tools:'));
        for (const tool of toolsResponse.tools) {
            console.log(`  ${chalk.cyan('•')} ${chalk.bold(tool.name)} — ${chalk.dim(tool.description)}`);
        }
        console.log();
        continue;
    }

    if (userInput === '/history') {
        const { text, isError } = await callTool('get_prompt_history', { limit: 20 });
        if (isError) {
            console.log(chalk.red('\n  ✗ ' + text + '\n'));
        } else {
            console.log(chalk.yellow('\n  Prompt History:\n') + chalk.dim('  ' + text.replace(/\n/g, '\n  ')) + '\n');
        }
        continue;
    }

    if (userInput.startsWith('/read ')) {
        const filePath = userInput.slice(6).trim();
        const { text, isError } = await callTool('read_file', { file_path: filePath });
        if (isError) {
            console.log(chalk.red(`\n  ✗ ${text}\n`));
        } else {
            console.log(chalk.yellow(`\n  ${filePath}:\n`) + chalk.dim(text) + '\n');
        }
        continue;
    }

    if (userInput.startsWith('/list')) {
        const dirPath = userInput.slice(5).trim() || undefined;
        const { text, isError } = await callTool('list_directory', { dir_path: dirPath });
        if (isError) {
            console.log(chalk.red(`\n  ✗ ${text}\n`));
        } else {
            console.log(chalk.yellow('\n  Directory Structure:\n') + chalk.dim(text) + '\n');
        }
        continue;
    }


    console.log(chalk.dim('\n  ⟳ Thinking…'));

    try {
        const { text, isError } = await callTool('generate_code', { prompt: userInput });

        if (isError) {
            console.log(chalk.red('\n  ✗ ' + text + '\n'));
        } else {
            console.log(chalk.green('\n  ✓ ') + text + '\n');
        }
    } catch (err) {
        console.log(chalk.red(`\n  ✗ Error: ${err.message}\n`));
    }
}

await client.close();
process.exit(0);
