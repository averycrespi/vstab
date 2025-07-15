import { app, BrowserWindow, screen, Tray, Menu, shell } from 'electron';
import * as path from 'path';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { discoverVSCodeWindows } from './windows';
import { setupIPCHandlers } from './ipc';
import { debugLog, setDebugMode } from '@shared/debug';
import { initializeSettings, loadSettings, saveSettings } from './settings';

let mainWindow: BrowserWindow | null = null;
let pollInterval: ReturnType<typeof setInterval> | null = null;
let tray: Tray | null = null;

const TAB_BAR_HEIGHT = 35;

// Helper functions for tray menu
async function getYabaiStatus(): Promise<boolean> {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  try {
    await execAsync('which yabai');
    return true;
  } catch {
    return false;
  }
}

function getAppVersion(): string {
  const packageJson = require('../../package.json');
  return packageJson.version || '1.0.0';
}

async function createTrayIcon() {
  const settings = await loadSettings();

  if (!settings.showTrayIcon) {
    debugLog('Tray icon disabled in settings');
    return;
  }

  debugLog('Creating tray icon');

  // Create tray icon path - use proper vstab icon
  const trayIconPath = path.join(process.cwd(), 'assets', 'tray-icon.png');

  try {
    tray = new Tray(trayIconPath);
    debugLog('Tray icon created successfully');

    // Update tray menu
    await updateTrayMenu();

    // Set tooltip
    tray.setToolTip('vstab - VS Code Tab Switcher');

    // Handle tray click - always show context menu
    tray.on('click', () => {
      debugLog('Tray icon clicked - showing context menu');
      tray?.popUpContextMenu();
    });
  } catch (error) {
    debugLog('Error creating tray icon:', error);
    console.error('Error creating tray icon:', error);
  }
}

// Toggle functions for boolean settings
async function toggleAutoHide() {
  debugLog('Toggling auto hide setting');
  const settings = await loadSettings();
  const newSettings = { ...settings, autoHide: !settings.autoHide };
  await saveSettings(newSettings);
  await updateTrayMenu();
  debugLog('Auto hide toggled to:', newSettings.autoHide);
}

async function toggleAutoResizeVertical() {
  debugLog('Toggling auto resize vertical setting');
  const settings = await loadSettings();
  const newSettings = {
    ...settings,
    autoResizeVertical: !settings.autoResizeVertical,
  };
  await saveSettings(newSettings);
  await updateTrayMenu();
  debugLog('Auto resize vertical toggled to:', newSettings.autoResizeVertical);
}

async function toggleAutoResizeHorizontal() {
  debugLog('Toggling auto resize horizontal setting');
  const settings = await loadSettings();
  const newSettings = {
    ...settings,
    autoResizeHorizontal: !settings.autoResizeHorizontal,
  };
  await saveSettings(newSettings);
  await updateTrayMenu();
  debugLog(
    'Auto resize horizontal toggled to:',
    newSettings.autoResizeHorizontal
  );
}

async function toggleDebugLogging() {
  debugLog('Toggling debug logging setting');
  const settings = await loadSettings();
  const newSettings = { ...settings, debugLogging: !settings.debugLogging };
  await saveSettings(newSettings);
  // Update global debug mode
  setDebugMode(newSettings.debugLogging);
  await updateTrayMenu();
  debugLog('Debug logging toggled to:', newSettings.debugLogging);
}

async function updateTrayMenu() {
  if (!tray) return;

  debugLog('Updating tray menu');

  const yabaiRunning = await getYabaiStatus();
  const appVersion = getAppVersion();
  const settings = await loadSettings();

  const menuTemplate = [
    {
      label: `vstab v${appVersion}`,
      click: () => {
        debugLog('Opening GitHub repository');
        shell.openExternal('https://github.com/averycrespi/vstab');
      },
    },
    {
      label: `yabai: ${yabaiRunning ? '✅ Running' : '❌ Not Available'}`,
      click: () => {
        // Do nothing, but keep it clickable so text isn't faded
      },
    },
    { type: 'separator' },
    {
      label: 'Settings',
      submenu: [
        {
          label: `Theme: ${settings.theme}`,
          click: () => {
            // TODO: Open settings or cycle theme
            debugLog('Theme setting clicked');
          },
        },
        {
          label: `Tab Bar Height: ${settings.tabBarHeight}px`,
          click: () => {
            // TODO: Open settings
            debugLog('Tab bar height setting clicked');
          },
        },
        { type: 'separator' },
        {
          label: 'Auto Hide',
          type: 'checkbox',
          checked: settings.autoHide,
          click: toggleAutoHide,
        },
        {
          label: 'Auto Resize Vertical',
          type: 'checkbox',
          checked: settings.autoResizeVertical,
          click: toggleAutoResizeVertical,
        },
        {
          label: 'Auto Resize Horizontal',
          type: 'checkbox',
          checked: settings.autoResizeHorizontal,
          click: toggleAutoResizeHorizontal,
        },
        {
          label: 'Debug Logging',
          type: 'checkbox',
          checked: settings.debugLogging,
          click: toggleDebugLogging,
        },
      ],
    },
    { type: 'separator' },
    {
      label: 'Quit vstab',
      click: () => {
        debugLog('Quit clicked from tray menu');
        app.quit();
      },
    },
  ];

  const contextMenu = Menu.buildFromTemplate(menuTemplate as any);
  tray.setContextMenu(contextMenu);

  debugLog('Tray menu updated successfully');
}

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
      preload: path.join(__dirname, 'preload.js'),
    },
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

      // Update tray menu with current status
      if (tray) {
        await updateTrayMenu();
      }
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

  debugLog('Creating tray icon');
  createTrayIcon();

  // Listen for tray menu update requests
  (process as any).on('tray-update-menu', async () => {
    debugLog('Received tray menu update event');
    if (tray) {
      await updateTrayMenu();
    }
  });

  // Listen for tray settings changes
  (process as any).on('tray-settings-changed', async (settings: any) => {
    debugLog('Received tray settings changed event:', settings);
    if (settings.showTrayIcon && !tray) {
      // Create tray icon if it doesn't exist
      await createTrayIcon();
    } else if (!settings.showTrayIcon && tray) {
      // Destroy tray icon if it exists
      debugLog('Destroying tray icon due to settings change');
      tray.destroy();
      tray = null;
    } else if (tray) {
      // Update existing tray menu
      await updateTrayMenu();
    }
  });
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

app.on('before-quit', () => {
  debugLog('App about to quit, cleaning up tray');
  if (tray) {
    tray.destroy();
    tray = null;
  }
});

// Prevent app from showing in dock
debugLog('Hiding app from dock');
app.dock?.hide();
