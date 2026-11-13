// Desktop shell for Tadbeer: serves the built app from a fixed localhost port (Google sign-in needs a fixed https/localhost origin).
const { app, BrowserWindow, shell } = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = 47813;
const ROOT = path.join(__dirname, '..', 'dist');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ttf': 'font/ttf', '.wasm': 'application/wasm', '.webmanifest': 'application/manifest+json' };

// Google rejects sign-in from user agents that say "Electron", so present as plain Chrome.
app.userAgentFallback = app.userAgentFallback.replace(/\s*(Electron|Tadbeer|tadbeer)\/\S+/g, '');

function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const p = path.normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
      const f = path.join(ROOT, p === path.sep || p === '.' ? 'index.html' : p);
      if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
      fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] ?? 'application/octet-stream' }); res.end(d); });
    });
    srv.on('error', () => srv.listen(0, '127.0.0.1', () => resolve(srv.address().port))); // shortcut: port taken, Google sign-in then fails until the other app closes
    srv.listen(PORT, '127.0.0.1', () => resolve(PORT));
  });
}

app.whenReady().then(async () => {
  const port = await serve();
  const win = new BrowserWindow({ width: 1280, height: 860, minWidth: 380, minHeight: 600, title: 'Tadbeer', backgroundColor: '#f6f5f0', autoHideMenuBar: true });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\/(accounts\.google\.com|[a-z0-9-]+\.firebaseapp\.com)\//.test(url)) return { action: 'allow' }; // Firebase sign-in popup (starts on firebaseapp.com, then Google)
    void shell.openExternal(url); return { action: 'deny' };
  });
  await win.loadURL(`http://localhost:${port}/`);
});
app.on('window-all-closed', () => app.quit());
