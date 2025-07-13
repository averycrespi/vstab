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
}

export interface TabOrder {
  windowId: string;
  order: number;
}

export interface AppSettings {
  tabBarHeight: number;
  autoHide: boolean;
  useYabai: boolean;
  persistTabOrder: boolean;
}