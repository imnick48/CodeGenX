import fs from 'fs';
import path from 'path';

function read_directory_structure(dirPath = process.cwd()) {
    function walk(dir) {
        const result = { path: dir, folders: [], files: [] };
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === 'node_modules' || entry.name === '.git') {
                    result.folders.push({ path: fullPath, skipped: true });
                } else {
                    result.folders.push(walk(fullPath));
                }
            } else {
                result.files.push(fullPath);
            }
        }
        return result;
    }
    return walk(dirPath);
}

function isValidJSON(str) {
    try {
        JSON.parse(str);
        return true;
    } catch {
        return false;
    }
}

function json_decoder(str) {
    try {
        return JSON.parse(str);
    } catch { /* fall through */ }

    const fenceMatch = str.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
    if (fenceMatch) {
        try {
            return JSON.parse(fenceMatch[1]);
        } catch { /* fall through */ }
    }

    throw new Error(`Could not parse AI response as JSON: ${str.slice(0, 200)}`);
}

function create_folders(folders) {
    for (const folder of folders) {
        const fullPath = path.resolve(folder);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
    }
}

function create_files(files) {
    for (const file of files) {
        const fullPath = path.resolve(file);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        if (!fs.existsSync(fullPath)) {
            fs.writeFileSync(fullPath, '', 'utf8');
        }
    }
}

function add_lines(lines, lineNo, content) {
    const idx = Math.max(0, lineNo - 1);
    while (lines.length < idx) lines.push('');
    lines.splice(idx, 0, content);
}


function delete_line(lines, lineNo) {
    const idx = lineNo - 1;
    if (idx >= 0 && idx < lines.length) {
        lines.splice(idx, 1);
    }
}

function modify_line(lines, lineNo, content) {
    const idx = lineNo - 1;
    while (lines.length <= idx) lines.push('');
    lines[idx] = content;
}

function fileToLinesArray(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return content.split(/\r?\n/);
    } catch {
        return [];
    }
}

function writeLinesToFile(filePath, linesArray) {
    fs.writeFileSync(filePath, linesArray.join('\n'), 'utf8');
}

export {
    isValidJSON,
    json_decoder,
    create_folders,
    create_files,
    read_directory_structure,
    add_lines,
    delete_line,
    modify_line,
    fileToLinesArray,
    writeLinesToFile,
};