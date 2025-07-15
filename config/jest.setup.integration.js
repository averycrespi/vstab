// Jest setup for integration tests

// Extended timeout for integration tests
jest.setTimeout(15000);

// Mock electron-mock-ipc for testing IPC communication
const { ipcMain, ipcRenderer } = require('electron-mock-ipc');

// Set up global mocks for integration tests
global.mockIPC = {
  main: ipcMain,
  renderer: ipcRenderer,
};

// Mock yabai with more realistic responses
const mockYabaiWindows = [
  {
    id: 1001,
    pid: 12345,
    app: 'Visual Studio Code',
    title: 'main.ts — vstab',
    frame: { x: 0, y: 45, w: 1920, h: 1035 },
    space: 1,
    display: 1,
    'has-focus': true,
    'is-visible': true,
    'is-minimized': false,
  },
  {
    id: 1002,
    pid: 12346,
    app: 'Visual Studio Code',
    title: 'App.tsx — my-project',
    frame: { x: 0, y: 45, w: 1920, h: 1035 },
    space: 1,
    display: 1,
    'has-focus': false,
    'is-visible': true,
    'is-minimized': false,
  },
];

const mockYabaiDisplays = [
  {
    index: 1,
    frame: { x: 0, y: 0, w: 1920, h: 1080 },
    'has-focus': true,
  },
];

// Mock child_process.exec for yabai commands
jest.mock('child_process', () => ({
  exec: jest.fn((command, callback) => {
    const { exec } = jest.requireActual('child_process');

    // Mock different yabai commands
    if (command.includes('which yabai')) {
      callback(null, { stdout: '/usr/local/bin/yabai', stderr: '' });
    } else if (command.includes('query --windows')) {
      callback(null, { stdout: JSON.stringify(mockYabaiWindows), stderr: '' });
    } else if (command.includes('query --displays')) {
      callback(null, { stdout: JSON.stringify(mockYabaiDisplays), stderr: '' });
    } else if (command.includes('window --focus')) {
      callback(null, { stdout: '', stderr: '' });
    } else if (
      command.includes('window') &&
      (command.includes('--move') || command.includes('--resize'))
    ) {
      callback(null, { stdout: '', stderr: '' });
    } else {
      // For any other command, use the actual exec
      return exec(command, callback);
    }
  }),
}));

// Mock fs/promises with in-memory storage
const mockFileSystem = new Map();

jest.mock('fs/promises', () => ({
  readFile: jest.fn(filePath => {
    if (mockFileSystem.has(filePath)) {
      return Promise.resolve(mockFileSystem.get(filePath));
    }
    return Promise.reject(new Error('ENOENT: no such file or directory'));
  }),
  writeFile: jest.fn((filePath, data) => {
    mockFileSystem.set(filePath, data);
    return Promise.resolve();
  }),
  mkdir: jest.fn(() => Promise.resolve()),
}));

// Helper to reset mock file system between tests
global.resetMockFileSystem = () => {
  mockFileSystem.clear();
};

// Helper to set mock yabai windows
global.setMockYabaiWindows = windows => {
  mockYabaiWindows.splice(0, mockYabaiWindows.length, ...windows);
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  resetMockFileSystem();
});
