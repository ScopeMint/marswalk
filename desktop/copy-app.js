/* copy-app.js — copies the web app (../src) into ./app-src before running or packaging the desktop app. */
const fs = require('fs');
const path = require('path');

const from = path.join(__dirname, '..', 'src');
const to = path.join(__dirname, 'app-src');
fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true });
console.log('[copy-app] copied', from, '->', to);
