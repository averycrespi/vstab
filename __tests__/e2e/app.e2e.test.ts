/**
 * End-to-End Tests for vstab Application
 * 
 * These tests simulate complete user workflows by testing the interaction
 * between main and renderer processes, yabai integration, and file persistence.
 */

import { ipcMain, ipcRenderer } from 'electron-mock-ipc';
import { setupIPCHandlers } from '../../src/main/ipc';
import { VSCodeWindow } from '../../src/shared/types';
import { IPC_CHANNELS } from '../../src/shared/ipc-channels';
import { yabaiMock } from '../__mocks__/yabai';
import { fsMock } from '../__mocks__/fs';

// Mock dependencies
jest.mock('child_process');
jest.mock('fs/promises');
jest.mock('crypto');
jest.mock('electron', () => require('../__mocks__/electron'));

const mockExec = jest.fn();
require('child_process').exec = mockExec;

// Mock crypto for consistent hashing
const mockCreateHash = require('crypto').createHash;

describe('vstab E2E Workflows', () => {
  let mockMainWindow: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset all mocks to default state
    yabaiMock.resetToDefaults();
    fsMock.reset();
    
    // Setup consistent crypto mocking
    let hashCounter = 0;
    mockCreateHash.mockImplementation(() => ({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn(() => `hash${hashCounter++}`)
    }));
    
    // Setup mockExec to use yabaiMock
    mockExec.mockImplementation((command: string, callback: Function) => {
      try {
        const result = yabaiMock.executeCommand(command);
        callback(null, result);
      } catch (error) {
        callback(error);
      }
    });

    // Setup mock main window
    mockMainWindow = { webContents: { send: jest.fn() } };
    
    // Setup IPC handlers
    setupIPCHandlers(mockMainWindow);
  });

  afterEach(() => {
    ipcMain.removeAllListeners();
    ipcRenderer.removeAllListeners();
  });

  describe('Complete Tab Switching Workflow', () => {
    it('should discover windows, save order, and focus windows', async () => {
      // Step 1: Discover VS Code windows
      const windows = await ipcRenderer.invoke(IPC_CHANNELS.VSCODE_WINDOWS_LIST);
      
      expect(windows).toHaveLength(2);
      expect(windows[0]).toMatchObject({
        id: 'hash0',
        title: 'main.ts — vstab',
        path: 'vstab',
        isActive: true
      });
      expect(windows[1]).toMatchObject({
        id: 'hash1',
        title: 'App.tsx — my-project',
        path: 'my-project',
        isActive: false
      });

      // Step 2: Save initial tab order
      const initialOrder = windows.map((w: VSCodeWindow) => w.id);
      await ipcRenderer.invoke(IPC_CHANNELS.TABS_REORDER, initialOrder);

      // Verify order was saved to file system
      expect(fsMock.hasFile('/tmp/test-userData/tab-order.json')).toBe(true);
      const savedContent = fsMock.getFileContent('/tmp/test-userData/tab-order.json');
      expect(JSON.parse(savedContent as string)).toEqual(initialOrder);

      // Step 3: Focus second window
      await ipcRenderer.invoke(IPC_CHANNELS.VSCODE_WINDOW_FOCUS, windows[1].id);

      // Verify window was focused in yabai
      expect(yabaiMock.getFocusedWindow()?.id).toBe(1002);
      
      // Verify command history
      const commands = yabaiMock.getCommandHistory();
      expect(commands).toContain('yabai -m window --focus 1002');

      // Step 4: Reorder tabs (drag and drop simulation)
      const newOrder = [windows[1].id, windows[0].id]; // Swap order
      await ipcRenderer.invoke(IPC_CHANNELS.TABS_REORDER, newOrder);

      // Step 5: Verify new order was persisted
      const newSavedContent = fsMock.getFileContent('/tmp/test-userData/tab-order.json');
      expect(JSON.parse(newSavedContent as string)).toEqual(newOrder);

      // Step 6: Load tab order (simulating app restart)
      const loadedOrder = await ipcRenderer.invoke(IPC_CHANNELS.TABS_GET_ORDER);
      expect(loadedOrder).toEqual(newOrder);
    });

    it('should handle window closure and reopening workflow', async () => {
      // Initial discovery
      let windows = await ipcRenderer.invoke(IPC_CHANNELS.VSCODE_WINDOWS_LIST);
      expect(windows).toHaveLength(2);

      // Save initial order
      const initialOrder = windows.map((w: VSCodeWindow) => w.id);
      await ipcRenderer.invoke(IPC_CHANNELS.TABS_REORDER, initialOrder);

      // Simulate window closure (remove from yabai)
      yabaiMock.removeWindow(1002);

      // Discover windows again
      windows = await ipcRenderer.invoke(IPC_CHANNELS.VSCODE_WINDOWS_LIST);
      expect(windows).toHaveLength(1);
      expect(windows[0].id).toBe('hash0'); // Only first window remains

      // Load saved order (should still contain closed window)
      const savedOrder = await ipcRenderer.invoke(IPC_CHANNELS.TABS_GET_ORDER);
      expect(savedOrder).toEqual(initialOrder);

      // Simulate window reopening (add back to yabai)
      yabaiMock.addWindow({
        id: 1002,
        pid: 12346,
        app: 'Visual Studio Code',
        title: 'App.tsx — my-project',
        frame: { x: 0, y: 45, w: 1920, h: 1035 },
        space: 1,
        display: 1,
        'has-focus': false,
        'is-visible': true,
        'is-minimized': false
      });

      // Discover windows again
      windows = await ipcRenderer.invoke(IPC_CHANNELS.VSCODE_WINDOWS_LIST);
      expect(windows).toHaveLength(2);
    });
  });

  describe('Auto-Hide Behavior Workflow', () => {
    it('should show/hide based on frontmost application', async () => {
      // Initially, VS Code is frontmost
      let shouldShow = await ipcRenderer.invoke(IPC_CHANNELS.APP_SHOULD_SHOW);
      expect(shouldShow).toBe(true);

      let frontmostApp = await ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_FRONTMOST_APP);
      expect(frontmostApp).toBe('Visual Studio Code');

      // Switch to Chrome
      const chromeWindow = {
        id: 9001,
        app: 'Chrome',
        title: 'Google',
        'has-focus': true,
        'is-visible': true,
        'is-minimized': false,
        frame: { x: 0, y: 45, w: 1920, h: 1035 },
        space: 1,
        display: 1,
        pid: 99999
      };

      // Update yabai state
      const currentWindows = yabaiMock.getVSCodeWindows();
      currentWindows.forEach(w => w['has-focus'] = false);
      yabaiMock.addWindow(chromeWindow);

      shouldShow = await ipcRenderer.invoke(IPC_CHANNELS.APP_SHOULD_SHOW);
      expect(shouldShow).toBe(false);

      frontmostApp = await ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_FRONTMOST_APP);
      expect(frontmostApp).toBe('Chrome');

      // Switch back to VS Code
      yabaiMock.removeWindow(9001);
      currentWindows[0]['has-focus'] = true;

      shouldShow = await ipcRenderer.invoke(IPC_CHANNELS.APP_SHOULD_SHOW);
      expect(shouldShow).toBe(true);

      frontmostApp = await ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_FRONTMOST_APP);
      expect(frontmostApp).toBe('Visual Studio Code');
    });

    it('should handle different VS Code variants', async () => {
      const vsCodeVariants = [
        'Visual Studio Code',
        'Code',
        'Visual Studio Code - Insiders',
        'Code - OSS'
      ];

      for (const variant of vsCodeVariants) {
        // Update frontmost app
        const windows = yabaiMock.getVSCodeWindows();
        windows[0].app = variant;
        windows[0]['has-focus'] = true;
        windows.forEach((w, i) => w['has-focus'] = i === 0);

        const shouldShow = await ipcRenderer.invoke(IPC_CHANNELS.APP_SHOULD_SHOW);
        expect(shouldShow).toBe(true);

        const frontmostApp = await ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_FRONTMOST_APP);
        expect(frontmostApp).toBe(variant);
      }
    });
  });

  describe('Window Resize Workflow', () => {
    it('should resize windows when tab bar height changes', async () => {
      const tabBarHeights = [30, 35, 40, 50];

      for (const height of tabBarHeights) {
        yabaiMock.clearCommandHistory();

        await ipcRenderer.invoke(IPC_CHANNELS.VSCODE_WINDOWS_RESIZE, height);

        const commands = yabaiMock.getCommandHistory();
        
        // Should query windows and displays
        expect(commands.some(cmd => cmd.includes('query --windows'))).toBe(true);
        expect(commands.some(cmd => cmd.includes('query --displays'))).toBe(true);

        // Calculate expected values
        const expectedY = height + 10; // height + buffer
        const expectedHeight = 1080 - expectedY;

        // Should resize both VS Code windows
        expect(commands.some(cmd => 
          cmd.includes(`window 1001 --move abs:0:${expectedY}`)
        )).toBe(true);
        expect(commands.some(cmd => 
          cmd.includes(`window 1001 --resize abs:1920:${expectedHeight}`)
        )).toBe(true);
        expect(commands.some(cmd => 
          cmd.includes(`window 1002 --move abs:0:${expectedY}`)
        )).toBe(true);
        expect(commands.some(cmd => 
          cmd.includes(`window 1002 --resize abs:1920:${expectedHeight}`)
        )).toBe(true);
      }
    });

    it('should handle resize errors with fallback', async () => {
      // Mock exec to fail on initial resize but succeed on fallback
      mockExec.mockImplementation((command: string, callback: Function) => {
        if (command.includes('which yabai')) {
          callback(null, { stdout: '/usr/local/bin/yabai', stderr: '' });
        } else if (command.includes('query --windows')) {
          callback(null, { stdout: JSON.stringify(yabaiMock.getVSCodeWindows()), stderr: '' });
        } else if (command.includes('query --displays')) {
          callback(null, { stdout: JSON.stringify([{
            index: 1,
            frame: { x: 0, y: 0, w: 1920, h: 1080 }
          }]), stderr: '' });
        } else if (command.includes('--move') || command.includes('--resize')) {
          if (command.includes('--grid')) {
            callback(null, { stdout: '', stderr: '' }); // Grid fallback succeeds
          } else {
            callback(new Error('Initial resize failed'));
          }
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      // Should complete without throwing
      await expect(
        ipcRenderer.invoke(IPC_CHANNELS.VSCODE_WINDOWS_RESIZE, 35)
      ).resolves.toBeUndefined();
    });
  });

  describe('Persistence Workflow', () => {
    it('should handle complex tab order persistence scenarios', async () => {
      // Scenario 1: Save complex order
      const complexOrder = ['hash2', 'hash0', 'hash1', 'hash3'];
      await ipcRenderer.invoke(IPC_CHANNELS.TABS_REORDER, complexOrder);

      let loadedOrder = await ipcRenderer.invoke(IPC_CHANNELS.TABS_GET_ORDER);
      expect(loadedOrder).toEqual(complexOrder);

      // Scenario 2: Empty order
      await ipcRenderer.invoke(IPC_CHANNELS.TABS_REORDER, []);
      loadedOrder = await ipcRenderer.invoke(IPC_CHANNELS.TABS_GET_ORDER);
      expect(loadedOrder).toEqual([]);

      // Scenario 3: Single window
      const singleOrder = ['hash1'];
      await ipcRenderer.invoke(IPC_CHANNELS.TABS_REORDER, singleOrder);
      loadedOrder = await ipcRenderer.invoke(IPC_CHANNELS.TABS_GET_ORDER);
      expect(loadedOrder).toEqual(singleOrder);

      // Scenario 4: Very long order
      const longOrder = Array.from({ length: 100 }, (_, i) => `hash${i}`);
      await ipcRenderer.invoke(IPC_CHANNELS.TABS_REORDER, longOrder);
      loadedOrder = await ipcRenderer.invoke(IPC_CHANNELS.TABS_GET_ORDER);
      expect(loadedOrder).toEqual(longOrder);
    });

    it('should handle file system errors gracefully', async () => {
      // Mock file system to fail
      fsMock.writeFile.mockRejectedValue(new Error('Disk full'));

      await expect(
        ipcRenderer.invoke(IPC_CHANNELS.TABS_REORDER, ['hash0', 'hash1'])
      ).rejects.toThrow('Disk full');

      // Mock file system to fail on read
      fsMock.readFile.mockRejectedValue(new Error('File not found'));

      const loadedOrder = await ipcRenderer.invoke(IPC_CHANNELS.TABS_GET_ORDER);
      expect(loadedOrder).toEqual([]);
    });
  });

  describe('Error Recovery Workflows', () => {
    it('should recover from yabai temporary failures', async () => {
      let callCount = 0;

      // Mock exec to fail first few times
      mockExec.mockImplementation((command: string, callback: Function) => {
        callCount++;

        if (command.includes('which yabai')) {
          callback(null, { stdout: '/usr/local/bin/yabai', stderr: '' });
        } else if (command.includes('query --windows')) {
          if (callCount <= 2) {
            callback(new Error('Temporary failure'));
          } else {
            callback(null, { stdout: JSON.stringify(yabaiMock.getVSCodeWindows()), stderr: '' });
          }
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      // First call should return empty array
      let windows = await ipcRenderer.invoke(IPC_CHANNELS.VSCODE_WINDOWS_LIST);
      expect(windows).toEqual([]);

      // Reset call count for second call
      callCount = 0;

      // Second call should also fail
      windows = await ipcRenderer.invoke(IPC_CHANNELS.VSCODE_WINDOWS_LIST);
      expect(windows).toEqual([]);

      // Reset call count for third call
      callCount = 0;

      // Third call should succeed
      windows = await ipcRenderer.invoke(IPC_CHANNELS.VSCODE_WINDOWS_LIST);
      expect(windows).toHaveLength(2);
    });

    it('should handle mixed success/failure scenarios', async () => {
      // Test where some IPC calls succeed and others fail
      const results = await Promise.allSettled([
        ipcRenderer.invoke(IPC_CHANNELS.VSCODE_WINDOWS_LIST), // Should succeed
        ipcRenderer.invoke(IPC_CHANNELS.TABS_GET_ORDER), // Should succeed (empty array)
        ipcRenderer.invoke(IPC_CHANNELS.APP_SHOULD_SHOW), // Should succeed
        ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_FRONTMOST_APP) // Should succeed
      ]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled');
      expect(results[2].status).toBe('fulfilled');
      expect(results[3].status).toBe('fulfilled');

      expect((results[0] as any).value).toHaveLength(2);
      expect((results[1] as any).value).toEqual([]);
      expect((results[2] as any).value).toBe(true);
      expect((results[3] as any).value).toBe('Visual Studio Code');
    });
  });

  describe('Complete Application Lifecycle', () => {
    it('should simulate complete app usage session', async () => {
      // 1. App startup - discover windows
      const initialWindows = await ipcRenderer.invoke(IPC_CHANNELS.VSCODE_WINDOWS_LIST);
      expect(initialWindows).toHaveLength(2);

      // 2. Initial resize on startup
      await ipcRenderer.invoke(IPC_CHANNELS.VSCODE_WINDOWS_RESIZE, 35);

      // 3. Check if app should be visible
      let shouldShow = await ipcRenderer.invoke(IPC_CHANNELS.APP_SHOULD_SHOW);
      expect(shouldShow).toBe(true);

      // 4. User clicks on second tab
      await ipcRenderer.invoke(IPC_CHANNELS.VSCODE_WINDOW_FOCUS, initialWindows[1].id);

      // 5. User drags first tab to second position
      const newOrder = [initialWindows[1].id, initialWindows[0].id];
      await ipcRenderer.invoke(IPC_CHANNELS.TABS_REORDER, newOrder);

      // 6. User switches to another app
      yabaiMock.addWindow({
        id: 8001,
        app: 'Chrome',
        title: 'Web Page',
        'has-focus': true,
        'is-visible': true,
        'is-minimized': false,
        frame: { x: 0, y: 45, w: 1920, h: 1035 },
        space: 1,
        display: 1,
        pid: 88888
      });
      yabaiMock.getVSCodeWindows().forEach(w => w['has-focus'] = false);

      shouldShow = await ipcRenderer.invoke(IPC_CHANNELS.APP_SHOULD_SHOW);
      expect(shouldShow).toBe(false);

      // 7. User switches back to VS Code
      yabaiMock.removeWindow(8001);
      yabaiMock.focusWindow(1002);

      shouldShow = await ipcRenderer.invoke(IPC_CHANNELS.APP_SHOULD_SHOW);
      expect(shouldShow).toBe(true);

      // 8. User opens new VS Code window
      yabaiMock.addWindow({
        id: 1003,
        pid: 12347,
        app: 'Visual Studio Code',
        title: 'new-file.ts — new-project',
        frame: { x: 0, y: 45, w: 1920, h: 1035 },
        space: 1,
        display: 1,
        'has-focus': true,
        'is-visible': true,
        'is-minimized': false
      });

      const updatedWindows = await ipcRenderer.invoke(IPC_CHANNELS.VSCODE_WINDOWS_LIST);
      expect(updatedWindows).toHaveLength(3);

      // 9. Load saved tab order (should still be persisted)
      const savedOrder = await ipcRenderer.invoke(IPC_CHANNELS.TABS_GET_ORDER);
      expect(savedOrder).toEqual(newOrder);

      // 10. Save new order including the new window
      const finalOrder = [...newOrder, updatedWindows[2].id];
      await ipcRenderer.invoke(IPC_CHANNELS.TABS_REORDER, finalOrder);

      // 11. Verify final state
      const finalSavedOrder = await ipcRenderer.invoke(IPC_CHANNELS.TABS_GET_ORDER);
      expect(finalSavedOrder).toEqual(finalOrder);

      // Verify persistence
      expect(fsMock.hasFile('/tmp/test-userData/tab-order.json')).toBe(true);
      const finalContent = fsMock.getFileContent('/tmp/test-userData/tab-order.json');
      expect(JSON.parse(finalContent as string)).toEqual(finalOrder);
    });
  });
});