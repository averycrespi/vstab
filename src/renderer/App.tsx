import React, { useState, useEffect, useCallback } from 'react';
import { EditorWindow, AppSettings } from '@shared/types';
import Tab from './components/Tab';
import { useWindowVisibility } from './hooks/useWindowVisibility';
import { useTabOrder } from './hooks/useTabOrder';
import { useTheme } from './hooks/useTheme';
import { logger } from './logger';

function App() {
  logger.info('App component initializing', 'renderer');
  const [windows, setWindows] = useState<EditorWindow[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const { isVisible } = useWindowVisibility();
  const { orderedWindows, reorderWindows } = useTabOrder(windows);
  const { setTheme } = useTheme();

  // Load settings on mount
  useEffect(() => {
    logger.info('Loading settings', 'renderer');
    window.vstab
      .getSettings()
      .then((loadedSettings: AppSettings) => {
        logger.debug('Settings loaded', 'renderer', {
          settings: loadedSettings,
        });
        setSettings(loadedSettings);
        setTheme(loadedSettings.theme);

        // Settings loaded successfully
      })
      .catch((error: any) => {
        logger.error('Error loading settings', 'renderer', error);
        console.error('Error loading settings:', error);
      });
  }, [setTheme]);

  // Listen for settings changes
  useEffect(() => {
    logger.debug('Setting up settings change listener', 'renderer');
    window.vstab.onSettingsChanged((updatedSettings: AppSettings) => {
      logger.info('Received settings change notification', 'renderer', {
        settings: updatedSettings,
      });
      setSettings(updatedSettings);
      setTheme(updatedSettings.theme);

      // Settings updated successfully
    });
  }, [setTheme]);

  useEffect(() => {
    logger.debug('Setting up window update listener', 'renderer');
    // Listen for window updates
    window.vstab.onWindowsUpdate(updatedWindows => {
      // Handle null/undefined updatedWindows gracefully
      if (!updatedWindows || !Array.isArray(updatedWindows)) {
        logger.warn('Received invalid window update data', 'renderer', {
          data: updatedWindows,
        });
        return;
      }

      logger.debug('Received window update', 'renderer', {
        windowCount: updatedWindows.length,
      });
      setWindows(updatedWindows);

      // Set first window as active if none selected
      if (!activeWindowId && updatedWindows.length > 0) {
        logger.debug('Setting first window as active', 'renderer', {
          windowId: updatedWindows[0].id,
        });
        setActiveWindowId(updatedWindows[0].id);
      }
    });
  }, [activeWindowId]);

  // Resize windows when settings are loaded or changed
  useEffect(() => {
    if (
      settings &&
      (settings.autoResizeEditorsVertically ||
        settings.autoResizeEditorsHorizontally)
    ) {
      logger.debug('Requesting window resize', 'renderer', {
        height: settings.tabBarHeight,
      });
      window.vstab.resizeWindows(settings.tabBarHeight).catch(error => {
        logger.error('Error resizing windows', 'renderer', error);
        console.error('Error resizing windows:', error);
      });
    }
  }, [settings]);

  const handleTabClick = useCallback(
    async (windowId: string) => {
      logger.debug('Tab clicked:', windowId);
      setActiveWindowId(windowId);
      try {
        await window.vstab.focusWindow(windowId);
        logger.debug('Tab focus completed for:', windowId);

        // Resize windows after focusing if auto-resize is enabled
        if (
          settings &&
          (settings.autoResizeEditorsVertically ||
            settings.autoResizeEditorsHorizontally)
        ) {
          logger.debug('Triggering window resize after tab click');
          await window.vstab.resizeWindows(settings.tabBarHeight);
          logger.debug('Window resize completed after tab click');
        }
      } catch (error) {
        logger.error('Error in tab click handler', 'renderer', error);
        console.error('Error in tab click handler:', error);
      }
    },
    [settings]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, windowId: string) => {
      logger.debug('Drag started for tab:', windowId);
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
      logger.debug('Drop event', 'renderer', { draggedId, targetId });

      if (draggedId !== targetId) {
        const newOrder = [...orderedWindows];
        const draggedIndex = newOrder.findIndex(w => w.id === draggedId);
        const targetIndex = newOrder.findIndex(w => w.id === targetId);

        if (draggedIndex !== -1 && targetIndex !== -1) {
          logger.debug('Reordering tabs', 'renderer', {
            fromIndex: draggedIndex,
            toIndex: targetIndex,
          });
          const [draggedWindow] = newOrder.splice(draggedIndex, 1);
          newOrder.splice(targetIndex, 0, draggedWindow);
          const newOrderIds = newOrder.map(w => w.id);
          logger.debug('New tab order', 'renderer', { order: newOrderIds });
          reorderWindows(newOrderIds);
        }
      }
    },
    [orderedWindows, reorderWindows]
  );

  if (!isVisible) {
    logger.debug('App not visible, rendering null');
    return null;
  }

  logger.debug('Rendering app', 'renderer', {
    windowCount: orderedWindows.length,
    activeWindowId,
  });

  const tabBarHeight = settings?.tabBarHeight || 35;

  return (
    <>
      <div
        className="flex items-center border-b"
        style={{
          backgroundColor: 'var(--color-editor-dark)',
          borderColor: 'var(--color-editor-border)',
          height: `${tabBarHeight}px`,
        }}
      >
        <div className="flex items-center flex-1">
          {orderedWindows.map(window => {
            logger.debug('Rendering tab for window', 'renderer', {
              windowId: window.id,
              title: window.title,
            });
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
      </div>
    </>
  );
}

export default App;
