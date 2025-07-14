// Mock Electron functionality for testing

export interface MockBrowserWindow {
  id: number;
  isDestroyed: boolean;
  isVisible: boolean;
  bounds: { x: number; y: number; width: number; height: number };
  webContents: {
    send: jest.MockedFunction<any>;
    on: jest.MockedFunction<any>;
    removeAllListeners: jest.MockedFunction<any>;
  };
  loadFile: jest.MockedFunction<any>;
  show: jest.MockedFunction<any>;
  hide: jest.MockedFunction<any>;
  focus: jest.MockedFunction<any>;
  blur: jest.MockedFunction<any>;
  close: jest.MockedFunction<any>;
  destroy: jest.MockedFunction<any>;
  setBounds: jest.MockedFunction<any>;
  getBounds: jest.MockedFunction<any>;
  setAlwaysOnTop: jest.MockedFunction<any>;
  setVisibleOnAllWorkspaces: jest.MockedFunction<any>;
  on: jest.MockedFunction<any>;
  once: jest.MockedFunction<any>;
  removeAllListeners: jest.MockedFunction<any>;
}

class ElectronMock {
  private windows: MockBrowserWindow[] = [];
  private nextWindowId = 1;
  private userData = '/tmp/test-userData';
  private ipcHandlers = new Map<string, Function>();
  private appReady = false;

  // App mock
  app = {
    getPath: jest.fn((name: string) => {
      const paths: Record<string, string> = {
        userData: this.userData,
        temp: '/tmp/test-temp',
        home: '/tmp/test-home',
        documents: '/tmp/test-documents'
      };
      return paths[name] || `/tmp/test-${name}`;
    }),
    
    quit: jest.fn(() => {
      this.windows.forEach(win => win.destroy());
      this.windows = [];
    }),
    
    on: jest.fn((event: string, callback: Function) => {
      if (event === 'ready' && this.appReady) {
        callback();
      }
    }),
    
    whenReady: jest.fn(() => {
      this.appReady = true;
      return Promise.resolve();
    }),
    
    isReady: jest.fn(() => this.appReady),
    
    getName: jest.fn(() => 'vstab'),
    getVersion: jest.fn(() => '1.0.0')
  };

  // BrowserWindow mock constructor
  BrowserWindow = jest.fn().mockImplementation((options: any = {}) => {
    const window: MockBrowserWindow = {
      id: this.nextWindowId++,
      isDestroyed: false,
      isVisible: false,
      bounds: options.bounds || { x: 0, y: 0, width: 800, height: 600 },
      
      webContents: {
        send: jest.fn(),
        on: jest.fn(),
        removeAllListeners: jest.fn()
      },
      
      loadFile: jest.fn().mockResolvedValue(undefined),
      show: jest.fn(() => { window.isVisible = true; }),
      hide: jest.fn(() => { window.isVisible = false; }),
      focus: jest.fn(),
      blur: jest.fn(),
      close: jest.fn(() => { window.destroy(); }),
      destroy: jest.fn(() => {
        window.isDestroyed = true;
        this.windows = this.windows.filter(w => w.id !== window.id);
      }),
      
      setBounds: jest.fn((bounds: any) => {
        window.bounds = { ...window.bounds, ...bounds };
      }),
      getBounds: jest.fn(() => window.bounds),
      
      setAlwaysOnTop: jest.fn(),
      setVisibleOnAllWorkspaces: jest.fn(),
      
      on: jest.fn(),
      once: jest.fn(),
      removeAllListeners: jest.fn()
    };

    this.windows.push(window);
    return window;
  });

  // IPC Main mock
  ipcMain = {
    handle: jest.fn((channel: string, handler: Function) => {
      this.ipcHandlers.set(channel, handler);
    }),
    
    on: jest.fn(),
    once: jest.fn(),
    removeAllListeners: jest.fn((channel?: string) => {
      if (channel) {
        this.ipcHandlers.delete(channel);
      } else {
        this.ipcHandlers.clear();
      }
    }),
    
    // Helper method to simulate IPC call from renderer
    _triggerHandler: async (channel: string, ...args: any[]) => {
      const handler = this.ipcHandlers.get(channel);
      if (handler) {
        const event = { sender: { send: jest.fn() } };
        return await handler(event, ...args);
      }
      throw new Error(`No handler for channel: ${channel}`);
    }
  };

  // IPC Renderer mock (for preload script testing)
  ipcRenderer = {
    invoke: jest.fn((channel: string, ...args: any[]) => {
      return this.ipcMain._triggerHandler(channel, ...args);
    }),
    
    send: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    removeAllListeners: jest.fn()
  };

  // Screen mock
  screen = {
    getPrimaryDisplay: jest.fn(() => ({
      id: 1,
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      workArea: { x: 0, y: 23, width: 1920, height: 1057 }, // macOS menu bar
      scaleFactor: 1,
      rotation: 0,
      colorDepth: 24
    })),
    
    getAllDisplays: jest.fn(() => [
      {
        id: 1,
        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
        workArea: { x: 0, y: 23, width: 1920, height: 1057 },
        scaleFactor: 1,
        rotation: 0,
        colorDepth: 24
      }
    ])
  };

  // Helper methods for testing
  setUserDataPath(path: string) {
    this.userData = path;
  }

  getWindows() {
    return [...this.windows];
  }

  getWindow(id: number) {
    return this.windows.find(w => w.id === id);
  }

  reset() {
    this.windows.forEach(win => win.destroy());
    this.windows = [];
    this.nextWindowId = 1;
    this.ipcHandlers.clear();
    this.appReady = false;
    jest.clearAllMocks();
  }

  triggerAppReady() {
    this.appReady = true;
  }
}

// Export singleton instance
export const electronMock = new ElectronMock();

// Export the mock objects for Jest
export const app = electronMock.app;
export const BrowserWindow = electronMock.BrowserWindow;
export const ipcMain = electronMock.ipcMain;
export const ipcRenderer = electronMock.ipcRenderer;
export const screen = electronMock.screen;