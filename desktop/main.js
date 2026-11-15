/* main.js — MarsWalk desktop app (Electron).
   Serves the exact same web app (copied into app-src/ from ../src) from a tiny local HTTP server on
   127.0.0.1, so map data, the route Web Worker, ES-module 3D and printing all behave like the web build,
   and everything works with no network. Links to NASA/sources open in the system browser. */

const { app, BrowserWindow, shell, Menu } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const APP_DIR = path.join(__dirname, 'app-src');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.geojson': 'application/geo+json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.bin': 'application/octet-stream', '.mp4': 'video/mp4', '.srt': 'application/x-subrip'
};

/* Starts the local static server on a free port. Resolves to the base URL. */
function startServer() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (rel === '/') rel = '/index.html';
      const file = path.normalize(path.join(APP_DIR, rel));
      if (!file.startsWith(APP_DIR)) { res.writeHead(403); res.end(); return; }   // no path escapes
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}/`));
  });
}

/* Opens the main window. */
async function createWindow() {
  const base = await startServer();
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1100, minHeight: 700,
    title: 'MarsWalk — EVA Planner',
    backgroundColor: '#0F1115',
    icon: path.join(__dirname, 'app-src', 'icons', 'icon-512.png'),
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true }
  });
  // External links (sources, NASA pages) open in the user's browser, not inside the app
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(base)) { shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'allow' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(base)) { e.preventDefault(); shell.openExternal(url); }
  });
  win.loadURL(base + 'index.html');

  // Self-test (used by the build checks): MARSWALK_SNAPSHOT=<png path> plans a route, saves a window capture, quits
  if (process.env.MARSWALK_SNAPSHOT) {
    win.webContents.once('did-finish-load', async () => {
      await new Promise(r => setTimeout(r, 7000));
      const info = await win.webContents.executeJavaScript(`(async () => {
        const w = document.getElementById('welcome'); if (w) w.remove();
        selectTarget(STATE.targets[1]);
        for (let i = 0; i < 50 && STATE.route.status !== 'ok'; i++) await new Promise(r => setTimeout(r, 100));
        await new Promise(r => setTimeout(r, 1500));
        return JSON.stringify({ route: STATE.route.status, km: (STATE.route.distanceMeters / 1000).toFixed(2), rms: STATE.validation && STATE.validation.rmsAfterOffsetM.toFixed(2) });
      })()`);
      console.log('[selftest]', info);
      const img = await win.webContents.capturePage();
      fs.writeFileSync(process.env.MARSWALK_SNAPSHOT, img.toPNG());
      app.quit();
    });
  }
}

Menu.setApplicationMenu(null);
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
