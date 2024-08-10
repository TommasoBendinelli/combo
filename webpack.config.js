const path = require('path');

module.exports = {
    mode: 'production',
    target: 'node',
    entry: './src/extension.ts', // Modifica questo percorso in base al tuo file di ingresso
    output: {
        path: path.resolve(__dirname, 'out'),
        filename: 'extension.js',
        libraryTarget: 'commonjs2',
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    externals: {
        vscode: 'commonjs vscode'
    },
    devtool: 'source-map'
};
