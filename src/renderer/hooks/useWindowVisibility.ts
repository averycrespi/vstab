import { useState, useEffect } from 'react';
import { debugLog } from '@shared/debug';

export function useWindowVisibility() {
  debugLog('Initializing window visibility hook');
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    const checkVisibility = async () => {
      try {
        const frontmostApp = await window.vstab.getFrontmostApp();
        const appLower = frontmostApp.toLowerCase();
        const shouldShow =
          appLower.includes('code') ||
          appLower.includes('vstab') ||
          appLower.includes('electron') ||
          appLower.includes('vscode');
        debugLog(
          'Visibility check - frontmost:',
          frontmostApp,
          'shouldShow:',
          shouldShow
        );
        setIsVisible(shouldShow);
      } catch (error) {
        debugLog('Error checking visibility:', error);
        console.error('Error checking visibility:', error);
      }
    };

    // Check immediately
    debugLog('Starting initial visibility check');
    checkVisibility();

    // Then check every 500ms
    debugLog('Setting up visibility polling interval (500ms)');
    intervalId = setInterval(checkVisibility, 500);

    return () => {
      debugLog('Cleaning up visibility polling interval');
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  return { isVisible };
}
