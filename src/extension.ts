import { commands, ExtensionContext, Uri, window, workspace, env, Progress, ProgressLocation } from 'vscode';
import { createWriteStream, readdirSync, readFileSync, statSync, WriteStream } from 'fs';
import { join, relative, extname } from 'path';
import * as os from 'os';

const config = workspace.getConfiguration("comboConcatenateFiles");
const ignoreExtensions = config.get<string[]>("ignoreExtensions") || [];

function shouldNotDisplayFile(filePath: string, ignoreList: string[]): boolean {
    const ext = extname(filePath).toLowerCase();
    return ignoreList.map(e => e.toLowerCase()).includes(ext);
}

export function activate(context: ExtensionContext) {
    let disposable = commands.registerCommand('concatenateFiles.concatenate', async (uri: Uri, uris: Uri[]) => {
        if (!uris || uris.length === 0) {
            window.showErrorMessage('Select one or more folders or files before using this function.');
            return;
        }

        const workspaceFolder = workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            window.showErrorMessage('Open a folder before using this function.');
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
            let totalFiles = await countTotalFiles(uris);

            let processedFiles = 0;

            for (const itemUri of uris) {
                try {
                    if (statSync(itemUri.fsPath).isDirectory()) {
                        // Pass ignoreExtensions to handle skipping
                        processedFiles = await concatenateDirectory(
                            itemUri.fsPath,
                            workspaceFolder.uri.fsPath,
                            writeStream,
                            progress,
                            totalFiles,
                            processedFiles,
                        );
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
            window.showInformationMessage(`Concatenated file saved as: ${tempFilePath}`);
        }
        
        // Open the temporary file
        const doc = await workspace.openTextDocument(tempFilePath);
        await window.showTextDocument(doc);
    });

    let copyDisposable = commands.registerCommand('concatenateFiles.copy', async (uri: Uri, uris: Uri[]) => {
        if (!uris || uris.length === 0) {
            window.showErrorMessage('Select one or more folders or files before using this function.');
            return;
        }

        const workspaceFolder = workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            window.showErrorMessage('Open a folder before using this function.');
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
        window.showInformationMessage('Concatenated content copied to clipboard.');
    });

    let copyStructureDisposable = commands.registerCommand('concatenateFiles.copyStructure', async (uri: Uri, uris: Uri[]) => {
        if (!uris || uris.length === 0) {
            window.showErrorMessage('Select one or more folders before using this function.');
            return;
        }

        const workspaceFolder = workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            window.showErrorMessage('Open a folder before using this function.');
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
        window.showInformationMessage('Folder structure copied to clipboard.');
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
        
    // e.g. countFiles, concatenateDirectory, etc...
    if (shouldNotDisplayFile(filePath, ignoreExtensions)) {
        writeStream.write(`\n\n==== ${relativePath} (Not shown) === \n\n`);
    }
    else {
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
            if (shouldNotDisplayFile(filePath, ignoreExtensions)) {
                const relativePath = relative(rootPath, filePath);
                content += `\n\n==== ${relativePath} (Not shown) ====\n\n`;
            } else {
                content += concatenateFileContent(filePath, rootPath);
            }
        }
    }
    return content;
}


function concatenateFileContent(filePath: string, rootPath: string): string {
    const relativePath = relative(rootPath, filePath);

    if (shouldNotDisplayFile(filePath, ignoreExtensions)) {
        // If the extension is in the ignore list,
        // show the placeholder and do NOT concatenate its content
        return `\n\n==== ${relativePath} (Not shown) === \n\n`;
    } else {
        // Otherwise read it as normal
        const fileContent = readFileSync(filePath, 'utf-8');
        return `\n\n==== ${relativePath} ====\n\n${fileContent}`;
    }
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