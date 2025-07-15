import React, { useState, useEffect, useCallback } from 'react';
import { VSCodeWindow, AppSettings } from '@shared/types';
import Tab from './components/Tab';
import Settings from './components/Settings';
import { useWindowVisibility } from './hooks/useWindowVisibility';
import { useTabOrder } from './hooks/useTabOrder';
import { useTheme } from './hooks/useTheme';
import { debugLog } from '@shared/debug';

function App() {
  debugLog('App component initializing');
  const [windows, setWindows] = useState<VSCodeWindow[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const { isVisible } = useWindowVisibility();
  const { orderedWindows, reorderWindows } = useTabOrder(windows);
  const { setTheme } = useTheme();

  // Load settings on mount
  useEffect(() => {
    debugLog('Loading settings');
    window.vstab
      .getSettings()
      .then((loadedSettings: AppSettings) => {
        debugLog('Settings loaded:', loadedSettings);
        setSettings(loadedSettings);
        setTheme(loadedSettings.theme);

        // Update debug mode
        if (loadedSettings.debugLogging) {
          (global as any).DEBUG_MODE = true;
        }
      })
      .catch((error: any) => {
        debugLog('Error loading settings:', error);
        console.error('Error loading settings:', error);
      });
  }, [setTheme]);

  useEffect(() => {
    debugLog('Setting up window update listener');
    // Listen for window updates
    window.vstab.onWindowsUpdate(updatedWindows => {
      // Handle null/undefined updatedWindows gracefully
      if (!updatedWindows || !Array.isArray(updatedWindows)) {
        debugLog('Received invalid window update data:', updatedWindows);
        return;
      }

      debugLog('Received window update:', updatedWindows.length, 'windows');
      setWindows(updatedWindows);

      // Set first window as active if none selected
      if (!activeWindowId && updatedWindows.length > 0) {
        debugLog('Setting first window as active:', updatedWindows[0].id);
        setActiveWindowId(updatedWindows[0].id);
      }
    });
  }, [activeWindowId]);

  // Resize windows when settings are loaded or changed
  useEffect(() => {
    if (
      settings &&
      (settings.autoResizeVertical || settings.autoResizeHorizontal)
    ) {
      debugLog('Requesting window resize to height', settings.tabBarHeight);
      window.vstab.resizeWindows(settings.tabBarHeight).catch(error => {
        debugLog('Error resizing windows:', error);
        console.error('Error resizing windows:', error);
      });
    }
  }, [settings]);

  const handleTabClick = useCallback(async (windowId: string) => {
    debugLog('Tab clicked:', windowId);
    setActiveWindowId(windowId);
    try {
      await window.vstab.focusWindow(windowId);
      debugLog('Tab focus completed for:', windowId);
    } catch (error) {
      debugLog('Error focusing window:', error);
      console.error('Error focusing window:', error);
    }
  }, []);

  const handleDragStart = useCallback(
    (e: React.DragEvent, windowId: string) => {
      debugLog('Drag started for tab:', windowId);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', windowId);
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('text/plain');
      debugLog('Drop event - dragged:', draggedId, 'target:', targetId);

      if (draggedId !== targetId) {
        const newOrder = [...orderedWindows];
        const draggedIndex = newOrder.findIndex(w => w.id === draggedId);
        const targetIndex = newOrder.findIndex(w => w.id === targetId);

        if (draggedIndex !== -1 && targetIndex !== -1) {
          debugLog(
            'Reordering tabs - from index',
            draggedIndex,
            'to index',
            targetIndex
          );
          const [draggedWindow] = newOrder.splice(draggedIndex, 1);
          newOrder.splice(targetIndex, 0, draggedWindow);
          const newOrderIds = newOrder.map(w => w.id);
          debugLog('New tab order:', newOrderIds);
          reorderWindows(newOrderIds);
        }
      }
    },
    [orderedWindows, reorderWindows]
  );

  if (!isVisible) {
    debugLog('App not visible, rendering null');
    return null;
  }

  debugLog(
    'Rendering app with',
    orderedWindows.length,
    'windows, active:',
    activeWindowId
  );

  const tabBarHeight = settings?.tabBarHeight || 35;

  return (
    <>
      <div
        className="flex items-center justify-between border-b"
        style={{
          backgroundColor: 'var(--color-vscode-dark)',
          borderColor: 'var(--color-vscode-border)',
          height: `${tabBarHeight}px`,
        }}
      >
        <div className="flex items-center flex-1">
          {orderedWindows.map(window => {
            debugLog('Rendering tab for window:', window.id, window.title);
            return (
              <Tab
                key={window.id}
                window={window}
                isActive={window.id === activeWindowId}
                onClick={() => handleTabClick(window.id)}
                onDragStart={e => handleDragStart(e, window.id)}
                onDragOver={handleDragOver}
                onDrop={e => handleDrop(e, window.id)}
              />
            );
          })}
        </div>

        {/* Settings Button */}
        <button
          onClick={() => setShowSettings(true)}
          className="px-3 py-1 text-[var(--color-vscode-text-inactive)] hover:text-[var(--color-vscode-text)] transition-colors"
          title="Settings"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872l-.1-.34zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z" />
          </svg>
        </button>
      </div>

      {/* Settings Modal */}
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}

export default App;
