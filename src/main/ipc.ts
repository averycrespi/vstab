import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { focusWindow, hideWindow, getFrontmostApp, resizeVSCodeWindows, discoverVSCodeWindows } from './windows';
import { loadTabOrder, saveTabOrder } from './persistence';

export function setupIPCHandlers(_mainWindow: BrowserWindow) {
  // Window focus
  ipcMain.handle(IPC_CHANNELS.VSCODE_WINDOW_FOCUS, async (_, windowId: string) => {
    try {
      await focusWindow(windowId);
      
      // Hide all other VS Code windows
      const windows = await discoverVSCodeWindows();
      for (const window of windows) {
        if (window.id !== windowId) {
          await hideWindow(window.id);
        }
      }
    } catch (error) {
      console.error('Error handling window focus:', error);
      throw error;
    }
  });

  // Tab reordering
  ipcMain.handle(IPC_CHANNELS.TABS_REORDER, async (_, windowIds: string[]) => {
    try {
      await saveTabOrder(windowIds);
    } catch (error) {
      console.error('Error saving tab order:', error);
      throw error;
    }
  });

  // Get tab order
  ipcMain.handle(IPC_CHANNELS.TABS_GET_ORDER, async () => {
    try {
      return await loadTabOrder();
    } catch (error) {
      console.error('Error loading tab order:', error);
      return [];
    }
  });

  // Check if app should be visible
  ipcMain.handle(IPC_CHANNELS.APP_SHOULD_SHOW, async () => {
    try {
      const frontmostApp = await getFrontmostApp();
      return frontmostApp.includes('Code');
    } catch (error) {
      console.error('Error checking frontmost app:', error);
      return false;
    }
  });

  // Resize VS Code windows
  ipcMain.handle(IPC_CHANNELS.VSCODE_WINDOWS_RESIZE, async (_, tabBarHeight: number) => {
    try {
      await resizeVSCodeWindows(tabBarHeight);
    } catch (error) {
      console.error('Error resizing windows:', error);
      throw error;
    }
  });

  // Get frontmost app
  ipcMain.handle(IPC_CHANNELS.SYSTEM_FRONTMOST_APP, async () => {
    try {
      return await getFrontmostApp();
    } catch (error) {
      console.error('Error getting frontmost app:', error);
      return '';
    }
  });
}