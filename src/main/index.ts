import { app, BrowserWindow, screen, Tray, Menu, shell } from 'electron';
import * as path from 'path';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { discoverEditorWindows } from './windows';
import { setupIPCHandlers } from './ipc';
import { logger } from '@shared/logger';
import { initializeLogging, updateLoggingSettings } from './logger-init';
import { initializeSettings, loadSettings, saveSettings } from './settings';
import { LogLevel, Theme } from '@shared/types';

let mainWindow: BrowserWindow | null = null;
let pollInterval: ReturnType<typeof setInterval> | null = null;
let tray: Tray | null = null;

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

function toProperCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
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

async function setTheme(theme: Theme) {
  logger.debug('Setting theme', 'main', { theme });
  const settings = await loadSettings();
  const newSettings = { ...settings, theme };

  await saveSettings(newSettings);

  // Notify renderer about settings change
  if (mainWindow) {
    mainWindow.webContents.send(IPC_CHANNELS.SETTINGS_CHANGED, newSettings);
    logger.info('Settings change notification sent to renderer', 'main');
  }

  await updateTrayMenu();
  logger.info('Theme changed', 'main', {
    from: settings.theme,
    to: newSettings.theme,
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

async function setTabBarHeight(height: number) {
  logger.debug('Setting tab bar height', 'main', { height });
  const settings = await loadSettings();
  const newSettings = { ...settings, tabBarHeight: height };

  await saveSettings(newSettings);

  // Notify renderer about settings change
  if (mainWindow) {
    mainWindow.webContents.send(IPC_CHANNELS.SETTINGS_CHANGED, newSettings);
    logger.info('Settings change notification sent to renderer', 'main');
  }

  // Resize main window to new height
  if (mainWindow) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width } = primaryDisplay.workAreaSize;
    mainWindow.setBounds({
      x: 0,
      y: 0,
      width,
      height,
    });
    logger.debug('Main window resized to new tab bar height', 'main', {
      height,
    });
  }

  // Trigger window resizing to apply new height immediately
  try {
    const { resizeEditorWindows } = await import('./windows');
    await resizeEditorWindows(height);
    logger.debug('Editor windows resized for new tab bar height', 'main');
  } catch (error) {
    logger.error('Failed to resize editor windows', 'main', error);
  }

  await updateTrayMenu();
  logger.info('Tab bar height changed', 'main', {
    from: settings.tabBarHeight,
    to: newSettings.tabBarHeight,
  });
}

async function setTopMargin(margin: number) {
  logger.debug('Setting top margin', 'main', { margin });
  const settings = await loadSettings();
  const newSettings = { ...settings, topMargin: margin };

  await saveSettings(newSettings);

  // Notify renderer about settings change
  if (mainWindow) {
    mainWindow.webContents.send(IPC_CHANNELS.SETTINGS_CHANGED, newSettings);
    logger.info('Settings change notification sent to renderer', 'main');
  }

  // Trigger window resizing to apply new margin immediately
  try {
    const { resizeEditorWindows } = await import('./windows');
    await resizeEditorWindows(settings.tabBarHeight);
    logger.debug('Editor windows resized for new top margin', 'main');
  } catch (error) {
    logger.error('Failed to resize editor windows', 'main', error);
  }

  await updateTrayMenu();
  logger.info('Top margin changed', 'main', {
    from: settings.topMargin,
    to: newSettings.topMargin,
  });
}

async function setBottomMargin(margin: number) {
  logger.debug('Setting bottom margin', 'main', { margin });
  const settings = await loadSettings();
  const newSettings = { ...settings, bottomMargin: margin };

  await saveSettings(newSettings);

  // Notify renderer about settings change
  if (mainWindow) {
    mainWindow.webContents.send(IPC_CHANNELS.SETTINGS_CHANGED, newSettings);
    logger.info('Settings change notification sent to renderer', 'main');
  }

  // Trigger window resizing to apply new margin immediately
  try {
    const { resizeEditorWindows } = await import('./windows');
    await resizeEditorWindows(settings.tabBarHeight);
    logger.debug('Editor windows resized for new bottom margin', 'main');
  } catch (error) {
    logger.error('Failed to resize editor windows', 'main', error);
  }

  await updateTrayMenu();
  logger.info('Bottom margin changed', 'main', {
    from: settings.bottomMargin,
    to: newSettings.bottomMargin,
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

async function openSettingsFile() {
  logger.debug('Opening settings file', 'main');
  try {
    const settingsFile = path.join(
      require('os').homedir(),
      '.config',
      'vstab',
      'settings.json'
    );
    await shell.openPath(settingsFile);
    logger.info('Settings file opened', 'main', { settingsFile });
  } catch (error) {
    logger.error('Failed to open settings file', 'main', error);
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
      label: 'Quick Settings',
      submenu: [
        {
          label: 'Auto Hide Tab Bar',
          type: 'checkbox',
          checked: settings.autoHide,
          click: toggleAutoHide,
        },
        {
          label: 'Auto Resize Windows Vertically',
          type: 'checkbox',
          checked: settings.autoResizeVertical,
          click: toggleAutoResizeVertical,
        },
        {
          label: 'Auto Resize Windows Horizontally',
          type: 'checkbox',
          checked: settings.autoResizeHorizontal,
          click: toggleAutoResizeHorizontal,
        },
      ],
    },
    {
      label: 'Appearance',
      submenu: [
        {
          label: `Theme: ${toProperCase(settings.theme)}`,
          submenu: [
            {
              label: 'Light',
              type: 'radio',
              checked: settings.theme === 'light',
              click: () => setTheme('light'),
            },
            {
              label: 'Dark',
              type: 'radio',
              checked: settings.theme === 'dark',
              click: () => setTheme('dark'),
            },
            {
              label: 'System',
              type: 'radio',
              checked: settings.theme === 'system',
              click: () => setTheme('system'),
            },
          ],
        },
        {
          label: `Tab Bar Height: ${settings.tabBarHeight}px`,
          submenu: [
            {
              label: '25px',
              type: 'radio',
              checked: settings.tabBarHeight === 25,
              click: () => setTabBarHeight(25),
            },
            {
              label: '30px',
              type: 'radio',
              checked: settings.tabBarHeight === 30,
              click: () => setTabBarHeight(30),
            },
            {
              label: '35px',
              type: 'radio',
              checked: settings.tabBarHeight === 35,
              click: () => setTabBarHeight(35),
            },
            {
              label: '40px',
              type: 'radio',
              checked: settings.tabBarHeight === 40,
              click: () => setTabBarHeight(40),
            },
            {
              label: '45px',
              type: 'radio',
              checked: settings.tabBarHeight === 45,
              click: () => setTabBarHeight(45),
            },
            {
              label: '50px',
              type: 'radio',
              checked: settings.tabBarHeight === 50,
              click: () => setTabBarHeight(50),
            },
            {
              label: '55px',
              type: 'radio',
              checked: settings.tabBarHeight === 55,
              click: () => setTabBarHeight(55),
            },
            {
              label: '60px',
              type: 'radio',
              checked: settings.tabBarHeight === 60,
              click: () => setTabBarHeight(60),
            },
          ],
        },
        {
          label: `Window Top Margin: ${settings.topMargin}px`,
          submenu: [
            {
              label: '0px',
              type: 'radio',
              checked: settings.topMargin === 0,
              click: () => setTopMargin(0),
            },
            {
              label: '5px',
              type: 'radio',
              checked: settings.topMargin === 5,
              click: () => setTopMargin(5),
            },
            {
              label: '10px',
              type: 'radio',
              checked: settings.topMargin === 10,
              click: () => setTopMargin(10),
            },
            {
              label: '15px',
              type: 'radio',
              checked: settings.topMargin === 15,
              click: () => setTopMargin(15),
            },
            {
              label: '20px',
              type: 'radio',
              checked: settings.topMargin === 20,
              click: () => setTopMargin(20),
            },
            {
              label: '25px',
              type: 'radio',
              checked: settings.topMargin === 25,
              click: () => setTopMargin(25),
            },
          ],
        },
        {
          label: `Window Bottom Margin: ${settings.bottomMargin}px`,
          submenu: [
            {
              label: '0px',
              type: 'radio',
              checked: settings.bottomMargin === 0,
              click: () => setBottomMargin(0),
            },
            {
              label: '10px',
              type: 'radio',
              checked: settings.bottomMargin === 10,
              click: () => setBottomMargin(10),
            },
            {
              label: '20px',
              type: 'radio',
              checked: settings.bottomMargin === 20,
              click: () => setBottomMargin(20),
            },
            {
              label: '30px',
              type: 'radio',
              checked: settings.bottomMargin === 30,
              click: () => setBottomMargin(30),
            },
            {
              label: '40px',
              type: 'radio',
              checked: settings.bottomMargin === 40,
              click: () => setBottomMargin(40),
            },
            {
              label: '50px',
              type: 'radio',
              checked: settings.bottomMargin === 50,
              click: () => setBottomMargin(50),
            },
          ],
        },
      ],
    },
    {
      label: `Log Level: ${toProperCase(settings.logLevel)}`,
      submenu: [
        {
          label: 'Debug',
          type: 'radio',
          checked: settings.logLevel === 'debug',
          click: () => setLogLevel('debug'),
        },
        {
          label: 'Info',
          type: 'radio',
          checked: settings.logLevel === 'info',
          click: () => setLogLevel('info'),
        },
        {
          label: 'Warn',
          type: 'radio',
          checked: settings.logLevel === 'warn',
          click: () => setLogLevel('warn'),
        },
        {
          label: 'Error',
          type: 'radio',
          checked: settings.logLevel === 'error',
          click: () => setLogLevel('error'),
        },
      ],
    },
    { type: 'separator' },
    {
      label: 'Open Logs Folder',
      click: openLogsFolder,
    },
    {
      label: 'Open Settings File',
      click: openSettingsFile,
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

  // Get current tab bar height from settings
  const settings = await loadSettings();
  const tabBarHeight = settings.tabBarHeight;

  logger.debug('Screen dimensions', 'main', { width, height: tabBarHeight });

  mainWindow = new BrowserWindow({
    width,
    height: tabBarHeight,
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

  // Start polling for editor windows
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
      logger.debug('Polling for editor windows', 'main');
      const windows = await discoverEditorWindows();
      logger.debug('Sending windows to renderer', 'main', {
        windowCount: windows.length,
      });
      mainWindow.webContents.send(IPC_CHANNELS.EDITOR_WINDOWS_LIST, windows);

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
  logger.info('App about to quit, cleaning up tray and polling', 'main');
  if (pollInterval) {
    logger.info('Clearing polling interval', 'main');
    clearInterval(pollInterval);
    pollInterval = null;
  }
  if (tray) {
    tray.destroy();
    tray = null;
  }
});

// Prevent app from showing in dock
logger.info('Hiding app from dock', 'main');
app.dock?.hide();
