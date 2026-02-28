import { z } from 'zod';
import path from 'path';
import { AICon } from '../fetch.js';
import {
    isValidJSON,
    json_decoder,
    create_folders,
    create_files,
    add_lines,
    delete_line,
    modify_line,
    fileToLinesArray,
    writeLinesToFile,
} from '../utills.js';

// Zod schema

export const generateCodeSchema = {
    prompt: z.string().min(1).describe('The user instruction for what code to generate or change'),
    history: z
        .array(z.string())
        .optional()
        .describe('Previous prompts for context (newest last)'),
};

export async function generateCode(prompt, history = []) {
    const filesChanged = [];

    // Append previous prompts as context
    const contextBlock =
        history.length > 0
            ? '\n\nPrevious prompts by user:\n' + history.map((p) => `- ${p}`).join('\n')
            : '';

    const fullPrompt = prompt + contextBlock;

    const rawResponse = await AICon(fullPrompt);

    if (!isValidJSON(rawResponse)) {
        return {
            success: false,
            message: `AI returned non-JSON response: ${rawResponse.slice(0, 300)}`,
            filesChanged: [],
        };
    }

    const plan = json_decoder(rawResponse);
    
    if (plan.message && Object.keys(plan).length === 1) {
        return { success: false, message: plan.message, filesChanged: [] };
    }

    // Create requested folders
    if (Array.isArray(plan.folder_paths) && plan.folder_paths.length > 0) {
        create_folders(plan.folder_paths);
    }

    // Create requested empty files
    if (Array.isArray(plan.files_path) && plan.files_path.length > 0) {
        create_files(plan.files_path);
    }

    // Apply file changes
    if (Array.isArray(plan.file_contents_and_changes)) {
        for (const fileChange of plan.file_contents_and_changes) {
            const filePath = path.resolve(fileChange.file_path);
            let lines = fileToLinesArray(filePath);

            for (const change of fileChange.changes ?? []) {
                if (change.action === 'add') {
                    add_lines(lines, change.line, change.content);
                } else if (change.action === 'modify') {
                    modify_line(lines, change.line, change.content);
                } else if (change.action === 'delete') {
                    delete_line(lines, change.line);
                }
            }

            writeLinesToFile(filePath, lines);
            filesChanged.push(filePath);

            // If AI wants to read files and continue, handle recursively
            if (Array.isArray(fileChange.read_files) && fileChange.read_files.length > 0) {
                const readContents = fileChange.read_files
                    .map((f) => {
                        const rPath = path.resolve(f);
                        const rLines = fileToLinesArray(rPath);
                        return `Contents of ${rPath}:\n${rLines.join('\n')}`;
                    })
                    .join('\n\n');

                const followUp = `${fullPrompt}\n\nPlease take into account the following file contents:\n${readContents}`;
                const nested = await generateCode(followUp, []);
                filesChanged.push(...nested.filesChanged);
            }
        }
    }

    const summary =
        filesChanged.length > 0
            ? `Done. Modified files:\n${filesChanged.map((f) => `  • ${f}`).join('\n')}`
            : 'Done. No files were changed.';

    return { success: true, message: summary, filesChanged };
}
