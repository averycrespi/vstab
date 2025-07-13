import { app, BrowserWindow, screen } from 'electron';
import * as path from 'path';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { discoverVSCodeWindows } from './windows';
import { setupIPCHandlers } from './ipc';

let mainWindow: BrowserWindow | null = null;
let pollInterval: ReturnType<typeof setInterval> | null = null;

const TAB_BAR_HEIGHT = 35;

async function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width,
    height: TAB_BAR_HEIGHT,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    movable: false,
    fullscreenable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Start polling for VS Code windows
  startWindowPolling();
  
  // Set up IPC handlers
  setupIPCHandlers(mainWindow);
}

function startWindowPolling() {
  const pollWindows = async () => {
    if (!mainWindow) return;
    
    try {
      const windows = await discoverVSCodeWindows();
      mainWindow.webContents.send(IPC_CHANNELS.VSCODE_WINDOWS_LIST, windows);
    } catch (error) {
      console.error('Error discovering windows:', error);
    }
  };

  // Poll immediately
  pollWindows();
  
  // Then poll every 1 second
  pollInterval = setInterval(pollWindows, 1000);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (pollInterval) {
    clearInterval(pollInterval);
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Prevent app from showing in dock
app.dock?.hide();