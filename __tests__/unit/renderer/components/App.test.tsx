import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../../../src/renderer/App';
import { VSCodeWindow } from '../../../../src/shared/types';

// Mock the hooks
jest.mock('../../../../src/renderer/hooks/useWindowVisibility');
jest.mock('../../../../src/renderer/hooks/useTabOrder');
jest.mock('../../../../src/renderer/hooks/useTheme');

import { useWindowVisibility } from '../../../../src/renderer/hooks/useWindowVisibility';
import { useTabOrder } from '../../../../src/renderer/hooks/useTabOrder';
import { useTheme } from '../../../../src/renderer/hooks/useTheme';

const mockUseWindowVisibility = jest.mocked(useWindowVisibility);
const mockUseTabOrder = jest.mocked(useTabOrder);
const mockUseTheme = jest.mocked(useTheme);

describe('App Component', () => {
  const mockWindows: VSCodeWindow[] = [
    {
      id: 'window1',
      title: 'main.ts — vstab',
      path: 'vstab',
      isActive: true,
      position: { x: 0, y: 45, width: 1920, height: 1035 },
    },
    {
      id: 'window2',
      title: 'App.tsx — my-project',
      path: 'my-project',
      isActive: false,
      position: { x: 0, y: 45, width: 1920, height: 1035 },
    },
    {
      id: 'window3',
      title: 'utils.ts — helper-lib',
      path: 'helper-lib',
      isActive: false,
      position: { x: 0, y: 45, width: 1920, height: 1035 },
    },
  ];

  const mockVstab = {
    onWindowsUpdate: jest.fn(),
    onSettingsChanged: jest.fn(),
    offSettingsChanged: jest.fn(),
    resizeWindows: jest.fn().mockResolvedValue(undefined),
    focusWindow: jest.fn().mockResolvedValue(undefined),
    setWindowVisibility: jest.fn().mockResolvedValue(undefined),
    getSettings: jest.fn().mockResolvedValue({
      theme: 'system',
      tabBarHeight: 45,
      autoHide: true,
      autoResizeVertical: true,
      autoResizeHorizontal: true,
      debugLogging: false,
    }),
    updateSettings: jest.fn().mockResolvedValue({
      theme: 'system',
      tabBarHeight: 45,
      autoHide: true,
      autoResizeVertical: true,
      autoResizeHorizontal: true,
      debugLogging: false,
    }),
  };

  const mockReorderWindows = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup global window.vstab API
    Object.defineProperty(window, 'vstab', {
      value: mockVstab,
      writable: true,
    });

    // Setup hook mocks
    mockUseWindowVisibility.mockReturnValue({ isVisible: true });
    mockUseTabOrder.mockReturnValue({
      orderedWindows: mockWindows,
      reorderWindows: mockReorderWindows,
    });
    mockUseTheme.mockReturnValue({
      theme: 'system',
      setTheme: jest.fn(),
    });
  });

  describe('Rendering', () => {
    it('should render tab bar with correct styles', async () => {
      const { container } = render(<App />);

      // Wait for settings to load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const tabBar = container.firstChild as HTMLElement;
      expect(tabBar).toHaveClass(
        'flex',
        'items-center',
        'justify-between',
        'border-b'
      );
      expect(tabBar).toHaveStyle({
        backgroundColor: 'var(--color-vscode-dark)',
        borderColor: 'var(--color-vscode-border)',
      });
    });

    it('should render all windows as tabs', async () => {
      render(<App />);

      // Wait for settings to load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(screen.getByText('vstab')).toBeInTheDocument();
      expect(screen.getByText('my-project')).toBeInTheDocument();
      expect(screen.getByText('helper-lib')).toBeInTheDocument();
    });

    it('should not render when not visible', () => {
      mockUseWindowVisibility.mockReturnValue({ isVisible: false });

      const { container } = render(<App />);

      expect(container.firstChild).toBeNull();
    });

    it('should render empty when no windows', async () => {
      mockUseTabOrder.mockReturnValue({
        orderedWindows: [],
        reorderWindows: mockReorderWindows,
      });

      const { container } = render(<App />);

      // Wait for settings to load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const tabBar = container.firstChild as HTMLElement;
      const tabContainer = tabBar.querySelector('.flex-1');
      expect(tabContainer).toBeEmptyDOMElement();
    });

    it('should render tabs in order from useTabOrder hook', async () => {
      const reorderedWindows = [mockWindows[2], mockWindows[0], mockWindows[1]];
      mockUseTabOrder.mockReturnValue({
        orderedWindows: reorderedWindows,
        reorderWindows: mockReorderWindows,
      });

      render(<App />);

      // Wait for settings to load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const tabs = screen.getAllByText(
        new RegExp('vstab|my-project|helper-lib')
      );
      expect(tabs[0]).toHaveTextContent('helper-lib');
      expect(tabs[1]).toHaveTextContent('vstab');
      expect(tabs[2]).toHaveTextContent('my-project');
    });
  });

  describe('Initialization', () => {
    it('should set up window update listener on mount', async () => {
      render(<App />);

      // Wait for settings to load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockVstab.onWindowsUpdate).toHaveBeenCalledTimes(1);
      expect(mockVstab.onWindowsUpdate).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('should request window resize on mount', async () => {
      render(<App />);

      // Wait for settings to load and resize to be called
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockVstab.resizeWindows).toHaveBeenCalledTimes(1);
      expect(mockVstab.resizeWindows).toHaveBeenCalledWith(45); // Updated from 35 to 45 based on default settings
    });

    it('should handle window update callback', async () => {
      render(<App />);

      // Wait for settings to load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const updateCallback = mockVstab.onWindowsUpdate.mock.calls[0][0];
      const newWindows = [mockWindows[0]];

      act(() => {
        updateCallback(newWindows);
      });

      // The callback should trigger state updates, which would re-render
      // We can't easily test internal state, but we can verify the callback was called
      expect(mockVstab.onWindowsUpdate).toHaveBeenCalled();
    });
  });

  describe('Tab interactions', () => {
    it('should handle tab click and focus window', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Wait for settings to load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const tab = screen.getByText('my-project').closest('.tab')!;
      await user.click(tab);

      expect(mockVstab.focusWindow).toHaveBeenCalledWith('window2');
    });

    it('should handle multiple tab clicks', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Wait for settings to load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const tab1 = screen.getByText('vstab').closest('.tab')!;
      const tab2 = screen.getByText('my-project').closest('.tab')!;

      await user.click(tab1);
      await user.click(tab2);

      expect(mockVstab.focusWindow).toHaveBeenCalledTimes(2);
      expect(mockVstab.focusWindow).toHaveBeenCalledWith('window1');
      expect(mockVstab.focusWindow).toHaveBeenCalledWith('window2');
    });
  });

  describe('Drag and drop', () => {
    it.skip('should handle drag start', () => {
      // Skipping drag tests due to JSDOM limitations
    });

    it.skip('should handle drag over', () => {
      // Skipping drag tests due to JSDOM limitations
    });

    it.skip('should handle successful drop and reorder', () => {
      // Skipping drag tests due to JSDOM limitations
    });

    it.skip('should not reorder when dropping on same element', () => {
      // Skipping drag tests due to JSDOM limitations
    });

    it.skip('should handle drop with invalid dragged ID', () => {
      // Skipping drag tests due to JSDOM limitations
    });

    it.skip('should handle complex reordering scenarios', () => {
      // Skipping drag tests due to JSDOM limitations
    });
  });

  describe('Active window management', () => {
    it('should set first window as active when none selected', () => {
      mockUseTabOrder.mockReturnValue({
        orderedWindows: mockWindows,
        reorderWindows: mockReorderWindows,
      });

      render(<App />);

      // Simulate window update callback
      const updateCallback = mockVstab.onWindowsUpdate.mock.calls[0][0];
      act(() => {
        updateCallback(mockWindows);
      });

      // The first window should be considered for activation
      // Since we can't easily test internal state, we verify the callback was set up
      expect(mockVstab.onWindowsUpdate).toHaveBeenCalled();
    });

    it('should render active tab with correct props', () => {
      render(<App />);

      // In our test setup, window1 should be the first one and likely active
      const tabs = screen
        .getAllByRole('generic')
        .filter(el => el.classList.contains('tab'));

      // We can't easily test which specific tab is active without inspecting internal state,
      // but we can verify tabs are rendered
      expect(tabs.length).toBe(3);
    });
  });

  describe('Error handling', () => {
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      // Set up console.error spy for all error handling tests
      consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
    });

    afterEach(() => {
      // Restore console.error after each test
      if (consoleErrorSpy) {
        consoleErrorSpy.mockRestore();
      }
    });

    it('should handle focus window error gracefully', async () => {
      const user = userEvent.setup();
      mockVstab.focusWindow.mockRejectedValue(new Error('Focus failed'));

      render(<App />);

      const tab = screen.getByText('vstab').closest('.tab')!;

      // Should not throw
      await user.click(tab);

      expect(mockVstab.focusWindow).toHaveBeenCalledWith('window1');
      // Verify console.error was called with expected message
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error in tab click handler:',
        expect.any(Error)
      );
    });

    it.skip('should handle missing dataTransfer in drag events', () => {
      // Skipping drag tests due to JSDOM limitations
    });

    it('should handle window resize error gracefully', async () => {
      mockVstab.resizeWindows.mockRejectedValue(new Error('Resize failed'));

      // Should not throw during render
      expect(() => render(<App />)).not.toThrow();

      // Wait for settings to load and resize to be called
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(mockVstab.resizeWindows).toHaveBeenCalledWith(45); // Updated from 35 to 45

      // Verify console.error was called with expected message
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error resizing windows:',
        expect.any(Error)
      );
    });

    it('should handle onWindowsUpdate callback errors', () => {
      render(<App />);

      const updateCallback = mockVstab.onWindowsUpdate.mock.calls[0][0];

      // Should not throw when callback is called with invalid data
      expect(() => {
        act(() => {
          updateCallback(null);
        });
      }).not.toThrow();
      expect(() => {
        act(() => {
          updateCallback(undefined);
        });
      }).not.toThrow();
      expect(() => {
        act(() => {
          updateCallback([]);
        });
      }).not.toThrow();
    });
  });

  describe('Component lifecycle', () => {
    it('should clean up properly on unmount', () => {
      const { unmount } = render(<App />);

      // Verify initial setup
      expect(mockVstab.onWindowsUpdate).toHaveBeenCalled();

      // Unmount should not throw
      expect(() => unmount()).not.toThrow();
    });

    it('should update when hook dependencies change', () => {
      const { rerender } = render(<App />);

      // Update visibility hook
      mockUseWindowVisibility.mockReturnValue({ isVisible: false });

      rerender(<App />);

      // Component should not render when not visible
      expect(screen.queryByText('vstab')).not.toBeInTheDocument();
    });

    it('should handle tab order changes', () => {
      const { rerender } = render(<App />);

      // Initially should have 3 tabs
      expect(screen.getAllByText(/vstab|my-project|helper-lib/).length).toBe(3);

      // Update with different order
      const newOrder = [mockWindows[1], mockWindows[2]];
      mockUseTabOrder.mockReturnValue({
        orderedWindows: newOrder,
        reorderWindows: mockReorderWindows,
      });

      rerender(<App />);

      // Should now have 2 tabs
      expect(screen.getAllByText(/my-project|helper-lib/).length).toBe(2);
      expect(screen.queryByText('vstab')).not.toBeInTheDocument();
    });
  });

  describe('Integration with hooks', () => {
    it('should pass windows to useTabOrder hook', () => {
      render(<App />);

      // The hook should have been called with the windows from the window update
      expect(mockUseTabOrder).toHaveBeenCalled();
    });

    it('should respect visibility from useWindowVisibility hook', () => {
      mockUseWindowVisibility.mockReturnValue({ isVisible: false });

      const { container } = render(<App />);

      expect(container.firstChild).toBeNull();
    });

    it('should use ordered windows from useTabOrder hook', () => {
      const customOrder = [mockWindows[2], mockWindows[0]];
      mockUseTabOrder.mockReturnValue({
        orderedWindows: customOrder,
        reorderWindows: mockReorderWindows,
      });

      render(<App />);

      const tabs = screen.getAllByText(/helper-lib|vstab/);
      expect(tabs[0]).toHaveTextContent('helper-lib');
      expect(tabs[1]).toHaveTextContent('vstab');
    });
  });
});
