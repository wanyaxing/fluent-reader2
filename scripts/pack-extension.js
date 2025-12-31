/**
 * 打包扩展为 zip 文件
 * 输出文件名格式: {name}-{version}.zip
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// 读取 manifest.json 获取扩展信息
const manifestPath = path.join(__dirname, '..', 'src', 'manifest.json');
const manifest = require(manifestPath);
const name = manifest.name.toLowerCase().replace(/\s+/g, '-'); // 转换为小写并用连字符连接
const version = manifest.version;

// 输出目录和文件名
const distDir = path.join(__dirname, '..', 'dist', 'extension');
const outputFileName = `${name}-${version}.zip`;
const outputPath = path.join(__dirname, '..', outputFileName);

// 检查 dist-extension 目录是否存在
if (!fs.existsSync(distDir)) {
    console.error('Error: dist-extension directory not found!');
    console.error('Please run "npm run build:extension" first.');
    process.exit(1);
}

// 如果旧的 zip 文件存在，删除它
if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
    console.log(`Removed existing ${outputFileName}`);
}

// 创建输出流
const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', {
    zlib: { level: 9 } // 最大压缩级别
});

// 监听事件
output.on('close', () => {
    const size = (archive.pointer() / 1024 / 1024).toFixed(2);
    console.log(`\n✅ Extension packed successfully!`);
    console.log(`   File: ${outputFileName}`);
    console.log(`   Size: ${size} MB`);
    console.log(`   Path: ${outputPath}`);
});

archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
        console.warn('Warning:', err);
    } else {
        throw err;
    }
});

archive.on('error', (err) => {
    throw err;
});

// 将输出流连接到 archive
archive.pipe(output);

// 添加 dist-extension 目录中的所有文件
archive.directory(distDir, false);

// 完成打包
archive.finalize();

console.log(`Packing extension to ${outputFileName}...`);
