import { renderHook, act } from '@testing-library/react';
import { useWindowVisibility } from '../../../../src/renderer/hooks/useWindowVisibility';

// Mock the global window.vstab API
const mockVstab = {
  getFrontmostApp: jest.fn(),
  getSettings: jest.fn().mockResolvedValue({
    theme: 'system',
    tabBarHeight: 45,
    autoHide: true,
    autoResizeVertical: true,
    autoResizeHorizontal: true,
    debugLogging: false,
  }),
  onSettingsChanged: jest.fn(),
  offSettingsChanged: jest.fn(),
  setWindowVisibility: jest.fn().mockResolvedValue(undefined),
};

Object.defineProperty(window, 'vstab', {
  value: mockVstab,
  writable: true,
});

describe('useWindowVisibility Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    mockVstab.getFrontmostApp.mockResolvedValue('Visual Studio Code');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.useFakeTimers();
  });

  describe('Initial state and setup', () => {
    it('should start with visible state as true', () => {
      const { result } = renderHook(() => useWindowVisibility());

      expect(result.current.isVisible).toBe(true);
    });

    it('should check visibility immediately on mount', async () => {
      mockVstab.getFrontmostApp.mockResolvedValue('Visual Studio Code');

      renderHook(() => useWindowVisibility());

      // Use real timers for this specific async operation
      jest.useRealTimers();
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      jest.useFakeTimers();

      expect(mockVstab.getFrontmostApp).toHaveBeenCalledTimes(1);
    });

    it('should set up polling interval', async () => {
      mockVstab.getFrontmostApp.mockResolvedValue('Visual Studio Code');

      renderHook(() => useWindowVisibility());

      // Wait for settings to load and initial check
      await act(async () => {
        await Promise.resolve();
      });

      // Advance timer by 250ms (actual interval used by hook)
      await act(async () => {
        jest.advanceTimersByTime(250);
        await Promise.resolve();
      });

      expect(mockVstab.getFrontmostApp).toHaveBeenCalledTimes(2);

      // Advance another 250ms
      await act(async () => {
        jest.advanceTimersByTime(250);
        await Promise.resolve();
      });

      expect(mockVstab.getFrontmostApp).toHaveBeenCalledTimes(3);
    });
  });

  describe('Visibility logic', () => {
    it('should be visible when Visual Studio Code is frontmost', async () => {
      mockVstab.getFrontmostApp.mockResolvedValue('Visual Studio Code');

      const { result } = renderHook(() => useWindowVisibility());

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isVisible).toBe(true);
    });

    it('should be visible when Code is frontmost', async () => {
      mockVstab.getFrontmostApp.mockResolvedValue('Code');

      const { result } = renderHook(() => useWindowVisibility());

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isVisible).toBe(true);
    });

    it('should be visible when vstab is frontmost', async () => {
      mockVstab.getFrontmostApp.mockResolvedValue('vstab');

      const { result } = renderHook(() => useWindowVisibility());

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isVisible).toBe(true);
    });

    it('should be visible when Electron is frontmost', async () => {
      mockVstab.getFrontmostApp.mockResolvedValue('Electron');

      const { result } = renderHook(() => useWindowVisibility());

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isVisible).toBe(true);
    });

    it('should be hidden when other app is frontmost', async () => {
      mockVstab.getFrontmostApp.mockResolvedValue('Chrome');

      const { result } = renderHook(() => useWindowVisibility());

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isVisible).toBe(false);
    });

    it('should be hidden when empty string is returned', async () => {
      mockVstab.getFrontmostApp.mockResolvedValue('');

      const { result } = renderHook(() => useWindowVisibility());

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isVisible).toBe(false);
    });

    it('should handle app names with Code in the middle', async () => {
      mockVstab.getFrontmostApp.mockResolvedValue('XCode');

      const { result } = renderHook(() => useWindowVisibility());

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isVisible).toBe(true);
    });

    it('should handle app names with vs code variants', async () => {
      const testCases = [
        'Visual Studio Code',
        'Visual Studio Code - Insiders',
        'Code - OSS',
        'VSCode',
        'code',
      ];

      for (const appName of testCases) {
        mockVstab.getFrontmostApp.mockResolvedValue(appName);

        const { result, unmount } = renderHook(() => useWindowVisibility());

        // Use real timers for async operations
        jest.useRealTimers();
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        });
        jest.useFakeTimers();

        expect(result.current.isVisible).toBe(true);

        // Clean up each hook instance
        unmount();

        // Clear the mock between iterations
        jest.clearAllMocks();
        mockVstab.getFrontmostApp.mockResolvedValue('Visual Studio Code');
      }
    });
  });

  describe('Dynamic visibility changes', () => {
    it('should update visibility when frontmost app changes', async () => {
      // First setup a successful call
      mockVstab.getFrontmostApp.mockResolvedValue('Visual Studio Code');

      const { result } = renderHook(() => useWindowVisibility());

      // Wait for initial setup and first check
      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isVisible).toBe(true);

      // Change to Chrome
      mockVstab.getFrontmostApp.mockResolvedValue('Chrome');

      await act(async () => {
        jest.advanceTimersByTime(250);
        await Promise.resolve();
      });

      expect(result.current.isVisible).toBe(false);

      // Change back to Code
      mockVstab.getFrontmostApp.mockResolvedValue('Code');

      await act(async () => {
        jest.advanceTimersByTime(250);
        await Promise.resolve();
      });

      expect(result.current.isVisible).toBe(true);
    });

    it('should handle rapid app switching', async () => {
      const { result } = renderHook(() => useWindowVisibility());

      const apps = [
        'Visual Studio Code',
        'Chrome',
        'Code',
        'Safari',
        'Electron',
      ];
      const expectedVisibility = [true, false, true, false, true];

      for (let i = 0; i < apps.length; i++) {
        mockVstab.getFrontmostApp.mockResolvedValue(apps[i]);

        await act(async () => {
          jest.advanceTimersByTime(500);
          await Promise.resolve();
        });

        expect(result.current.isVisible).toBe(expectedVisibility[i]);
      }
    });
  });

  describe('Error handling', () => {
    it('should handle API errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockVstab.getFrontmostApp.mockRejectedValue(new Error('IPC Error'));

      const { result } = renderHook(() => useWindowVisibility());

      // Wait for settings to load and initial error to occur
      await act(async () => {
        await Promise.resolve();
      });

      // Advance timers to trigger all retry attempts
      // Initial error happens immediately, then 2 retries at 100ms each
      await act(async () => {
        jest.advanceTimersByTime(100); // First retry
        await Promise.resolve();
      });
      await act(async () => {
        jest.advanceTimersByTime(100); // Second retry
        await Promise.resolve();
      });
      await act(async () => {
        jest.advanceTimersByTime(1); // Final error logging
        await Promise.resolve();
      });

      // Should maintain initial state when error occurs
      expect(result.current.isVisible).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error checking visibility after retries:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should continue polling after errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Clear the default mock and set up specific behavior
      mockVstab.getFrontmostApp.mockReset();
      mockVstab.getFrontmostApp.mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => useWindowVisibility());

      // Initial state should be true
      expect(result.current.isVisible).toBe(true);

      // Wait for initial async call to fail and all retries to complete
      await act(async () => {
        await Promise.resolve(); // Wait for settings and initial call
      });

      // Advance timers to trigger all retry attempts
      await act(async () => {
        jest.advanceTimersByTime(100); // First retry
        await Promise.resolve();
      });
      await act(async () => {
        jest.advanceTimersByTime(100); // Second retry
        await Promise.resolve();
      });

      // State should remain true since error doesn't change it
      expect(result.current.isVisible).toBe(true); // Should maintain initial state after error
      expect(consoleErrorSpy).toHaveBeenCalled(); // Should have logged error

      // Now set up successful response for next call
      mockVstab.getFrontmostApp.mockResolvedValue('Chrome');

      // Advance time to trigger next poll which should succeed
      await act(async () => {
        jest.advanceTimersByTime(250);
        await Promise.resolve(); // Allow promise to resolve
      });

      expect(result.current.isVisible).toBe(false); // Should update based on Chrome
      expect(mockVstab.getFrontmostApp).toHaveBeenCalledTimes(4); // 1 initial + 3 retries

      consoleErrorSpy.mockRestore();
    });

    it('should handle promise rejection during polling', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useWindowVisibility());

      // First check succeeds
      mockVstab.getFrontmostApp.mockResolvedValue('Visual Studio Code');

      // Wait for initial setup and first check
      await act(async () => {
        await Promise.resolve(); // Allow promise to resolve
      });

      expect(result.current.isVisible).toBe(true);

      // Second check fails
      mockVstab.getFrontmostApp.mockRejectedValue(new Error('Polling error'));

      // Advance time to trigger next poll and all retry attempts
      await act(async () => {
        jest.advanceTimersByTime(250); // Trigger next poll
        await Promise.resolve();
      });

      // Advance timers to trigger all retry attempts
      await act(async () => {
        jest.advanceTimersByTime(100); // First retry
        await Promise.resolve();
      });
      await act(async () => {
        jest.advanceTimersByTime(100); // Second retry
        await Promise.resolve();
      });

      // State should remain unchanged
      expect(result.current.isVisible).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Cleanup', () => {
    it('should clear interval on unmount', async () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      const { unmount } = renderHook(() => useWindowVisibility());

      await act(async () => {
        await Promise.resolve();
      });

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });

    it('should stop polling after unmount', async () => {
      mockVstab.getFrontmostApp.mockResolvedValue('Visual Studio Code');

      const { unmount } = renderHook(() => useWindowVisibility());

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockVstab.getFrontmostApp).toHaveBeenCalledTimes(1);

      unmount();

      // Advance timers - should not trigger more calls
      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      expect(mockVstab.getFrontmostApp).toHaveBeenCalledTimes(1);
    });

    it('should handle cleanup when interval was not set', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      // Mock setInterval to return undefined
      const originalSetInterval = global.setInterval;
      global.setInterval = jest.fn().mockReturnValue(undefined);

      const { unmount } = renderHook(() => useWindowVisibility());

      // Should not throw when unmounting
      expect(() => unmount()).not.toThrow();

      global.setInterval = originalSetInterval;
      clearIntervalSpy.mockRestore();
    });
  });

  describe('Timing behavior', () => {
    it('should poll at 250ms intervals exactly', async () => {
      mockVstab.getFrontmostApp.mockResolvedValue('Visual Studio Code');

      renderHook(() => useWindowVisibility());

      // Initial call (after settings load)
      await act(async () => {
        await Promise.resolve();
      });
      expect(mockVstab.getFrontmostApp).toHaveBeenCalledTimes(1);

      // 250ms - new call
      await act(async () => {
        jest.advanceTimersByTime(250);
        await Promise.resolve();
      });
      expect(mockVstab.getFrontmostApp).toHaveBeenCalledTimes(2);

      // 500ms total - another call
      await act(async () => {
        jest.advanceTimersByTime(250);
        await Promise.resolve();
      });
      expect(mockVstab.getFrontmostApp).toHaveBeenCalledTimes(3);

      // 750ms total - another call
      await act(async () => {
        jest.advanceTimersByTime(250);
        await Promise.resolve();
      });
      expect(mockVstab.getFrontmostApp).toHaveBeenCalledTimes(4);
    });

    it('should handle slow API responses', async () => {
      let resolveCount = 0;
      const resolvers: Array<(value: string) => void> = [];

      mockVstab.getFrontmostApp.mockImplementation(
        () =>
          new Promise(resolve => {
            resolvers[resolveCount++] = resolve;
          })
      );

      const { result } = renderHook(() => useWindowVisibility());

      // Start first call
      await act(async () => {
        await Promise.resolve();
      });

      // Advance timer to trigger second call before first resolves
      await act(async () => {
        jest.advanceTimersByTime(250);
        await Promise.resolve();
      });

      expect(mockVstab.getFrontmostApp).toHaveBeenCalledTimes(2);

      // Resolve first call
      await act(async () => {
        resolvers[0]('Visual Studio Code');
        await Promise.resolve();
      });

      expect(result.current.isVisible).toBe(true);

      // Resolve second call with different result
      await act(async () => {
        resolvers[1]('Chrome');
        await Promise.resolve();
      });

      expect(result.current.isVisible).toBe(false);
    });
  });
});
