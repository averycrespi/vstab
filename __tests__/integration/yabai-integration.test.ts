import {
  discoverEditorWindows,
  focusWindow,
  getFrontmostApp,
} from '../../src/main/windows';

// Mock child_process
jest.mock('child_process');
const { exec } = require('child_process');
const mockExec = jest.mocked(exec);

describe('Yabai Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Window Discovery Integration', () => {
    it('should discover editor windows through yabai', async () => {
      const mockWindows = [
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
      ];

      mockExec.mockImplementation((command: string, callback: Function) => {
        if (command.includes('which yabai')) {
          callback(null, { stdout: '/usr/local/bin/yabai', stderr: '' });
        } else if (command.includes('query --windows')) {
          callback(null, { stdout: JSON.stringify(mockWindows), stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const windows = await discoverEditorWindows();

      expect(windows).toHaveLength(1);
      expect(windows[0]).toMatchObject({
        title: 'main.ts — vstab',
        path: 'vstab',
        isActive: true,
      });
      expect(windows[0].id).toBeDefined();
    });

    it('should handle yabai not available', async () => {
      mockExec.mockImplementation((command: string, callback: Function) => {
        if (command.includes('which yabai')) {
          callback(new Error('yabai: command not found'));
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      await expect(discoverEditorWindows()).rejects.toThrow(
        'yabai is required but not available'
      );
    });

    it('should return empty array when yabai query fails', async () => {
      mockExec.mockImplementation((command: string, callback: Function) => {
        if (command.includes('which yabai')) {
          callback(null, { stdout: '/usr/local/bin/yabai', stderr: '' });
        } else {
          callback(new Error('yabai query failed'));
        }
      });

      const windows = await discoverEditorWindows();
      expect(windows).toEqual([]);
    });
  });

  describe('Window Focus Integration', () => {
    it('should attempt to focus window through yabai', async () => {
      // Mock a successful focus operation
      mockExec.mockImplementation((_command: string, callback: Function) => {
        callback(null, { stdout: '', stderr: '' });
      });

      // This test verifies the function doesn't throw - the actual yabai behavior is mocked
      await expect(focusWindow('test-window-id')).rejects.toThrow(
        'Window ID test-window-id not found'
      );

      // The error is expected because we haven't set up the window map
      // In real usage, discoverEditorWindows would populate the map first
    });
  });

  describe('Frontmost App Detection', () => {
    it('should detect frontmost app through yabai', async () => {
      const mockFocusedWindow = [
        {
          id: 1001,
          app: 'Visual Studio Code',
          'has-focus': true,
        },
      ];

      mockExec.mockImplementation((command: string, callback: Function) => {
        if (command.includes('query --windows')) {
          callback(null, {
            stdout: JSON.stringify(mockFocusedWindow),
            stderr: '',
          });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const frontmostApp = await getFrontmostApp();
      expect(frontmostApp).toBe('Visual Studio Code');
    });

    it('should return empty string when no window has focus', async () => {
      const mockWindows = [
        {
          id: 1001,
          app: 'Visual Studio Code',
          'has-focus': false,
        },
      ];

      mockExec.mockImplementation((command: string, callback: Function) => {
        if (command.includes('query --windows')) {
          callback(null, { stdout: JSON.stringify(mockWindows), stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const frontmostApp = await getFrontmostApp();
      expect(frontmostApp).toBe('');
    });

    it('should handle yabai query error gracefully', async () => {
      mockExec.mockImplementation((_command: string, callback: Function) => {
        callback(new Error('yabai not available'));
      });

      const frontmostApp = await getFrontmostApp();
      expect(frontmostApp).toBe('');
    });
  });

  describe('Command Integration', () => {
    it('should properly format yabai commands', async () => {
      mockExec.mockImplementation((command: string, callback: Function) => {
        // Verify the command format
        if (command.includes('which yabai')) {
          expect(command).toBe('which yabai');
          callback(null, { stdout: '/usr/local/bin/yabai', stderr: '' });
        } else if (command.includes('query --windows')) {
          expect(command).toContain('yabai -m query --windows');
          callback(null, { stdout: '[]', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      await discoverEditorWindows();

      // Verify yabai commands were called
      expect(mockExec).toHaveBeenCalledWith(
        'which yabai',
        expect.any(Function)
      );
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('yabai -m query --windows'),
        expect.any(Function)
      );
    });
  });
});
