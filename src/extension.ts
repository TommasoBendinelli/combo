import { commands, ExtensionContext, Uri, window, workspace, env, Progress, ProgressLocation } from 'vscode';
import { createWriteStream, readdirSync, readFileSync, statSync, WriteStream } from 'fs';
import { join, relative, extname } from 'path';
import * as os from 'os';

export function activate(context: ExtensionContext) {
    let disposable = commands.registerCommand('concatenateFiles.concatenate', async (uri: Uri, uris: Uri[]) => {
        if (!uris || uris.length === 0) {
            window.showErrorMessage('Seleziona una o più cartelle o file prima di utilizzare questa funzione.');
            return;
        }

        const workspaceFolder = workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            window.showErrorMessage('Apri una cartella prima di utilizzare questa funzione.');
            return;
        }

        const tempDir = os.tmpdir();
        const tempFilePath = join(tempDir, 'concatenated.txt');
        const writeStream = createWriteStream(tempFilePath);

        let errorCount = 0;

        await window.withProgress({
            location: ProgressLocation.Notification,
            title: "Concatenating files...",
            cancellable: false
        }, async (progress: Progress<{ increment: number }>) => {
            // First, count total files
            let totalFiles = await countTotalFiles(uris);

            let processedFiles = 0;

            for (const itemUri of uris) {
                try {
                    if (statSync(itemUri.fsPath).isDirectory()) {
                        processedFiles = await concatenateDirectory(itemUri.fsPath, workspaceFolder.uri.fsPath, writeStream, progress, totalFiles, processedFiles);
                    } else {
                        await concatenateFile(itemUri.fsPath, workspaceFolder.uri.fsPath, writeStream);
                        processedFiles++;
                        progress.report({ increment: (processedFiles / totalFiles) * 100 });
                    }
                } catch (error) {
                    console.error(`Error processing ${itemUri.fsPath}: ${error}`);
                    window.showErrorMessage(`Failed to process: ${itemUri.fsPath}`);
                    errorCount++;
                }
            }
        });

        writeStream.end();

        if (errorCount > 0) {
            window.showWarningMessage(`Concatenation completed with ${errorCount} errors. Check the output for details.`);
        } else {
            window.showInformationMessage(`File concatenato salvato come: ${tempFilePath}`);
        }
        
        // Open the temporary file
        const doc = await workspace.openTextDocument(tempFilePath);
        await window.showTextDocument(doc);
    });

    let copyDisposable = commands.registerCommand('concatenateFiles.copy', async (uri: Uri, uris: Uri[]) => {
        if (!uris || uris.length === 0) {
            window.showErrorMessage('Seleziona una o più cartelle o file prima di utilizzare questa funzione.');
            return;
        }

        const workspaceFolder = workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            window.showErrorMessage('Apri una cartella prima di utilizzare questa funzione.');
            return;
        }

        let concatenatedContent = '';

        for (const itemUri of uris) {
            if (statSync(itemUri.fsPath).isDirectory()) {
                concatenatedContent += concatenateDirectoryContent(itemUri.fsPath, workspaceFolder.uri.fsPath);
            } else {
                concatenatedContent += concatenateFileContent(itemUri.fsPath, workspaceFolder.uri.fsPath);
            }
        }

        await env.clipboard.writeText(concatenatedContent);
        window.showInformationMessage('Contenuto concatenato copiato negli appunti.');
    });

    let copyStructureDisposable = commands.registerCommand('concatenateFiles.copyStructure', async (uri: Uri, uris: Uri[]) => {
        if (!uris || uris.length === 0) {
            window.showErrorMessage('Seleziona una o più cartelle prima di utilizzare questa funzione.');
            return;
        }

        const workspaceFolder = workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            window.showErrorMessage('Apri una cartella prima di utilizzare questa funzione.');
            return;
        }

        let structureContent = '';

        for (const itemUri of uris) {
            if (statSync(itemUri.fsPath).isDirectory()) {
                structureContent += getDirectoryStructure(itemUri.fsPath, workspaceFolder.uri.fsPath);
            } else {
                structureContent += relative(workspaceFolder.uri.fsPath, itemUri.fsPath) + '\n';
            }
        }

        await env.clipboard.writeText(structureContent);
        window.showInformationMessage('Struttura delle cartelle copiata negli appunti.');
    });

    context.subscriptions.push(disposable, copyDisposable, copyStructureDisposable);
}

async function countTotalFiles(uris: Uri[]): Promise<number> {
    let count = 0;
    for (const uri of uris) {
        if (statSync(uri.fsPath).isDirectory()) {
            count += await countFiles(uri.fsPath);
        } else {
            count++;
        }
    }
    return count;
}

async function countFiles(directoryPath: string): Promise<number> {
    let count = 0;
    const files = readdirSync(directoryPath);
    for (const file of files) {
        const filePath = join(directoryPath, file);
        if (statSync(filePath).isDirectory()) {
            count += await countFiles(filePath);
        } else {
            count++;
        }
    }
    return count;
}

async function concatenateDirectory(directoryPath: string, rootPath: string, writeStream: WriteStream, progress: Progress<{ increment: number }>, totalFiles: number, processedFiles: number): Promise<number> {
    const files = readdirSync(directoryPath);
    for (const file of files) {
        const filePath = join(directoryPath, file);
        if (statSync(filePath).isDirectory()) {
            processedFiles = await concatenateDirectory(filePath, rootPath, writeStream, progress, totalFiles, processedFiles);
        } else {
            await concatenateFile(filePath, rootPath, writeStream);
            processedFiles++;
            progress.report({ increment: (processedFiles / totalFiles) * 100 });
        }
    }
    return processedFiles;
}

async function concatenateFile(filePath: string, rootPath: string, writeStream: WriteStream): Promise<void> {
    const relativePath = relative(rootPath, filePath);
    const fileExtension = extname(filePath).toLowerCase();
    
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    
    if (imageExtensions.includes(fileExtension)) {
        writeStream.write(`\n\n==== ${relativePath} (Image File) ====\n\n`);
    } else {
        try {
            const fileContent = readFileSync(filePath, 'utf-8');
            writeStream.write(`\n\n==== ${relativePath} ====\n\n${fileContent}`);
        } catch (error) {
            console.error(`Error reading file ${filePath}: ${error}`);
            throw error; // Re-throw the error to be caught in the main function
        }
    }
}

function concatenateDirectoryContent(directoryPath: string, rootPath: string): string {
    let content = '';
    const files = readdirSync(directoryPath);
    for (const file of files) {
        const filePath = join(directoryPath, file);
        if (statSync(filePath).isDirectory()) {
            content += concatenateDirectoryContent(filePath, rootPath);
        } else {
            content += concatenateFileContent(filePath, rootPath);
        }
    }
    return content;
}

function concatenateFileContent(filePath: string, rootPath: string): string {
    const fileContent = readFileSync(filePath, 'utf-8');
    const relativePath = relative(rootPath, filePath);
    return `\n\n==== ${relativePath} ====\n\n${fileContent}`;
}

function getDirectoryStructure(directoryPath: string, rootPath: string, indent: string = ''): string {
    let structure = '';
    const files = readdirSync(directoryPath);
    for (const file of files) {
        const filePath = join(directoryPath, file);
        const relativePath = relative(rootPath, filePath);
        structure += `${indent}${relativePath}\n`;
        if (statSync(filePath).isDirectory()) {
            structure += getDirectoryStructure(filePath, rootPath, indent + '  ');
        }
    }
    return structure;
}

export function deactivate() {}
