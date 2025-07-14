import { renderHook, act } from '@testing-library/react';
import { useTabOrder } from '../../../../src/renderer/hooks/useTabOrder';
import { VSCodeWindow } from '../../../../src/shared/types';

// Mock the global window.vstab API
const mockVstab = {
  getTabOrder: jest.fn(),
  reorderTabs: jest.fn()
};

Object.defineProperty(window, 'vstab', {
  value: mockVstab,
  writable: true
});

describe('useTabOrder Hook', () => {
  const mockWindows: VSCodeWindow[] = [
    {
      id: 'window1',
      title: 'main.ts — vstab',
      path: 'vstab',
      isActive: true,
      position: { x: 0, y: 45, width: 1920, height: 1035 }
    },
    {
      id: 'window2',
      title: 'App.tsx — my-project',
      path: 'my-project',
      isActive: false,
      position: { x: 0, y: 45, width: 1920, height: 1035 }
    },
    {
      id: 'window3',
      title: 'utils.ts — helper-lib',
      path: 'helper-lib',
      isActive: false,
      position: { x: 0, y: 45, width: 1920, height: 1035 }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockVstab.getTabOrder.mockResolvedValue([]);
    mockVstab.reorderTabs.mockResolvedValue(undefined);
  });

  describe('Initial state', () => {
    it('should load saved tab order on mount', async () => {
      const savedOrder = ['window2', 'window1', 'window3'];
      mockVstab.getTabOrder.mockResolvedValue(savedOrder);

      const { result } = renderHook(() => useTabOrder(mockWindows));

      // Wait for useEffect to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockVstab.getTabOrder).toHaveBeenCalled();
      
      // Verify the windows are ordered according to saved order
      const orderedWindows = result.current.orderedWindows;
      expect(orderedWindows).toHaveLength(3);
      expect(orderedWindows[0].id).toBe('window2');
      expect(orderedWindows[1].id).toBe('window1');
      expect(orderedWindows[2].id).toBe('window3');
    });

    it('should return windows in natural order when no saved order exists', async () => {
      mockVstab.getTabOrder.mockResolvedValue([]);

      const { result } = renderHook(() => useTabOrder(mockWindows));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const orderedWindows = result.current.orderedWindows;
      expect(orderedWindows).toEqual(mockWindows);
    });

    it('should handle getTabOrder error gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockVstab.getTabOrder.mockRejectedValue(new Error('IPC Error'));

      const { result } = renderHook(() => useTabOrder(mockWindows));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Should fall back to natural order
      const orderedWindows = result.current.orderedWindows;
      expect(orderedWindows).toEqual(mockWindows);
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Window ordering logic', () => {
    it('should maintain saved order for existing windows', async () => {
      const savedOrder = ['window3', 'window1', 'window2'];
      mockVstab.getTabOrder.mockResolvedValue(savedOrder);

      const { result } = renderHook(() => useTabOrder(mockWindows));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const orderedWindows = result.current.orderedWindows;
      expect(orderedWindows.map(w => w.id)).toEqual(['window3', 'window1', 'window2']);
    });

    it('should append new windows to the end', async () => {
      const savedOrder = ['window1', 'window2'];
      mockVstab.getTabOrder.mockResolvedValue(savedOrder);

      const { result, rerender } = renderHook(
        ({ windows }) => useTabOrder(windows),
        { initialProps: { windows: mockWindows.slice(0, 2) } }
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Add a new window
      const newWindow: VSCodeWindow = {
        id: 'window4',
        title: 'new.ts — new-project',
        path: 'new-project',
        isActive: false,
        position: { x: 0, y: 45, width: 1920, height: 1035 }
      };

      rerender({ windows: [...mockWindows.slice(0, 2), newWindow] });

      const orderedWindows = result.current.orderedWindows;
      expect(orderedWindows.map(w => w.id)).toEqual(['window1', 'window2', 'window4']);
    });

    it('should auto-save order when new windows are added', async () => {
      const savedOrder = ['window1', 'window2'];
      mockVstab.getTabOrder.mockResolvedValue(savedOrder);

      const { rerender } = renderHook(
        ({ windows }) => useTabOrder(windows),
        { initialProps: { windows: mockWindows.slice(0, 2) } }
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      jest.clearAllMocks();

      // Add a new window
      const newWindow: VSCodeWindow = {
        id: 'window4',
        title: 'new.ts — new-project',
        path: 'new-project',
        isActive: false,
        position: { x: 0, y: 45, width: 1920, height: 1035 }
      };

      rerender({ windows: [...mockWindows.slice(0, 2), newWindow] });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockVstab.reorderTabs).toHaveBeenCalledWith(['window1', 'window2', 'window4']);
    });

    it('should skip closed windows from saved order', async () => {
      const savedOrder = ['window1', 'window2', 'window3', 'window4'];
      mockVstab.getTabOrder.mockResolvedValue(savedOrder);

      // Only provide windows 1 and 3 (2 and 4 are closed)
      const availableWindows = [mockWindows[0], mockWindows[2]];

      const { result } = renderHook(() => useTabOrder(availableWindows));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const orderedWindows = result.current.orderedWindows;
      expect(orderedWindows.map(w => w.id)).toEqual(['window1', 'window3']);
    });

    it('should handle empty windows array', async () => {
      const savedOrder = ['window1', 'window2'];
      mockVstab.getTabOrder.mockResolvedValue(savedOrder);

      const { result } = renderHook(() => useTabOrder([]));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const orderedWindows = result.current.orderedWindows;
      expect(orderedWindows).toEqual([]);
    });

    it('should handle single window', async () => {
      const savedOrder: string[] = [];
      mockVstab.getTabOrder.mockResolvedValue(savedOrder);

      const { result } = renderHook(() => useTabOrder([mockWindows[0]]));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const orderedWindows = result.current.orderedWindows;
      expect(orderedWindows).toEqual([mockWindows[0]]);
    });
  });

  describe('reorderWindows function', () => {
    it('should reorder windows and save to persistence', async () => {
      mockVstab.getTabOrder.mockResolvedValue([]);

      const { result } = renderHook(() => useTabOrder(mockWindows));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const newOrder = ['window3', 'window1', 'window2'];

      await act(async () => {
        await result.current.reorderWindows(newOrder);
      });

      expect(mockVstab.reorderTabs).toHaveBeenCalledWith(newOrder);
    });

    it('should handle reorder save error gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockVstab.getTabOrder.mockResolvedValue([]);
      mockVstab.reorderTabs.mockRejectedValue(new Error('Save failed'));

      const { result } = renderHook(() => useTabOrder(mockWindows));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const newOrder = ['window3', 'window1', 'window2'];

      // Should not throw despite save error
      await act(async () => {
        await result.current.reorderWindows(newOrder);
      });
      
      consoleErrorSpy.mockRestore();

      expect(mockVstab.reorderTabs).toHaveBeenCalledWith(newOrder);
    });

    it('should update local state immediately', async () => {
      mockVstab.getTabOrder.mockResolvedValue([]);

      const { result } = renderHook(() => useTabOrder(mockWindows));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const newOrder = ['window3', 'window1', 'window2'];

      await act(async () => {
        await result.current.reorderWindows(newOrder);
      });

      const orderedWindows = result.current.orderedWindows;
      expect(orderedWindows.map(w => w.id)).toEqual(newOrder);
    });

    it('should handle empty reorder', async () => {
      mockVstab.getTabOrder.mockResolvedValue([]);

      const { result } = renderHook(() => useTabOrder(mockWindows));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await act(async () => {
        await result.current.reorderWindows([]);
      });

      expect(mockVstab.reorderTabs).toHaveBeenCalledWith([]);
    });

    it('should handle partial reorder (subset of windows)', async () => {
      mockVstab.getTabOrder.mockResolvedValue([]);

      const { result } = renderHook(() => useTabOrder(mockWindows));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Only reorder two of the three windows
      const partialOrder = ['window2', 'window1'];

      await act(async () => {
        await result.current.reorderWindows(partialOrder);
      });

      expect(mockVstab.reorderTabs).toHaveBeenCalledWith(partialOrder);
    });
  });

  describe('React dependencies and updates', () => {
    it('should update when windows prop changes', async () => {
      mockVstab.getTabOrder.mockResolvedValue([]);

      const { result, rerender } = renderHook(
        ({ windows }) => useTabOrder(windows),
        { initialProps: { windows: mockWindows.slice(0, 2) } }
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.orderedWindows).toHaveLength(2);

      // Add another window
      rerender({ windows: mockWindows });

      expect(result.current.orderedWindows).toHaveLength(3);
    });

    it('should maintain stable function references', async () => {
      mockVstab.getTabOrder.mockResolvedValue([]);

      const { result, rerender } = renderHook(
        ({ windows }) => useTabOrder(windows),
        { initialProps: { windows: mockWindows } }
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const firstReorderFn = result.current.reorderWindows;

      rerender({ windows: mockWindows });

      const secondReorderFn = result.current.reorderWindows;

      expect(firstReorderFn).toBe(secondReorderFn);
    });
  });

  describe('Auto-save behavior', () => {
    it('should handle auto-save error gracefully', async () => {
      const savedOrder = ['window1'];
      mockVstab.getTabOrder.mockResolvedValue(savedOrder);
      mockVstab.reorderTabs.mockRejectedValue(new Error('Auto-save failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { rerender } = renderHook(
        ({ windows }) => useTabOrder(windows),
        { initialProps: { windows: [mockWindows[0]] } }
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Add a new window to trigger auto-save
      rerender({ windows: mockWindows });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Auto-save should have been attempted
      expect(mockVstab.reorderTabs).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });
});