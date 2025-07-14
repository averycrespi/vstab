// Mock electron before any imports
jest.mock('electron');
jest.mock('../../src/main/windows');
jest.mock('../../src/main/persistence');

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../src/shared/ipc-channels';
import { setupIPCHandlers } from '../../src/main/ipc';
import { VSCodeWindow } from '../../src/shared/types';

// Import modules to mock
import * as windows from '../../src/main/windows';
import * as persistence from '../../src/main/persistence';

const mockWindows = jest.mocked(windows);
const mockPersistence = jest.mocked(persistence);
const mockIpcMain = jest.mocked(ipcMain);

describe('IPC Communication Integration', () => {
  let mockMainWindow: any;
  let ipcHandlers: Map<string, Function>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock main window
    mockMainWindow = {
      webContents: {
        send: jest.fn()
      }
    };

    // Track IPC handlers
    ipcHandlers = new Map();
    mockIpcMain.handle.mockImplementation((channel: string, handler: Function) => {
      ipcHandlers.set(channel, handler);
    });

    // Setup IPC handlers
    setupIPCHandlers(mockMainWindow);
  });

  afterEach(() => {
    // Clear handlers map
    ipcHandlers.clear();
  });

  const createMockEvent = () => ({ sender: { send: jest.fn() } });

  describe('Window Focus Flow', () => {
    it('should focus window and hide others through IPC', async () => {
      const targetWindowId = 'window1';
      const mockWindowList: VSCodeWindow[] = [
        {
          id: 'window1',
          title: 'main.ts — vstab',
          path: 'vstab',
          isActive: false,
          position: { x: 0, y: 45, width: 1920, height: 1035 }
        },
        {
          id: 'window2',
          title: 'App.tsx — project',
          path: 'project',
          isActive: false,
          position: { x: 0, y: 45, width: 1920, height: 1035 }
        }
      ];

      // Setup mocks
      mockWindows.focusWindow.mockResolvedValue(undefined);
      mockWindows.discoverVSCodeWindows.mockResolvedValue(mockWindowList);
      mockWindows.hideWindow.mockResolvedValue(undefined);

      // Call IPC handler directly
      const focusHandler = ipcHandlers.get(IPC_CHANNELS.VSCODE_WINDOW_FOCUS)!;
      const result = await focusHandler(createMockEvent(), targetWindowId);

      // Verify the flow
      expect(mockWindows.focusWindow).toHaveBeenCalledWith(targetWindowId);
      expect(mockWindows.discoverVSCodeWindows).toHaveBeenCalled();
      expect(mockWindows.hideWindow).toHaveBeenCalledWith('window2');
      expect(mockWindows.hideWindow).not.toHaveBeenCalledWith('window1');
      expect(result).toBeUndefined();
    });

    it('should handle focus errors', async () => {
      const targetWindowId = 'invalid-window';
      const focusError = new Error('Window not found');

      mockWindows.focusWindow.mockRejectedValue(focusError);

      const focusHandler = ipcHandlers.get(IPC_CHANNELS.VSCODE_WINDOW_FOCUS)!;
      
      await expect(
        focusHandler(createMockEvent(), targetWindowId)
      ).rejects.toThrow('Window not found');

      expect(mockWindows.focusWindow).toHaveBeenCalledWith(targetWindowId);
      expect(mockWindows.discoverVSCodeWindows).not.toHaveBeenCalled();
    });
  });

  describe('Tab Order Management Flow', () => {
    it('should save and load tab order through IPC', async () => {
      const tabOrder = ['window3', 'window1', 'window2'];

      // Test save
      mockPersistence.saveTabOrder.mockResolvedValue(undefined);
      const reorderHandler = ipcHandlers.get(IPC_CHANNELS.TABS_REORDER)!;
      await reorderHandler(createMockEvent(), tabOrder);
      expect(mockPersistence.saveTabOrder).toHaveBeenCalledWith(tabOrder);

      // Test load
      mockPersistence.loadTabOrder.mockResolvedValue(tabOrder);
      const getOrderHandler = ipcHandlers.get(IPC_CHANNELS.TABS_GET_ORDER)!;
      const loadedOrder = await getOrderHandler(createMockEvent());
      expect(mockPersistence.loadTabOrder).toHaveBeenCalled();
      expect(loadedOrder).toEqual(tabOrder);
    });

    it('should handle save errors', async () => {
      const tabOrder = ['window1', 'window2'];
      const saveError = new Error('Save failed');

      mockPersistence.saveTabOrder.mockRejectedValue(saveError);
      const reorderHandler = ipcHandlers.get(IPC_CHANNELS.TABS_REORDER)!;

      await expect(
        reorderHandler(createMockEvent(), tabOrder)
      ).rejects.toThrow('Save failed');

      expect(mockPersistence.saveTabOrder).toHaveBeenCalledWith(tabOrder);
    });

    it('should return empty array when load fails', async () => {
      mockPersistence.loadTabOrder.mockRejectedValue(new Error('Load failed'));
      const getOrderHandler = ipcHandlers.get(IPC_CHANNELS.TABS_GET_ORDER)!;

      const result = await getOrderHandler(createMockEvent());

      expect(result).toEqual([]);
      expect(mockPersistence.loadTabOrder).toHaveBeenCalled();
    });
  });

  describe('App Visibility Flow', () => {
    it('should determine visibility based on frontmost app', async () => {
      const testCases = [
        { app: 'Visual Studio Code', expected: true },
        { app: 'Code', expected: true },
        { app: 'Chrome', expected: false },
        { app: '', expected: false }
      ];

      const shouldShowHandler = ipcHandlers.get(IPC_CHANNELS.APP_SHOULD_SHOW)!;

      for (const { app, expected } of testCases) {
        mockWindows.getFrontmostApp.mockResolvedValue(app);

        const result = await shouldShowHandler(createMockEvent());

        expect(result).toBe(expected);
        expect(mockWindows.getFrontmostApp).toHaveBeenCalled();
      }
    });

    it('should get frontmost app info directly', async () => {
      const expectedApp = 'Visual Studio Code';
      mockWindows.getFrontmostApp.mockResolvedValue(expectedApp);

      const frontmostHandler = ipcHandlers.get(IPC_CHANNELS.SYSTEM_FRONTMOST_APP)!;
      const result = await frontmostHandler(createMockEvent());

      expect(result).toBe(expectedApp);
      expect(mockWindows.getFrontmostApp).toHaveBeenCalled();
    });
  });

  describe('Window Resize Flow', () => {
    it('should resize windows with specified tab bar height', async () => {
      const tabBarHeight = 35;
      mockWindows.resizeVSCodeWindows.mockResolvedValue(undefined);

      const resizeHandler = ipcHandlers.get(IPC_CHANNELS.VSCODE_WINDOWS_RESIZE)!;
      await resizeHandler(createMockEvent(), tabBarHeight);

      expect(mockWindows.resizeVSCodeWindows).toHaveBeenCalledWith(tabBarHeight);
    });

    it('should handle resize errors', async () => {
      const tabBarHeight = 35;
      const resizeError = new Error('Resize failed');
      mockWindows.resizeVSCodeWindows.mockRejectedValue(resizeError);

      const resizeHandler = ipcHandlers.get(IPC_CHANNELS.VSCODE_WINDOWS_RESIZE)!;

      await expect(
        resizeHandler(createMockEvent(), tabBarHeight)
      ).rejects.toThrow('Resize failed');
    });
  });

  describe('IPC Handler Registration', () => {
    it('should register all required IPC handlers', () => {
      const expectedChannels = [
        IPC_CHANNELS.VSCODE_WINDOW_FOCUS,
        IPC_CHANNELS.TABS_REORDER,
        IPC_CHANNELS.TABS_GET_ORDER,
        IPC_CHANNELS.APP_SHOULD_SHOW,
        IPC_CHANNELS.SYSTEM_FRONTMOST_APP,
        IPC_CHANNELS.VSCODE_WINDOWS_RESIZE
      ];

      for (const channel of expectedChannels) {
        expect(mockIpcMain.handle).toHaveBeenCalledWith(channel, expect.any(Function));
        expect(ipcHandlers.has(channel)).toBe(true);
      }
    });
  });
});