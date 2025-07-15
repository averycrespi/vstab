import { app, BrowserWindow, screen, Tray, Menu, shell } from 'electron';
import * as path from 'path';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { discoverVSCodeWindows } from './windows';
import { setupIPCHandlers } from './ipc';
import { logger } from '@shared/logger';
import { initializeLogging, updateLoggingSettings } from './logger-init';
import { initializeSettings, loadSettings, saveSettings } from './settings';
import { LogLevel } from '@shared/types';

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
  logger.info('Creating tray icon', 'main');

  // Create tray icon path - use proper vstab icon
  const trayIconPath = path.join(process.cwd(), 'assets', 'tray-icon.png');

  try {
    tray = new Tray(trayIconPath);
    logger.info('Tray icon created successfully', 'main');

    // Update tray menu
    await updateTrayMenu();

    // Set tooltip
    tray.setToolTip('vstab - VS Code Tab Switcher');

    // Handle tray click - always show context menu
    tray.on('click', () => {
      logger.debug('Tray icon clicked - showing context menu', 'main');
      tray?.popUpContextMenu();
    });
  } catch (error) {
    logger.error('Error creating tray icon', 'main', error);
    console.error('Error creating tray icon:', error);
  }
}

// Toggle functions for boolean settings
async function toggleAutoHide() {
  logger.debug('Toggling auto hide setting', 'main');
  const settings = await loadSettings();
  const newSettings = { ...settings, autoHide: !settings.autoHide };
  await saveSettings(newSettings);

  // Notify renderer about settings change
  if (mainWindow) {
    mainWindow.webContents.send(IPC_CHANNELS.SETTINGS_CHANGED, newSettings);
    logger.info('Settings change notification sent to renderer', 'main');
  }

  await updateTrayMenu();
  logger.info('Auto hide toggled', 'main', { autoHide: newSettings.autoHide });
}

async function toggleAutoResizeVertical() {
  logger.debug('Toggling auto resize vertical setting', 'main');
  const settings = await loadSettings();
  const newSettings = {
    ...settings,
    autoResizeVertical: !settings.autoResizeVertical,
  };
  await saveSettings(newSettings);

  // Notify renderer about settings change
  if (mainWindow) {
    mainWindow.webContents.send(IPC_CHANNELS.SETTINGS_CHANGED, newSettings);
    logger.info('Settings change notification sent to renderer', 'main');
  }

  await updateTrayMenu();
  logger.info('Auto resize vertical toggled', 'main', {
    autoResizeVertical: newSettings.autoResizeVertical,
  });
}

async function toggleAutoResizeHorizontal() {
  logger.debug('Toggling auto resize horizontal setting', 'main');
  const settings = await loadSettings();
  const newSettings = {
    ...settings,
    autoResizeHorizontal: !settings.autoResizeHorizontal,
  };
  await saveSettings(newSettings);

  // Notify renderer about settings change
  if (mainWindow) {
    mainWindow.webContents.send(IPC_CHANNELS.SETTINGS_CHANGED, newSettings);
    logger.info('Settings change notification sent to renderer', 'main');
  }

  await updateTrayMenu();
  logger.info('Auto resize horizontal toggled', 'main', {
    autoResizeHorizontal: newSettings.autoResizeHorizontal,
  });
}

async function setLogLevel(level: LogLevel) {
  logger.debug('Setting log level', 'main', { level });
  const settings = await loadSettings();
  const newSettings = { ...settings, logLevel: level };

  await saveSettings(newSettings);
  updateLoggingSettings(newSettings);

  // Notify renderer about settings change
  if (mainWindow) {
    mainWindow.webContents.send(IPC_CHANNELS.SETTINGS_CHANGED, newSettings);
    logger.info('Settings change notification sent to renderer', 'main');
  }

  await updateTrayMenu();
  logger.info('Log level changed', 'main', {
    from: settings.logLevel,
    to: newSettings.logLevel,
  });
}

async function openLogsFolder() {
  logger.debug('Opening logs folder', 'main');
  try {
    const { getFileLogger } = await import('./file-logger');
    const fileLogger = getFileLogger();
    const logDir = await fileLogger.getLogDirectory();
    shell.openPath(logDir);
    logger.info('Logs folder opened', 'main', { logDir });
  } catch (error) {
    logger.error('Failed to open logs folder', 'main', error);
  }
}

