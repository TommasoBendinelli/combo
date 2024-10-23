# Combo - Concatenate Files

## Description
Combo is a Visual Studio Code extension that allows you to concatenate multiple files into a single text file. It now supports handling image files and saves the concatenated output as a temporary file for easy viewing.

## Features
- Concatenate multiple files and folders into a single text file
- Automatically handles image files by including their names without content
- Saves the concatenated output as a temporary file
- Opens the concatenated file in VS Code for immediate viewing
- Copy concatenated content to clipboard
- Copy folder structure of selected directories

## Usage
1. Select the files or folders you want to concatenate in the VS Code file explorer.
2. Right-click and choose one of the following options from the context menu:
   - "Concatenate Files": Creates a temporary file with concatenated content
   - "Copy Concatenated Files": Copies the concatenated content to clipboard
   - "Copy Folder Structure": Copies the folder structure of selected directories
3. For "Concatenate Files", the extension will create a temporary file and open it in VS Code.

## Installation
1. Install the extension from the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/).
2. Alternatively, download the `.vsix` file and install it manually in VS Code:
   - Go to Extensions view (Ctrl+Shift+X)
   - Click on the "..." menu at the top of the Extensions view
   - Choose "Install from VSIX..."
   - Select the downloaded .vsix file

## Configuration
No additional configuration is required. The extension works out of the box.

## Known Issues
- Large files or a large number of files may take some time to process.

## Contributions
Contributions are welcome! If you'd like to contribute to the development of this extension:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Submit a pull request

## License
This extension is released under the MIT license.

## Support
If you encounter any issues or have suggestions for improvements, please open an issue on the GitHub repository.

![Combo Logo](combo.png)
