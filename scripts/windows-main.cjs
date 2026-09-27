const { app, BrowserWindow, protocol, net } = require('electron');
const { resolve, sep } = require('node:path');
const { pathToFileURL } = require('node:url');

protocol.registerSchemesAsPrivileged([{ scheme: 'bioso', privileges: {
  standard: true, secure: true, supportFetchAPI: true, stream: true,
} }]);
app.setName('BIOSO');
const locked = app.requestSingleInstanceLock();
let window;
if (!locked) app.quit();
else {
  app.on('second-instance', () => { if (window) { window.restore(); window.focus(); } });
  app.whenReady().then(() => {
    const gameRoot = resolve(__dirname, 'game');
    protocol.handle('bioso', request => {
      const url = new URL(request.url);
      const path = resolve(gameRoot, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
      if (url.hostname !== 'game' || !path.startsWith(gameRoot + sep)) return new Response('Forbidden', { status: 403 });
      return net.fetch(pathToFileURL(path).href);
    });
    window = new BrowserWindow({ width: 1280, height: 900, minWidth: 390, minHeight: 640,
      title: 'BIOSO', backgroundColor: '#101412', autoHideMenuBar: true,
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true },
    });
    window.removeMenu();
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event, url) => {
      if (!url.startsWith('bioso://game/')) event.preventDefault();
    });
    window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    window.webContents.on('before-input-event', (_event, input) => {
      if (input.type === 'keyDown' && input.key === 'F11') window.setFullScreen(!window.isFullScreen());
    });
    window.loadURL('bioso://game/index.html');
  });
  app.on('window-all-closed', () => app.quit());
}
