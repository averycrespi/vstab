import { useState, useEffect, useCallback, useMemo } from 'react';
import { EditorWindow } from '@shared/types';
import { logger } from '../logger';

export function useTabOrder(windows: EditorWindow[]) {
  logger.debug('Initializing tab order hook', 'useTabOrder', {
    windowCount: windows.length,
  });
  const [tabOrder, setTabOrder] = useState<string[]>([]);

  useEffect(() => {
    // Only load on mount, not when windows change
    if (tabOrder.length > 0) return; // Already loaded

    // Load saved tab order on mount
    logger.debug('Loading saved tab order', 'useTabOrder');
    window.vstab
      .getTabOrder()
      .then(order => {
        logger.debug('Loaded tab order', 'useTabOrder', { order });
        setTabOrder(order);

        // If no saved order exists but we have windows, save the initial order
        if (order.length === 0 && windows.length > 0) {
          const initialOrder = windows.map(w => w.id);
          logger.debug(
            'No saved order found, saving initial window order',
            'useTabOrder',
            {
              initialOrder,
            }
          );
          setTabOrder(initialOrder);
          // Save initial order in background
          window.vstab.reorderTabs(initialOrder).catch(err => {
            logger.error('Error saving initial tab order', 'useTabOrder', err);
            console.error('Error saving initial tab order:', err);
          });
        }
      })
      .catch(error => {
        logger.error('Error loading tab order', 'useTabOrder', error);
        console.error('Error loading tab order:', error);
        // Keep default empty array on error
      });
  }, [windows, tabOrder.length]);

  const orderedWindows = useMemo(() => {
    logger.debug('Computing ordered windows', 'useTabOrder', {
      currentOrder: tabOrder,
    });

    // If no saved order, just return windows as-is to maintain their natural order
    if (tabOrder.length === 0) {
      logger.debug(
        'No saved order, returning windows in natural order',
        'useTabOrder'
      );
      return windows;
    }

    // Sort windows based on saved order, maintaining order for closed windows
    const ordered: EditorWindow[] = [];
    const newWindows: EditorWindow[] = [];

    // First, add windows in saved order (skip closed windows)
    for (const windowId of tabOrder) {
      const window = windows.find(w => w.id === windowId);
      if (window) {
        ordered.push(window);
      }
      // Note: we skip closed windows (not found in current windows)
    }

    // Then add any new windows at the end (maintain discovery order)
    for (const window of windows) {
      if (!tabOrder.includes(window.id)) {
        newWindows.push(window);
      }
    }

    const result = [...ordered, ...newWindows];
    logger.debug('Ordered windows result', 'useTabOrder', {
      windowIds: result.map(w => w.id),
    });

    return result;
  }, [windows, tabOrder]);

  // Handle auto-saving when new windows are detected
  useEffect(() => {
    if (tabOrder.length === 0) return; // Skip if no saved order yet

    const newWindows = windows.filter(window => !tabOrder.includes(window.id));

    if (newWindows.length > 0) {
      const newOrder = [...tabOrder, ...newWindows.map(w => w.id)];
      logger.debug('Auto-updating tab order with new windows', 'useTabOrder', {
        newOrder,
      });
      setTabOrder(newOrder);
      // Don't await this, let it save in background
      window.vstab.reorderTabs(newOrder).catch(err => {
        logger.error('Error auto-saving tab order', 'useTabOrder', err);
        console.error('Error auto-saving tab order:', err);
      });
    }
  }, [windows, tabOrder]);

  const reorderWindows = useCallback(async (newOrder: string[]) => {
    logger.debug('Reordering windows', 'useTabOrder', { newOrder });
    setTabOrder(newOrder);
    try {
      await window.vstab.reorderTabs(newOrder);
      logger.info('Tab order saved successfully', 'useTabOrder');
    } catch (error) {
      logger.error('Error saving tab order', 'useTabOrder', error);
      console.error('Error saving tab order:', error);
      // State update already happened, so UI will still show new order
    }
  }, []);

  return {
    orderedWindows,
    reorderWindows,
  };
}
