import { useState, useEffect, useCallback } from 'react';
import { VSCodeWindow } from '@shared/types';

export function useTabOrder(windows: VSCodeWindow[]) {
  const [tabOrder, setTabOrder] = useState<string[]>([]);

  useEffect(() => {
    // Load saved tab order on mount
    window.vstab.getTabOrder().then(setTabOrder);
  }, []);

  const orderedWindows = useCallback(() => {
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

    return [...ordered, ...unordered];
  }, [windows, tabOrder]);

  const reorderWindows = useCallback(async (newOrder: string[]) => {
    setTabOrder(newOrder);
    await window.vstab.reorderTabs(newOrder);
  }, []);

  return {
    orderedWindows: orderedWindows(),
    reorderWindows
  };
}