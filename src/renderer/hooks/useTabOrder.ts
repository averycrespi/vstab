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
    
    // If no saved order, just return windows as-is to maintain their natural order
    if (tabOrder.length === 0) {
      debugLog('No saved order, returning windows in natural order');
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
    debugLog('Ordered windows result:', result.map(w => w.id));
    
    // Update saved order if there are new windows
    if (newWindows.length > 0) {
      const newOrder = result.map(w => w.id);
      debugLog('Auto-updating tab order with new windows:', newOrder);
      setTabOrder(newOrder);
      // Don't await this, let it save in background
      window.vstab.reorderTabs(newOrder).catch(err => 
        debugLog('Error auto-saving tab order:', err)
      );
    }
    
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