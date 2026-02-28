import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { read_directory_structure, fileToLinesArray } from '../utills.js';

// read_file tool

export const readFileSchema = {
    file_path: z.string().min(1).describe('Path to the file to read (relative or absolute)'),
};


export function readFile(filePath) {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
        return { success: false, content: `File not found: ${resolved}` };
    }
    const lines = fileToLinesArray(resolved);
    return { success: true, content: lines.join('\n') };
}

// list_directory tool

export const listDirectorySchema = {
    dir_path: z
        .string()
        .optional()
        .describe('Directory to list (defaults to current working directory)'),
};

export function listDirectory(dirPath) {
    try {
        const resolved = dirPath ? path.resolve(dirPath) : process.cwd();
        const structure = read_directory_structure(resolved);
        return { success: true, content: JSON.stringify(structure, null, 2) };
    } catch (err) {
        return { success: false, content: `Error listing directory: ${err.message}` };
    }
}
