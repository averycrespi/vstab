import { useState, useEffect, useCallback } from 'react';
import { VSCodeWindow } from '@shared/types';
import { logger } from '../logger';

export function useTabOrder(windows: VSCodeWindow[]) {
  logger.debug('Initializing tab order hook', 'useTabOrder', {
    windowCount: windows.length,
  });
  const [tabOrder, setTabOrder] = useState<string[]>([]);

  useEffect(() => {
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
  }, [windows]);

  const orderedWindows = useCallback(() => {
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
    const ordered: VSCodeWindow[] = [];
    const newWindows: VSCodeWindow[] = [];

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

    // Update saved order if there are new windows
    if (newWindows.length > 0) {
      const newOrder = result.map(w => w.id);
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

    return result;
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
    orderedWindows: orderedWindows(),
    reorderWindows,
  };
}
