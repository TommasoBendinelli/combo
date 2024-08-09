import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('concatenateFiles.concatenate', async (uri: vscode.Uri, uris: vscode.Uri[]) => {
        if (!uris || uris.length === 0) {
            vscode.window.showErrorMessage('Seleziona una o più cartelle o file prima di utilizzare questa estensione.');
            return;
        }

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('Apri una cartella prima di utilizzare questa estensione.');
            return;
        }

        const outputFilePath = path.join(workspaceFolder.uri.fsPath, 'concatenated.txt');
        const outputStream = fs.createWriteStream(outputFilePath, { flags: 'w' });

        for (const itemUri of uris) {
            if (fs.statSync(itemUri.fsPath).isDirectory()) {
                concatenateDirectory(itemUri.fsPath, outputStream, workspaceFolder.uri.fsPath);
            } else {
                concatenateFile(itemUri.fsPath, outputStream, workspaceFolder.uri.fsPath);
            }
        }

        outputStream.end();
        vscode.window.showInformationMessage(`File concatenato creato: ${outputFilePath}`);
    });

    context.subscriptions.push(disposable);
}

function concatenateDirectory(directoryPath: string, outputStream: fs.WriteStream, rootPath: string) {
    const files = fs.readdirSync(directoryPath);
    for (const file of files) {
        const filePath = path.join(directoryPath, file);
        if (fs.statSync(filePath).isDirectory()) {
            concatenateDirectory(filePath, outputStream, rootPath);
        } else {
            concatenateFile(filePath, outputStream, rootPath);
        }
    }
}

function concatenateFile(filePath: string, outputStream: fs.WriteStream, rootPath: string) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(rootPath, filePath);
    outputStream.write(`\n\n==== ${relativePath} ====\n\n`);
    outputStream.write(fileContent);
}

export function deactivate() {}
