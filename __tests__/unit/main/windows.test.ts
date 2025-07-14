import { createHash } from 'crypto';
import { 
  discoverVSCodeWindows, 
  focusWindow, 
  hideWindow, 
  getFrontmostApp, 
  resizeVSCodeWindows 
} from '../../../src/main/windows';

// Mock modules
jest.mock('child_process');
jest.mock('crypto');

// Setup mocks
const mockExec = require('child_process').exec;
const mockCreateHash = jest.mocked(createHash);

describe('Windows Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default crypto mock
    const mockHashInstance = {
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('abc12345')
    };
    mockCreateHash.mockReturnValue(mockHashInstance as any);
  });

  describe('discoverVSCodeWindows', () => {
    it('should throw error when yabai is not available', async () => {
      mockExec.mockImplementation((_cmd: string, callback: Function) => {
        callback(new Error('yabai: command not found'));
      });

      await expect(discoverVSCodeWindows()).rejects.toThrow(
        'yabai is required but not available'
      );
    });

    it('should discover VS Code windows successfully', async () => {
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
          'is-minimized': false
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
          'is-minimized': false
        }
      ];

      mockExec.mockImplementation((cmd: string, callback: Function) => {
        if (cmd.includes('which yabai')) {
          callback(null, { stdout: '/usr/local/bin/yabai', stderr: '' });
        } else if (cmd.includes('query --windows')) {
          callback(null, { stdout: JSON.stringify(mockYabaiWindows), stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const result = await discoverVSCodeWindows();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'abc12345',
        title: 'main.ts — vstab',
        path: 'vstab',
        isActive: true
      });
    });

    it('should return empty array when yabai query fails', async () => {
      mockExec.mockImplementation((cmd: string, callback: Function) => {
        if (cmd.includes('which yabai')) {
          callback(null, { stdout: '/usr/local/bin/yabai', stderr: '' });
        } else if (cmd.includes('query --windows')) {
          callback(new Error('yabai error'));
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const result = await discoverVSCodeWindows();
      expect(result).toEqual([]);
    });
  });

  describe('focusWindow', () => {
    it('should throw error for unknown window ID', async () => {
      await expect(focusWindow('unknown-id')).rejects.toThrow(
        'Window ID unknown-id not found in current window map'
      );
    });
  });

  describe('hideWindow', () => {
    it('should not actually hide windows but log the action', async () => {
      await expect(hideWindow('test-window-id')).resolves.toBeUndefined();
    });
  });

  describe('getFrontmostApp', () => {
    it('should return the frontmost app name', async () => {
      const mockWindows = [
        {
          id: 1001,
          app: 'Visual Studio Code',
          'has-focus': true
        }
      ];

      mockExec.mockImplementation((cmd: string, callback: Function) => {
        if (cmd.includes('query --windows')) {
          callback(null, { stdout: JSON.stringify(mockWindows), stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const result = await getFrontmostApp();
      expect(result).toBe('Visual Studio Code');
    });

    it('should return empty string when no window has focus', async () => {
      const mockWindows = [
        {
          id: 1001,
          app: 'Visual Studio Code',
          'has-focus': false
        }
      ];

      mockExec.mockImplementation((cmd: string, callback: Function) => {
        if (cmd.includes('query --windows')) {
          callback(null, { stdout: JSON.stringify(mockWindows), stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const result = await getFrontmostApp();
      expect(result).toBe('');
    });

    it('should handle yabai query error', async () => {
      mockExec.mockImplementation((_cmd: string, callback: Function) => {
        callback(new Error('yabai error'));
      });

      const result = await getFrontmostApp();
      expect(result).toBe('');
    });
  });

  describe('resizeVSCodeWindows', () => {
    it('should complete without error', async () => {
      mockExec.mockImplementation((cmd: string, callback: Function) => {
        if (cmd.includes('query --windows')) {
          callback(null, { stdout: JSON.stringify([]), stderr: '' });
        } else if (cmd.includes('query --displays')) {
          callback(null, { stdout: JSON.stringify([]), stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      await expect(resizeVSCodeWindows(35)).resolves.toBeUndefined();
    });
  });
});