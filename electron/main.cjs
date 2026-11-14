// Desktop shell for Tadbeer: serves the built app from a fixed localhost port (Google sign-in needs a fixed https/localhost origin).
const { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, shell } = require('electron');
const os = require('node:os');
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

let main = null, widget = null, tray = null, port = 0;
const stateFile = () => path.join(app.getPath('userData'), 'widget.json');
const readState = () => { try { return JSON.parse(fs.readFileSync(stateFile(), 'utf8')); } catch { return {}; } };
const writeState = (patch) => { try { fs.writeFileSync(stateFile(), JSON.stringify({ ...readState(), ...patch })); } catch { /* best effort */ } };

const external = ({ url }) => {
  if (/^https:\/\/(accounts\.google\.com|[a-z0-9-]+\.firebaseapp\.com)\//.test(url)) return { action: 'allow' }; // Firebase sign-in popup (starts on firebaseapp.com, then Google)
  void shell.openExternal(url); return { action: 'deny' };
};

function openMain() {
  if (main && !main.isDestroyed()) { if (main.isMinimized()) main.restore(); main.show(); main.focus(); return; }
  main = new BrowserWindow({ width: 1280, height: 860, minWidth: 380, minHeight: 600, title: 'Tadbeer', backgroundColor: '#f6f5f0', autoHideMenuBar: true });
  main.webContents.setWindowOpenHandler(external);
  void main.loadURL(`http://localhost:${port}/`);
}

// Widget: small frameless window using the OS's own glass (macOS vibrancy, Windows 11 acrylic); an opaque panel where the OS has none.
function openWidget() {
  if (widget && !widget.isDestroyed()) { widget.show(); return; }
  const win11 = process.platform === 'win32' && +os.release().split('.')[2] >= 22000;
  const glass = process.platform === 'darwin' || win11;
  const b = readState().bounds ?? {};
  widget = new BrowserWindow({
    width: 320, height: 380, ...b, resizable: true, minWidth: 260, minHeight: 280, frame: false, skipTaskbar: true, title: 'Tadbeer widget',
    ...(process.platform === 'darwin' ? { vibrancy: 'under-window', visualEffectState: 'active', transparent: true, backgroundColor: '#00000000' }
      : win11 ? { backgroundMaterial: 'acrylic', backgroundColor: '#00000000' } : { backgroundColor: '#f6f5f0' }),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true },
  });
  widget.webContents.setWindowOpenHandler(external);
  const save = () => { if (!widget.isDestroyed()) writeState({ bounds: widget.getBounds() }); };
  widget.on('moved', save); widget.on('resized', save);
  widget.on('closed', () => { widget = null; });
  void widget.loadURL(`http://localhost:${port}/#/widget${glass ? '' : '?solid'}`);
  writeState({ open: true });
}
const closeWidget = () => { writeState({ open: false }); if (widget && !widget.isDestroyed()) widget.close(); };
const toggleWidget = () => (widget && !widget.isDestroyed() ? closeWidget() : openWidget());

app.whenReady().then(async () => {
  port = await serve();
  ipcMain.on('open-app', openMain); ipcMain.on('close-widget', closeWidget);
  // Tray (Windows/Linux) or menu-bar icon (macOS) keeps the widget reachable when the main window is closed.
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, '..', 'build', 'icon.png')).resize({ width: 18, height: 18 }));
  tray.setToolTip('Tadbeer');
  tray.setContextMenu(Menu.buildFromTemplate([{ label: 'Open Tadbeer', click: openMain }, { label: 'Show / hide widget', click: toggleWidget }, { type: 'separator' }, { role: 'quit' }]));
  tray.on('click', toggleWidget);
  openMain();
  if (readState().open !== false) openWidget(); // widget is on by default and remembers being closed
});
app.on('activate', openMain); // macOS dock click
// Stay alive while the widget is open; quit when nothing is left.
app.on('window-all-closed', () => { if (process.platform !== 'darwin' || !tray) app.quit(); });
