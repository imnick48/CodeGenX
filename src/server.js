import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { generateCode, generateCodeSchema } from './tools/codegenTool.js';
import { readFile, readFileSchema, listDirectory, listDirectorySchema } from './tools/fsTool.js';
import { initDatabase, createTable, getAll } from './db.js';
import fs from 'fs';

const DB_DIR = './.CodeGenX';
const DB_PATH = `${DB_DIR}/ProjectGX.sqlite`;

fs.mkdirSync(DB_DIR, { recursive: true });
const db = initDatabase(DB_PATH);

createTable(db, 'PROMPTS', `
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  Prompts TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
`);

createTable(db, 'CONFIG', `
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  key   TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL
`);

// MCP Server

const server = new McpServer({
    name: 'CodeGenX',
    version: '2.0.0',
});

// Tool: generate_code
server.tool(
    'generate_code',
    'Generate or modify code files based on a natural-language instruction. ' +
    'Returns a summary of all files that were created or changed.',
    generateCodeSchema,
    async ({ prompt, history }) => {
        // Fetch stored prompt history for context if caller did not supply it
        const storedHistory = history ?? getAll(db, 'PROMPTS').map((r) => r.Prompts);

        const result = await generateCode(prompt, storedHistory);

        // Persist this prompt to the DB
        const { insertData } = await import('./db.js');
        insertData(db, 'PROMPTS', { Prompts: prompt });

        return {
            content: [
                {
                    type: 'text',
                    text: result.success
                        ? result.message
                        : `⚠️  Generation failed: ${result.message}`,
                },
            ],
            isError: !result.success,
        };
    },
);

// Tool: read_file
server.tool(
    'read_file',
    'Read the full contents of a file from disk and return it as text.',
    readFileSchema,
    async ({ file_path }) => {
        const result = readFile(file_path);
        return {
            content: [{ type: 'text', text: result.content }],
            isError: !result.success,
        };
    },
);

// Tool: list_directory
server.tool(
    'list_directory',
    'Return the directory tree structure as JSON. Defaults to CWD.',
    listDirectorySchema,
    async ({ dir_path }) => {
        const result = listDirectory(dir_path);
        return {
            content: [{ type: 'text', text: result.content }],
            isError: !result.success,
        };
    },
);

// Tool: get_prompt_history
server.tool(
    'get_prompt_history',
    'Return all previously stored prompts from the local SQLite database.',
    { limit: z.number().int().positive().optional().describe('Max number of recent prompts to return') },
    async ({ limit }) => {
        let rows = getAll(db, 'PROMPTS');
        if (limit) rows = rows.slice(-limit);
        const text =
            rows.length === 0
                ? 'No prompt history found.'
                : rows.map((r, i) => `${i + 1}. ${r.Prompts}`).join('\n');
        return { content: [{ type: 'text', text }] };
    },
);

// Start

const transport = new StdioServerTransport();
await server.connect(transport);
// Server is now listening on stdin/stdout — process stays alive until closed.
