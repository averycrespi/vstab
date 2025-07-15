import { app, BrowserWindow, screen } from 'electron';
import * as path from 'path';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { discoverVSCodeWindows } from './windows';
import { setupIPCHandlers } from './ipc';
import { debugLog, setDebugMode } from '@shared/debug';
import { initializeSettings } from './settings';

let mainWindow: BrowserWindow | null = null;
let pollInterval: ReturnType<typeof setInterval> | null = null;

const TAB_BAR_HEIGHT = 35;

async function createWindow() {
  debugLog('Creating main window');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;
  debugLog('Screen dimensions:', { width, height: TAB_BAR_HEIGHT });

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

  const htmlPath = path.join(__dirname, 'index.html');
  debugLog('Loading HTML file:', htmlPath);
  mainWindow.loadFile(htmlPath);

  if (process.env.NODE_ENV === 'development') {
    debugLog('Opening dev tools in development mode');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Start polling for VS Code windows
  debugLog('Starting window polling');
  startWindowPolling();
  
  // Set up IPC handlers
  debugLog('Setting up IPC handlers');
  setupIPCHandlers(mainWindow);
}

function startWindowPolling() {
  const pollWindows = async () => {
    if (!mainWindow) {
      debugLog('Main window not available, skipping poll');
      return;
    }
    
    try {
      debugLog('Polling for VS Code windows');
      const windows = await discoverVSCodeWindows();
      debugLog('Sending windows to renderer:', windows.length, 'windows');
      mainWindow.webContents.send(IPC_CHANNELS.VSCODE_WINDOWS_LIST, windows);
    } catch (error) {
      debugLog('Error discovering windows:', error);
      console.error('Error discovering windows:', error);
    }
  };

  // Poll immediately
  debugLog('Starting initial window poll');
  pollWindows();
  
  // Then poll every 1 second
  debugLog('Setting up window polling interval (1000ms)');
  pollInterval = setInterval(pollWindows, 1000);
}

app.whenReady().then(async () => {
  // Initialize settings and set debug mode
  const settings = await initializeSettings();
  setDebugMode(settings.debugLogging || process.env.NODE_ENV === 'development');
  
  if (settings.debugLogging) {
    debugLog('Debug mode enabled from settings');
  } else if (process.env.NODE_ENV === 'development') {
    debugLog('Debug mode enabled for development');
  }
  
  debugLog('App ready, creating window');
  createWindow();
});

app.on('window-all-closed', () => {
  debugLog('All windows closed');
  if (pollInterval) {
    debugLog('Clearing polling interval');
    clearInterval(pollInterval);
  }
  if (process.platform !== 'darwin') {
    debugLog('Quitting app (non-macOS)');
    app.quit();
  }
});

app.on('activate', () => {
  debugLog('App activated');
  if (mainWindow === null) {
    debugLog('No main window, creating new one');
    createWindow();
  }
});

// Prevent app from showing in dock
debugLog('Hiding app from dock');
app.dock?.hide();