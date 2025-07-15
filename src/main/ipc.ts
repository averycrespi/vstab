import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { focusWindow, hideWindow, getFrontmostApp, resizeVSCodeWindows, discoverVSCodeWindows } from './windows';
import { loadTabOrder, saveTabOrder } from './persistence';
import { loadSettings, saveSettings } from './settings';
import { debugLog } from '@shared/debug';
import { AppSettings } from '@shared/types';

export function setupIPCHandlers(_mainWindow: BrowserWindow) {
  debugLog('Setting up IPC handlers');
  
  // Window focus
  ipcMain.handle(IPC_CHANNELS.VSCODE_WINDOW_FOCUS, async (_, windowId: string) => {
    debugLog('IPC: Focus window request for:', windowId);
    try {
      await focusWindow(windowId);
      
      // Hide all other VS Code windows
      debugLog('Hiding other VS Code windows');
      const windows = await discoverVSCodeWindows();
      for (const window of windows) {
        if (window.id !== windowId) {
          debugLog('Hiding window:', window.id);
          await hideWindow(window.id);
        }
      }
      debugLog('Window focus completed successfully');
    } catch (error) {
      debugLog('Error handling window focus:', error);
      console.error('Error handling window focus:', error);
      throw error;
    }
  });

  // Tab reordering
  ipcMain.handle(IPC_CHANNELS.TABS_REORDER, async (_, windowIds: string[]) => {
    debugLog('IPC: Reorder tabs request:', windowIds);
    try {
      await saveTabOrder(windowIds);
      debugLog('Tab order saved successfully');
    } catch (error) {
      debugLog('Error saving tab order:', error);
      console.error('Error saving tab order:', error);
      throw error;
    }
  });

  // Get tab order
  ipcMain.handle(IPC_CHANNELS.TABS_GET_ORDER, async () => {
    debugLog('IPC: Get tab order request');
    try {
      const tabOrder = await loadTabOrder();
      debugLog('Loaded tab order:', tabOrder);
      return tabOrder;
    } catch (error) {
      debugLog('Error loading tab order:', error);
      console.error('Error loading tab order:', error);
      return [];
    }
  });

  // Check if app should be visible
  ipcMain.handle(IPC_CHANNELS.APP_SHOULD_SHOW, async () => {
    debugLog('IPC: Check app visibility request');
    try {
      const frontmostApp = await getFrontmostApp();
      const shouldShow = frontmostApp.includes('Code');
      debugLog('App should show:', shouldShow, '(frontmost:', frontmostApp + ')');
      return shouldShow;
    } catch (error) {
      debugLog('Error checking frontmost app:', error);
      console.error('Error checking frontmost app:', error);
      return false;
    }
  });

  // Resize VS Code windows
  ipcMain.handle(IPC_CHANNELS.VSCODE_WINDOWS_RESIZE, async (_, tabBarHeight: number) => {
    debugLog('IPC: Resize windows request, height:', tabBarHeight);
    try {
      await resizeVSCodeWindows(tabBarHeight);
      debugLog('Windows resized successfully');
    } catch (error) {
      debugLog('Error resizing windows:', error);
      console.error('Error resizing windows:', error);
      throw error;
    }
  });

  // Get frontmost app
  ipcMain.handle(IPC_CHANNELS.SYSTEM_FRONTMOST_APP, async () => {
    debugLog('IPC: Get frontmost app request');
    try {
      const frontmostApp = await getFrontmostApp();
      debugLog('Frontmost app result:', frontmostApp);
      return frontmostApp;
    } catch (error) {
      debugLog('Error getting frontmost app:', error);
      console.error('Error getting frontmost app:', error);
      return '';
    }
  });

  // Get settings
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
    debugLog('IPC: Get settings request');
    try {
      const settings = await loadSettings();
      debugLog('Loaded settings:', settings);
      return settings;
    } catch (error) {
      debugLog('Error loading settings:', error);
      console.error('Error loading settings:', error);
      throw error;
    }
  });

  // Update settings
  ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, async (_, settings: AppSettings) => {
    debugLog('IPC: Update settings request:', settings);
    try {
      await saveSettings(settings);
      debugLog('Settings saved successfully');
      
      // Update debug logging based on settings
      if ('debugLogging' in settings) {
        (global as any).DEBUG_MODE = settings.debugLogging;
      }
      
      return settings;
    } catch (error) {
      debugLog('Error saving settings:', error);
      console.error('Error saving settings:', error);
      throw error;
    }
  });
}