async function updateTrayMenu() {
  if (!tray) return;

  logger.debug('Updating tray menu', 'main');

  const yabaiRunning = await getYabaiStatus();
  const appVersion = getAppVersion();
  const settings = await loadSettings();

  const menuTemplate = [
    {
      label: `vstab v${appVersion}`,
      click: () => {
        logger.debug('Opening GitHub repository', 'main');
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
            logger.debug('Theme setting clicked', 'main');
          },
        },
        {
          label: `Tab Bar Height: ${settings.tabBarHeight}px`,
          click: () => {
            // TODO: Open settings
            logger.debug('Tab bar height setting clicked', 'main');
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
        { type: 'separator' },
        {
          label: `Log Level: ${settings.logLevel.toUpperCase()}`,
          submenu: [
            {
              label: 'Error',
              type: 'radio',
              checked: settings.logLevel === 'error',
              click: () => setLogLevel('error'),
            },
            {
              label: 'Warn',
              type: 'radio',
              checked: settings.logLevel === 'warn',
              click: () => setLogLevel('warn'),
            },
            {
              label: 'Info',
              type: 'radio',
              checked: settings.logLevel === 'info',
              click: () => setLogLevel('info'),
            },
            {
              label: 'Debug',
              type: 'radio',
              checked: settings.logLevel === 'debug',
              click: () => setLogLevel('debug'),
            },
          ],
        },
        {
          label: 'Open Logs Folder',
          click: openLogsFolder,
        },
      ],
    },
    { type: 'separator' },
    {
      label: 'Quit vstab',
      click: () => {
        logger.info('Quit clicked from tray menu', 'main');
        app.quit();
      },
    },
  ];

  const contextMenu = Menu.buildFromTemplate(menuTemplate as any);
  tray.setContextMenu(contextMenu);

  logger.debug('Tray menu updated successfully', 'main');
}

async function createWindow() {
  logger.info('Creating main window', 'main');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;
  logger.debug('Screen dimensions', 'main', { width, height: TAB_BAR_HEIGHT });

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
  logger.debug('Loading HTML file', 'main', { htmlPath });
  mainWindow.loadFile(htmlPath);

  if (process.env.NODE_ENV === 'development') {
    logger.debug('Opening dev tools in development mode', 'main');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Start polling for VS Code windows
  logger.info('Starting window polling', 'main');
  startWindowPolling();

  // Set up IPC handlers
  logger.info('Setting up IPC handlers', 'main');
  setupIPCHandlers(mainWindow);
}

function startWindowPolling() {
  const pollWindows = async () => {
    if (!mainWindow) {
      logger.warn('Main window not available, skipping poll', 'main');
      return;
    }

    try {
      logger.debug('Polling for VS Code windows', 'main');
      const windows = await discoverVSCodeWindows();
      logger.debug('Sending windows to renderer', 'main', {
        windowCount: windows.length,
      });
      mainWindow.webContents.send(IPC_CHANNELS.VSCODE_WINDOWS_LIST, windows);

      // Update tray menu with current status
      if (tray) {
        await updateTrayMenu();
      }
    } catch (error) {
      logger.error('Error discovering windows', 'main', error);
      console.error('Error discovering windows:', error);
    }
  };

  // Poll immediately
  logger.info('Starting initial window poll', 'main');
  pollWindows();

  // Then poll every 1 second
  logger.info('Setting up window polling interval (1000ms)', 'main');
  pollInterval = setInterval(pollWindows, 1000);
}

app.whenReady().then(async () => {
  // Initialize settings and logging
  const settings = await initializeSettings();
  await initializeLogging(settings);

  logger.info('App ready, creating window', 'main');
  createWindow();

  logger.info('Creating tray icon', 'main');
  createTrayIcon();

  // Listen for tray menu update requests
  (process as any).on('tray-update-menu', async () => {
    logger.debug('Received tray menu update event', 'main');
    if (tray) {
      await updateTrayMenu();
    }
  });

  // Listen for tray settings changes
  (process as any).on('tray-settings-changed', async () => {
    logger.debug('Received tray settings changed event', 'main');
    if (tray) {
      // Update existing tray menu
      await updateTrayMenu();
    }
  });
});

app.on('window-all-closed', () => {
  logger.info('All windows closed', 'main');
  if (pollInterval) {
    logger.info('Clearing polling interval', 'main');
    clearInterval(pollInterval);
  }
  if (process.platform !== 'darwin') {
    logger.info('Quitting app (non-macOS)', 'main');
    app.quit();
  }
});

app.on('activate', () => {
  logger.info('App activated', 'main');
  if (mainWindow === null) {
    logger.info('No main window, creating new one', 'main');
    createWindow();
  }
});

app.on('before-quit', () => {
  logger.info('App about to quit, cleaning up tray', 'main');
  if (tray) {
    tray.destroy();
    tray = null;
  }
});

// Prevent app from showing in dock
logger.info('Hiding app from dock', 'main');
app.dock?.hide();
