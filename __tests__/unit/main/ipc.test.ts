// Mock modules first
jest.mock('electron');
jest.mock('../../../src/main/windows');
jest.mock('../../../src/main/persistence');

import { ipcMain, BrowserWindow } from 'electron';
import { setupIPCHandlers } from '../../../src/main/ipc';
import { IPC_CHANNELS } from '../../../src/shared/ipc-channels';
import * as windows from '../../../src/main/windows';
import * as persistence from '../../../src/main/persistence';

const mockIpcMain = jest.mocked(ipcMain);

// Create proper mocks for the modules
const mockFocusWindow = jest.fn();
const mockGetFrontmostApp = jest.fn();
const mockResizeEditorWindows = jest.fn();
const mockLoadTabOrder = jest.fn();
const mockSaveTabOrder = jest.fn();

// Setup the mocks on the modules
Object.assign(windows, {
  focusWindow: mockFocusWindow,
  getFrontmostApp: mockGetFrontmostApp,
  resizeEditorWindows: mockResizeEditorWindows,
});

Object.assign(persistence, {
  loadTabOrder: mockLoadTabOrder,
  saveTabOrder: mockSaveTabOrder,
});

describe('IPC Module', () => {
  let mockMainWindow: BrowserWindow;
  let ipcHandlers: Map<string, Function>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMainWindow = new BrowserWindow();
    ipcHandlers = new Map();

    mockIpcMain.handle.mockImplementation(
      (channel: string, handler: Function) => {
        ipcHandlers.set(channel, handler);
      }
    );

    setupIPCHandlers(mockMainWindow);
  });

  describe('setupIPCHandlers', () => {
    it('should register all IPC handlers', () => {
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        IPC_CHANNELS.EDITOR_WINDOW_FOCUS,
        expect.any(Function)
      );
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        IPC_CHANNELS.TABS_REORDER,
        expect.any(Function)
      );
      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        IPC_CHANNELS.TABS_GET_ORDER,
        expect.any(Function)
      );
    });
  });

  describe('EDITOR_WINDOW_FOCUS handler', () => {
    let focusHandler: Function;

    beforeEach(() => {
      focusHandler = ipcHandlers.get(IPC_CHANNELS.EDITOR_WINDOW_FOCUS)!;
    });

    it('should focus window successfully', async () => {
      const targetWindowId = 'window1';

      mockFocusWindow.mockResolvedValue(undefined);

      const mockEvent = { sender: { send: jest.fn() } };

      await focusHandler(mockEvent, targetWindowId);

      expect(mockFocusWindow).toHaveBeenCalledWith(targetWindowId);
    });

    it('should handle focus errors', async () => {
      const targetWindowId = 'invalid-window';
      const focusError = new Error('Window not found');

      mockFocusWindow.mockRejectedValue(focusError);

      const mockEvent = { sender: { send: jest.fn() } };

      await expect(focusHandler(mockEvent, targetWindowId)).rejects.toThrow(
        'Window not found'
      );

      expect(mockFocusWindow).toHaveBeenCalledWith(targetWindowId);
    });
  });

  describe('TABS_REORDER handler', () => {
    let reorderHandler: Function;

    beforeEach(() => {
      reorderHandler = ipcHandlers.get(IPC_CHANNELS.TABS_REORDER)!;
    });

    it('should save tab order successfully', async () => {
      const windowIds = ['window1', 'window2', 'window3'];
      mockSaveTabOrder.mockResolvedValue(undefined);

      const mockEvent = { sender: { send: jest.fn() } };

      await reorderHandler(mockEvent, windowIds);

      expect(mockSaveTabOrder).toHaveBeenCalledWith(windowIds);
    });

    it('should handle save error', async () => {
      const windowIds = ['window1', 'window2'];
      const saveError = new Error('Save failed');
      mockSaveTabOrder.mockRejectedValue(saveError);

      const mockEvent = { sender: { send: jest.fn() } };

      await expect(reorderHandler(mockEvent, windowIds)).rejects.toThrow(
        'Save failed'
      );

      expect(mockSaveTabOrder).toHaveBeenCalledWith(windowIds);
    });
  });

  describe('TABS_GET_ORDER handler', () => {
    let getOrderHandler: Function;

    beforeEach(() => {
      getOrderHandler = ipcHandlers.get(IPC_CHANNELS.TABS_GET_ORDER)!;
    });

    it('should load tab order successfully', async () => {
      const expectedOrder = ['window1', 'window2', 'window3'];
      mockLoadTabOrder.mockResolvedValue(expectedOrder);

      const mockEvent = { sender: { send: jest.fn() } };

      const result = await getOrderHandler(mockEvent);

      expect(mockLoadTabOrder).toHaveBeenCalled();
      expect(result).toEqual(expectedOrder);
    });

    it('should return empty array when load fails', async () => {
      mockLoadTabOrder.mockRejectedValue(new Error('Load failed'));

      const mockEvent = { sender: { send: jest.fn() } };

      const result = await getOrderHandler(mockEvent);

      expect(mockLoadTabOrder).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('APP_SHOULD_SHOW handler', () => {
    let shouldShowHandler: Function;

    beforeEach(() => {
      shouldShowHandler = ipcHandlers.get(IPC_CHANNELS.APP_SHOULD_SHOW)!;
    });

    it('should return true when editor is frontmost', async () => {
      mockGetFrontmostApp.mockResolvedValue('Visual Studio Code');

      const mockEvent = { sender: { send: jest.fn() } };

      const result = await shouldShowHandler(mockEvent);

      expect(mockGetFrontmostApp).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when other app is frontmost', async () => {
      mockGetFrontmostApp.mockResolvedValue('Chrome');

      const mockEvent = { sender: { send: jest.fn() } };

      const result = await shouldShowHandler(mockEvent);

      expect(result).toBe(false);
    });
  });

  describe('EDITOR_WINDOWS_RESIZE handler', () => {
    let resizeHandler: Function;

    beforeEach(() => {
      resizeHandler = ipcHandlers.get(IPC_CHANNELS.EDITOR_WINDOWS_RESIZE)!;
    });

    it('should resize windows successfully', async () => {
      const tabBarHeight = 30;
      mockResizeEditorWindows.mockResolvedValue(undefined);

      const mockEvent = { sender: { send: jest.fn() } };

      await resizeHandler(mockEvent, tabBarHeight);

      expect(mockResizeEditorWindows).toHaveBeenCalledWith(tabBarHeight);
    });

    it('should handle resize error', async () => {
      const tabBarHeight = 30;
      const resizeError = new Error('Resize failed');
      mockResizeEditorWindows.mockRejectedValue(resizeError);

      const mockEvent = { sender: { send: jest.fn() } };

      await expect(resizeHandler(mockEvent, tabBarHeight)).rejects.toThrow(
        'Resize failed'
      );

      expect(mockResizeEditorWindows).toHaveBeenCalledWith(tabBarHeight);
    });
  });
});
