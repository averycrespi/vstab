import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { VSCodeWindow, AppSettings } from '@shared/types';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('vstab', {
  // Window management
  onWindowsUpdate: (callback: (windows: VSCodeWindow[]) => void) => {
    ipcRenderer.on(IPC_CHANNELS.VSCODE_WINDOWS_LIST, (_, windows) =>
      callback(windows)
    );
  },

  focusWindow: (windowId: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.VSCODE_WINDOW_FOCUS, windowId);
  },

  // Tab management
  reorderTabs: (windowIds: string[]) => {
    return ipcRenderer.invoke(IPC_CHANNELS.TABS_REORDER, windowIds);
  },

  getTabOrder: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.TABS_GET_ORDER);
  },

  // App visibility
  shouldShow: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.APP_SHOULD_SHOW);
  },

  getFrontmostApp: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_FRONTMOST_APP);
  },

  // Window resizing
  resizeWindows: (tabBarHeight: number) => {
    return ipcRenderer.invoke(IPC_CHANNELS.VSCODE_WINDOWS_RESIZE, tabBarHeight);
  },

  // Settings
  getSettings: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET);
  },

  updateSettings: (settings: AppSettings) => {
    return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, settings);
  },
});

// Type definitions for window.vstab
export interface VstabAPI {
  onWindowsUpdate: (callback: (windows: VSCodeWindow[]) => void) => void;
  focusWindow: (windowId: string) => Promise<void>;
  reorderTabs: (windowIds: string[]) => Promise<void>;
  getTabOrder: () => Promise<string[]>;
  shouldShow: () => Promise<boolean>;
  getFrontmostApp: () => Promise<string>;
  resizeWindows: (tabBarHeight: number) => Promise<void>;
  getSettings: () => Promise<AppSettings>;
  updateSettings: (settings: AppSettings) => Promise<AppSettings>;
}

declare global {
  interface Window {
    vstab: VstabAPI;
  }
}
