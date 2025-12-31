const HtmlWebpackPlugin = require("html-webpack-plugin")
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin")
const path = require("path")
const fs = require("fs")

module.exports = [
    {
        mode: "production",
        entry: {
            background: "./src/extension/background.ts",
        },
        target: "webworker",
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: "ts-loader",
                    exclude: /node_modules/,
                },
            ],
        },
        resolve: {
            extensions: [".ts", ".js"],
        },
        output: {
            filename: "[name].js",
            path: path.resolve(__dirname, "dist/extension"),
        },
        plugins: [
            new NodePolyfillPlugin(),
        ]
    },
    {
        mode: "production",
        entry: "./src/index.tsx",
        target: "web",
        devtool: "source-map",
        module: {
            rules: [
                {
                    test: /\.ts(x?)$/,
                    include: /src/,
                    resolve: {
                        extensions: [".ts", ".tsx", ".js"],
                    },
                    use: [{ loader: "ts-loader" }],
                },
            ],
        },
        resolve: {
            extensions: [".ts", ".tsx", ".js"],
            alias: {
                electron: false
            }
        },
        output: {
            path: path.resolve(__dirname, "dist/extension"),
            filename: "index.js",
        },
        plugins: [
            new NodePolyfillPlugin(),
            new HtmlWebpackPlugin({
                template: "./src/index.html",
                filename: "index.html",
            }),
            {
                apply: (compiler) => {
                    compiler.hooks.afterEmit.tap('CopyManifest', (compilation) => {
                        const fs = require('fs');
                        const path = require('path');

                        // Copy Manifest
                        const srcManifest = path.resolve(__dirname, 'src/manifest.json');
                        const destManifest = path.resolve(__dirname, 'dist/extension/manifest.json');
                        fs.copyFileSync(srcManifest, destManifest);

                        // Copy Icons
                        const iconDirSource = path.resolve(__dirname, 'build/icons');
                        const iconDirDest = path.resolve(__dirname, 'dist/extension/assets/icons');

                        if (!fs.existsSync(iconDirDest)) {
                            fs.mkdirSync(iconDirDest, { recursive: true });
                        }

                        const icons = [
                            { src: '16x16.png', dest: '16.png' },
                            { src: '48x48.png', dest: '48.png' },
                            { src: '128x128.png', dest: '128.png' }
                        ];

                        icons.forEach(icon => {
                            const srcPath = path.join(iconDirSource, icon.src);
                            const destPath = path.join(iconDirDest, icon.dest);
                            if (fs.existsSync(srcPath)) {
                                fs.copyFileSync(srcPath, destPath);
                            }
                        });

                        // Copy CSS
                        const cssSrc = path.resolve(__dirname, 'dist/index.css');
                        const cssDest = path.resolve(__dirname, 'dist/extension/index.css');
                        if (fs.existsSync(cssSrc)) {
                            fs.copyFileSync(cssSrc, cssDest);
                        }

                        const stylesSrc = path.resolve(__dirname, 'dist/styles');
                        const stylesDest = path.resolve(__dirname, 'dist/extension/styles');
                        if (fs.existsSync(stylesSrc)) {
                            if (!fs.existsSync(stylesDest)) {
                                fs.mkdirSync(stylesDest, { recursive: true });
                            }
                            fs.readdirSync(stylesSrc).forEach(file => {
                                const srcFile = path.join(stylesSrc, file);
                                const destFile = path.join(stylesDest, file);
                                fs.copyFileSync(srcFile, destFile);
                            });
                        }

                        // Copy Fonts directory (since index.css might reference them)
                        // It seems fonts are in dist/icons based on previous `find` results
                        const fontsSrc = path.resolve(__dirname, 'dist/icons');
                        const fontsDest = path.resolve(__dirname, 'dist/extension/icons');

                        if (fs.existsSync(fontsSrc)) {
                            if (!fs.existsSync(fontsDest)) {
                                fs.mkdirSync(fontsDest, { recursive: true });
                            }
                            fs.readdirSync(fontsSrc).forEach(file => {
                                const srcFile = path.join(fontsSrc, file);
                                const destFile = path.join(fontsDest, file);
                                fs.copyFileSync(srcFile, destFile);
                            });
                        }

                        // Copy Article directory
                        const articleSrc = path.resolve(__dirname, 'dist/article');
                        const articleDest = path.resolve(__dirname, 'dist/extension/article');
                        if (fs.existsSync(articleSrc)) {
                            if (!fs.existsSync(articleDest)) {
                                fs.mkdirSync(articleDest, { recursive: true });
                            }
                            fs.readdirSync(articleSrc).forEach(file => {
                                const srcFile = path.join(articleSrc, file);
                                const destFile = path.join(articleDest, file);
                                fs.copyFileSync(srcFile, destFile);
                            });
                        }

                        // Copy Custom Extension Article Files (overwrite)
                        const extArticleHtml = path.resolve(__dirname, 'src/extension/article_extension.html');
                        const extArticleJs = path.resolve(__dirname, 'src/extension/article_extension.js');

                        if (fs.existsSync(extArticleHtml)) {
                            fs.copyFileSync(extArticleHtml, path.join(articleDest, 'article.html'));
                        }
                        if (fs.existsSync(extArticleJs)) {
                            fs.copyFileSync(extArticleJs, path.join(articleDest, 'article_extension.js'));
                        }

                    });
                }
            }
        ],
    },
]
