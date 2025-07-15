// Jest setup for renderer process tests (JSDOM environment)
require('@testing-library/jest-dom');

// Mock the global window.vstab API that's provided by the preload script
global.window.vstab = {
  // Window management
  getVSCodeWindows: jest.fn().mockResolvedValue([]),
  focusWindow: jest.fn().mockResolvedValue(undefined),
  hideWindow: jest.fn().mockResolvedValue(undefined),
  resizeWindows: jest.fn().mockResolvedValue(undefined),
  
  // Tab management
  getTabOrder: jest.fn().mockResolvedValue([]),
  reorderTabs: jest.fn().mockResolvedValue(undefined),
  
  // App visibility
  shouldShow: jest.fn().mockResolvedValue(true),
  onVisibilityChange: jest.fn(),
  
  // Settings
  getSettings: jest.fn().mockResolvedValue({
    tabBarHeight: 30,
    autoHide: true,
    persistTabOrder: true
  }),
  updateSettings: jest.fn().mockResolvedValue(undefined),
  
  // System
  getFrontmostApp: jest.fn().mockResolvedValue('Visual Studio Code')
};

// Mock CSS custom properties for VS Code theming
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: (prop) => {
      const mockValues = {
        '--color-vscode-tab-active': '#1e1e1e',
        '--color-vscode-tab-inactive': '#2d2d30',
        '--color-vscode-text': '#cccccc',
        '--color-vscode-text-inactive': '#969696',
        '--color-vscode-border': '#454545'
      };
      return mockValues[prop] || '';
    }
  })
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn((id) => clearTimeout(id));

// Mock drag and drop events
const mockDataTransfer = {
  dropEffect: '',
  effectAllowed: '',
  files: [],
  items: [],
  types: [],
  getData: jest.fn(),
  setData: jest.fn(),
  clearData: jest.fn(),
  setDragImage: jest.fn()
};

global.DragEvent = jest.fn().mockImplementation((type, init) => ({
  ...new Event(type, init),
  dataTransfer: mockDataTransfer
}));

// Global test timeout for renderer tests
jest.setTimeout(5000);