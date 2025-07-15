import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import {
  focusWindow,
  hideWindow,
  getFrontmostApp,
  resizeVSCodeWindows,
  discoverVSCodeWindows,
} from './windows';
import { loadTabOrder, saveTabOrder } from './persistence';
import { loadSettings, saveSettings } from './settings';
import { logger } from '@shared/logger';
import { getFileLogger } from './file-logger';
import { updateLoggingSettings } from './logger-init';
import { AppSettings } from '@shared/types';

export function setupIPCHandlers(mainWindow: BrowserWindow) {
  logger.info('Setting up IPC handlers', 'ipc');

  // Window focus
  ipcMain.handle(
    IPC_CHANNELS.VSCODE_WINDOW_FOCUS,
    async (_, windowId: string) => {
      logger.debug('Focus window request', 'ipc', { windowId });
      try {
        await focusWindow(windowId);

        // Hide all other VS Code windows
        logger.debug('Hiding other VS Code windows', 'ipc');
        const windows = await discoverVSCodeWindows();
        for (const window of windows) {
          if (window.id !== windowId) {
            logger.debug('Hiding window', 'ipc', { windowId: window.id });
            await hideWindow(window.id);
          }
        }
        logger.info('Window focus completed successfully', 'ipc');
      } catch (error) {
        logger.error('Error handling window focus', 'ipc', error);
        console.error('Error handling window focus:', error);
        throw error;
      }
    }
  );

  // Tab reordering
  ipcMain.handle(IPC_CHANNELS.TABS_REORDER, async (_, windowIds: string[]) => {
    logger.debug('Reorder tabs request', 'ipc', { windowIds });
    try {
      await saveTabOrder(windowIds);
      logger.info('Tab order saved successfully', 'ipc');
    } catch (error) {
      logger.error('Error saving tab order', 'ipc', error);
      console.error('Error saving tab order:', error);
      throw error;
    }
  });

  // Get tab order
  ipcMain.handle(IPC_CHANNELS.TABS_GET_ORDER, async () => {
    logger.debug('Get tab order request', 'ipc');
    try {
      const tabOrder = await loadTabOrder();
      logger.debug('Loaded tab order', 'ipc', { tabOrder });
      return tabOrder;
    } catch (error) {
      logger.error('Error loading tab order', 'ipc', error);
      console.error('Error loading tab order:', error);
      return [];
    }
  });

  // Check if app should be visible
  ipcMain.handle(IPC_CHANNELS.APP_SHOULD_SHOW, async () => {
    logger.debug('Check app visibility request', 'ipc');
    try {
      const frontmostApp = await getFrontmostApp();
      const shouldShow = frontmostApp.includes('Code');
      logger.debug('App should show', 'ipc', { shouldShow, frontmostApp });
      return shouldShow;
    } catch (error) {
      logger.error('Error checking frontmost app', 'ipc', error);
      console.error('Error checking frontmost app:', error);
      return false;
    }
  });

  // Resize VS Code windows
  ipcMain.handle(
    IPC_CHANNELS.VSCODE_WINDOWS_RESIZE,
    async (_, tabBarHeight: number) => {
      logger.debug('Resize windows request', 'ipc', { tabBarHeight });
      try {
        await resizeVSCodeWindows(tabBarHeight);
        logger.info('Windows resized successfully', 'ipc');
      } catch (error) {
        logger.error('Error resizing windows', 'ipc', error);
        console.error('Error resizing windows:', error);
        throw error;
      }
    }
  );

  // Get frontmost app
  ipcMain.handle(IPC_CHANNELS.SYSTEM_FRONTMOST_APP, async () => {
    logger.debug('Get frontmost app request', 'ipc');
    try {
      const frontmostApp = await getFrontmostApp();
      logger.debug('Frontmost app result', 'ipc', { frontmostApp });
      return frontmostApp;
    } catch (error) {
      logger.error('Error getting frontmost app', 'ipc', error);
      console.error('Error getting frontmost app:', error);
      return '';
    }
  });

  // Get settings
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
    logger.debug('Get settings request', 'ipc');
    try {
      const settings = await loadSettings();
      logger.debug('Loaded settings', 'ipc', { settings });
      return settings;
    } catch (error) {
      logger.error('Error loading settings', 'ipc', error);
      console.error('Error loading settings:', error);
      throw error;
    }
  });

  // Update settings
  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_UPDATE,
    async (_, settings: AppSettings) => {
      logger.debug('Update settings request', 'ipc', { settings });
      try {
        await saveSettings(settings);
        logger.info('Settings saved successfully', 'ipc');

        // Update logging settings
        updateLoggingSettings(settings);

        // Notify renderer about settings change
        mainWindow.webContents.send(IPC_CHANNELS.SETTINGS_CHANGED, settings);
        logger.info('Settings change notification sent to renderer', 'ipc');

        return settings;
      } catch (error) {
        logger.error('Error saving settings', 'ipc', error);
        console.error('Error saving settings:', error);
        throw error;
      }
    }
  );

  // Tray update menu (trigger menu refresh)
  ipcMain.handle(IPC_CHANNELS.TRAY_UPDATE_MENU, async () => {
    logger.debug('Update tray menu request', 'ipc');
    try {
      // This will be handled by emitting an event to main process
      // The main process will listen for this and update the tray menu
      (process as any).emit('tray-update-menu');
      logger.info('Tray menu update triggered', 'ipc');
    } catch (error) {
      logger.error('Error triggering tray menu update', 'ipc', error);
      console.error('Error triggering tray menu update:', error);
      throw error;
    }
  });

  // Window visibility control
  ipcMain.handle(
    IPC_CHANNELS.WINDOW_SET_VISIBILITY,
    async (_, visible: boolean) => {
      logger.debug('Set window visibility request', 'ipc', { visible });
      try {
        if (visible) {
          mainWindow.show();
          logger.info('Main window shown', 'ipc');
        } else {
          mainWindow.hide();
          logger.info('Main window hidden', 'ipc');
        }
      } catch (error) {
        logger.error('Error setting window visibility', 'ipc', error);
        console.error('Error setting window visibility:', error);
        throw error;
      }
    }
  );

  // Logging IPC handlers
  ipcMain.handle(IPC_CHANNELS.LOGS_GET_DIRECTORY, async () => {
    logger.debug('Get logs directory request', 'ipc');
    try {
      const fileLogger = getFileLogger();
      const logDir = await fileLogger.getLogDirectory();
      logger.debug('Log directory result', 'ipc', { logDir });
      return logDir;
    } catch (error) {
      logger.error('Error getting log directory', 'ipc', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.LOGS_GET_FILES, async () => {
    logger.debug('Get log files request', 'ipc');
    try {
      const fileLogger = getFileLogger();
      const files = await fileLogger.getLogFiles();
      logger.debug('Log files result', 'ipc', { files });
      return files;
    } catch (error) {
      logger.error('Error getting log files', 'ipc', error);
      throw error;
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.LOGS_READ_FILE,
    async (_, filename: string, lines?: number) => {
      logger.debug('Read log file request', 'ipc', { filename, lines });
      try {
        const fileLogger = getFileLogger();
        const entries = await fileLogger.readLogFile(filename, lines);
        logger.debug('Log file read result', 'ipc', {
          filename,
          entryCount: entries.length,
        });
        return entries;
      } catch (error) {
        logger.error('Error reading log file', 'ipc', error);
        throw error;
      }
    }
  );
}
