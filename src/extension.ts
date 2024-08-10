import { commands, ExtensionContext, Uri, window, workspace } from 'vscode';
import { createWriteStream, readdirSync, readFileSync, statSync, WriteStream } from 'fs';
import { join, relative } from 'path';

export function activate(context: ExtensionContext) {
    let disposable = commands.registerCommand('concatenateFiles.concatenate', async (uri: Uri, uris: Uri[]) => {
        if (!uris || uris.length === 0) {
            window.showErrorMessage('Seleziona una o più cartelle o file prima di utilizzare questa estensione.');
            return;
        }

        const workspaceFolder = workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            window.showErrorMessage('Apri una cartella prima di utilizzare questa estensione.');
            return;
        }

        const outputFilePath = join(workspaceFolder.uri.fsPath, 'concatenated.txt');
        const outputStream = createWriteStream(outputFilePath, { flags: 'w' });

        for (const itemUri of uris) {
            if (statSync(itemUri.fsPath).isDirectory()) {
                concatenateDirectory(itemUri.fsPath, outputStream, workspaceFolder.uri.fsPath);
            } else {
                concatenateFile(itemUri.fsPath, outputStream, workspaceFolder.uri.fsPath);
            }
        }

        outputStream.end();
        window.showInformationMessage(`File concatenato creato: ${outputFilePath}`);
    });

    context.subscriptions.push(disposable);
}

function concatenateDirectory(directoryPath: string, outputStream: WriteStream, rootPath: string) {
    const files = readdirSync(directoryPath);
    for (const file of files) {
        const filePath = join(directoryPath, file);
        if (statSync(filePath).isDirectory()) {
            concatenateDirectory(filePath, outputStream, rootPath);
        } else {
            concatenateFile(filePath, outputStream, rootPath);
        }
    }
}

function concatenateFile(filePath: string, outputStream: WriteStream, rootPath: string) {
    const fileContent = readFileSync(filePath, 'utf-8');
    const relativePath = relative(rootPath, filePath);
    outputStream.write(`\n\n==== ${relativePath} ====\n\n`);
    outputStream.write(fileContent);
}

export function deactivate() {}
