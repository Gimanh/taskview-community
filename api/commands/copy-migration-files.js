const fs = require('fs');
const path = require('path');

const source = '../dist-migration';
const destination = '../postgresql/dist-migration';

const sourcePath = path.resolve(__dirname, source);
const destinationPath = path.resolve(__dirname, destination);

async function copyDirectory(source, destination) {
    if (!fs.existsSync(destination)) {
        fs.mkdirSync(destination, { recursive: true });
    }

    const files = fs.readdirSync(source);

    for (const file of files) {
        const sourcePath = path.join(source, file);
        const destPath = path.join(destination, file);

        const stat = fs.statSync(sourcePath);

        if (stat.isDirectory()) {
            await copyDirectory(sourcePath, destPath);
        } else {
            fs.copyFileSync(sourcePath, destPath);
        }
    }
}

copyDirectory(sourcePath, destinationPath);