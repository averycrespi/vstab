export const IPC_CHANNELS = {
  // Window management
  VSCODE_WINDOWS_LIST: 'vscode:windows:list',
  VSCODE_WINDOW_FOCUS: 'vscode:window:focus',
  VSCODE_WINDOW_HIDE: 'vscode:window:hide',
  VSCODE_WINDOWS_RESIZE: 'vscode:windows:resize',

  // Tab management
  TABS_REORDER: 'tabs:reorder',
  TABS_GET_ORDER: 'tabs:get-order',

  // App visibility
  APP_VISIBILITY_CHANGE: 'app:visibility:change',
  APP_SHOULD_SHOW: 'app:should-show',
  WINDOW_SET_VISIBILITY: 'window:set-visibility',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  SETTINGS_CHANGED: 'settings:changed',

  // Tray
  TRAY_TOGGLE_VISIBILITY: 'tray:toggle-visibility',
  TRAY_UPDATE_MENU: 'tray:update-menu',

  // Logging
  LOGS_GET_DIRECTORY: 'logs:get-directory',
  LOGS_GET_FILES: 'logs:get-files',
  LOGS_READ_FILE: 'logs:read-file',

  // System
  SYSTEM_FRONTMOST_APP: 'system:frontmost-app',
  SYSTEM_DISPLAY_INFO: 'system:display-info',
} as const;

export type IPCChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
