import { useState, useEffect, useCallback } from 'react';
import { VSCodeWindow } from '@shared/types';
import { debugLog } from '@shared/debug';

export function useTabOrder(windows: VSCodeWindow[]) {
  debugLog('Initializing tab order hook with', windows.length, 'windows');
  const [tabOrder, setTabOrder] = useState<string[]>([]);

  useEffect(() => {
    // Load saved tab order on mount
    debugLog('Loading saved tab order');
    window.vstab.getTabOrder().then((order) => {
      debugLog('Loaded tab order:', order);
      setTabOrder(order);
    });
  }, []);

  const orderedWindows = useCallback(() => {
    debugLog('Computing ordered windows - current tab order:', tabOrder);
    // Sort windows based on saved order
    const ordered: VSCodeWindow[] = [];
    const unordered: VSCodeWindow[] = [];

    // First, add windows in saved order
    for (const windowId of tabOrder) {
      const window = windows.find(w => w.id === windowId);
      if (window) {
        ordered.push(window);
      }
    }

    // Then add any new windows not in saved order
    for (const window of windows) {
      if (!tabOrder.includes(window.id)) {
        unordered.push(window);
      }
    }

    const result = [...ordered, ...unordered];
    debugLog('Ordered windows result:', result.map(w => w.id));
    return result;
  }, [windows, tabOrder]);

  const reorderWindows = useCallback(async (newOrder: string[]) => {
    debugLog('Reordering windows to:', newOrder);
    setTabOrder(newOrder);
    await window.vstab.reorderTabs(newOrder);
    debugLog('Tab order saved successfully');
  }, []);

  return {
    orderedWindows: orderedWindows(),
    reorderWindows
  };
}