import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@shared/ipc-channels';
import { EditorWindow, AppSettings } from '@shared/types';
import { LogEntry } from '@shared/logger';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('vstab', {
  // Window management
  onWindowsUpdate: (callback: (windows: EditorWindow[]) => void) => {
    ipcRenderer.on(IPC_CHANNELS.EDITOR_WINDOWS_LIST, (_, windows) =>
      callback(windows)
    );
  },

  focusWindow: (windowId: string) => {
    return ipcRenderer.invoke(IPC_CHANNELS.EDITOR_WINDOW_FOCUS, windowId);
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
    return ipcRenderer.invoke(IPC_CHANNELS.EDITOR_WINDOWS_RESIZE, tabBarHeight);
  },

  // Settings
  getSettings: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET);
  },

  updateSettings: (settings: AppSettings) => {
    return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, settings);
  },

  onSettingsChanged: (callback: (settings: AppSettings) => void) => {
    const wrapper = (_: any, settings: AppSettings) => callback(settings);
    ipcRenderer.on(IPC_CHANNELS.SETTINGS_CHANGED, wrapper);
    // Store the wrapper on the callback function for cleanup
    (callback as any)._wrapper = wrapper;
  },

  offSettingsChanged: (callback: (settings: AppSettings) => void) => {
    const wrapper = (callback as any)._wrapper;
    if (wrapper) {
      ipcRenderer.removeListener(IPC_CHANNELS.SETTINGS_CHANGED, wrapper);
      delete (callback as any)._wrapper;
    }
  },

  // Tray management
  updateTrayMenu: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.TRAY_UPDATE_MENU);
  },

  // Window visibility
  setWindowVisibility: (visible: boolean) => {
    return ipcRenderer.invoke(IPC_CHANNELS.WINDOW_SET_VISIBILITY, visible);
  },

  // Logging
  getLogsDirectory: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.LOGS_GET_DIRECTORY);
  },

  getLogFiles: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.LOGS_GET_FILES);
  },

  readLogFile: (filename: string, lines?: number) => {
    return ipcRenderer.invoke(IPC_CHANNELS.LOGS_READ_FILE, filename, lines);
  },
});

// Type definitions for window.vstab
export interface VstabAPI {
  onWindowsUpdate: (callback: (windows: EditorWindow[]) => void) => void;
  focusWindow: (windowId: string) => Promise<void>;
  reorderTabs: (windowIds: string[]) => Promise<void>;
  getTabOrder: () => Promise<string[]>;
  shouldShow: () => Promise<boolean>;
  getFrontmostApp: () => Promise<string>;
  resizeWindows: (tabBarHeight: number) => Promise<void>;
  getSettings: () => Promise<AppSettings>;
  updateSettings: (settings: AppSettings) => Promise<AppSettings>;
  onSettingsChanged: (callback: (settings: AppSettings) => void) => void;
  offSettingsChanged: (callback: (settings: AppSettings) => void) => void;
  updateTrayMenu: () => Promise<void>;
  setWindowVisibility: (visible: boolean) => Promise<void>;
  getLogsDirectory: () => Promise<string>;
  getLogFiles: () => Promise<string[]>;
  readLogFile: (filename: string, lines?: number) => Promise<LogEntry[]>;
}

declare global {
  interface Window {
    vstab: VstabAPI;
  }
}
