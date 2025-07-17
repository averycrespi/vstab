export interface VSCodeWindow {
  id: string;
  title: string;
  path: string;
  isActive: boolean;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  // Yabai-specific metadata
  yabaiMetadata?: {
    space: number;
    display: number;
    pid: number;
    isVisible: boolean;
    isMinimized: boolean;
    isFloating?: boolean;
  };
}

export interface TabOrder {
  windowId: string;
  order: number;
}

export type Theme = 'light' | 'dark' | 'system';
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface EditorPattern {
  id: string;
  displayName: string;
  appNamePatterns: string[];
  titlePatterns?: string[];
}

export interface EditorDetectionConfig {
  editors: EditorPattern[];
}

export interface AppSettings {
  theme: Theme;
  tabBarHeight: number;
  topMargin: number;
  bottomMargin: number;
  autoHide: boolean;
  autoResizeVertical: boolean;
  autoResizeHorizontal: boolean;
  logLevel: LogLevel;
  logRetentionDays: number;
  maxLogFileSizeMB: number;
  editorDetectionConfig: EditorDetectionConfig;
}
