# CodeGenX

A lightweight AI CLI code‑generation tool. It reads your project files and responds to natural-language prompts by creating or editing code.

## Features

- Uses open-source models through an MCP server to understand repository context
- Handles file operations (create, modify, delete) based on AI-generated plans
- Includes utilities for JSON validation and folder management

## Getting Started

1. Clone the repo:
```bash
git clone https://github.com/imnick48/CodeGenX
cd CodeGenX
```
2. Install dependencies:
```bash
npm install
``` 
3. Run the main script or integrate it into your editor of choice.

## Development

Source lives under `/src`. Core logic is in `codegenTool.js`; helper functions are in `utills.js`. Feel free to extend and customize prompts.

