// Jest setup for main process tests (Node.js environment)

// Mock Electron app module
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(path => {
      if (path === 'userData') return '/tmp/test-userData';
      return `/tmp/test-${path}`;
    }),
    quit: jest.fn(),
    on: jest.fn(),
    whenReady: jest.fn().mockResolvedValue(undefined),
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(),
    on: jest.fn(),
    webContents: {
      send: jest.fn(),
      on: jest.fn(),
    },
    show: jest.fn(),
    hide: jest.fn(),
    setAlwaysOnTop: jest.fn(),
    setVisibleOnAllWorkspaces: jest.fn(),
    setBounds: jest.fn(),
  })),
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
    removeAllListeners: jest.fn(),
  },
  screen: {
    getPrimaryDisplay: jest.fn(() => ({
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
    })),
    getAllDisplays: jest.fn(() => [
      { bounds: { x: 0, y: 0, width: 1920, height: 1080 } },
    ]),
  },
}));

// Mock child_process
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
}));

// Mock crypto
jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mockedhash123456789'),
  })),
}));

// Silent all logging during tests to reduce noise
beforeAll(() => {
  // Import and configure logger to disable all output
  const { configureLogger } = require('../src/shared/logger');
  configureLogger({ logToConsole: false, logToFile: false });
});

// Global test timeout for main process tests
jest.setTimeout(5000);
