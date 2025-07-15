import { useState, useEffect } from 'react';
import { debugLog } from '@shared/debug';
import { AppSettings } from '@shared/types';

export function useWindowVisibility() {
  debugLog('Initializing window visibility hook');
  const [isVisible, setIsVisible] = useState(true);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Load settings when hook initializes
  useEffect(() => {
    debugLog('Loading settings for visibility hook');
    window.vstab
      .getSettings()
      .then((loadedSettings: AppSettings) => {
        debugLog('Visibility hook - settings loaded:', loadedSettings);
        setSettings(loadedSettings);
      })
      .catch((error: any) => {
        debugLog('Error loading settings in visibility hook:', error);
        console.error('Error loading settings in visibility hook:', error);
      });

    // Listen for settings changes
    const handleSettingsChanged = (updatedSettings: AppSettings) => {
      debugLog('Visibility hook - settings changed:', updatedSettings);
      setSettings(updatedSettings);
    };

    window.vstab.onSettingsChanged(handleSettingsChanged);

    return () => {
      // Clean up listener
      window.vstab.offSettingsChanged(handleSettingsChanged);
    };
  }, []);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    const checkVisibility = async (retryCount = 0) => {
      try {
        // If autoHide is disabled, always show the tab bar
        if (settings && !settings.autoHide) {
          debugLog('Auto-hide disabled, showing tab bar');
          setIsVisible(true);
          return;
        }

        const frontmostApp = await window.vstab.getFrontmostApp();
        const appLower = frontmostApp.toLowerCase();

        // Improved app name matching for VS Code variations
        const shouldShow =
          appLower.includes('code') ||
          appLower.includes('vstab') ||
          appLower.includes('electron') ||
          appLower.includes('vscode') ||
          appLower.includes('visual studio code') ||
          frontmostApp.includes('Code') || // Case-sensitive check for "Code"
          frontmostApp.includes('VSCode');

        debugLog(
          'Visibility check - frontmost:',
          frontmostApp,
          'shouldShow:',
          shouldShow,
          'autoHide:',
          settings?.autoHide
        );
        setIsVisible(shouldShow);
      } catch (error) {
        debugLog(
          `Error checking visibility (attempt ${retryCount + 1}):`,
          error
        );

        // Retry logic for failed yabai queries
        if (retryCount < 2) {
          debugLog(
            `Retrying visibility check in 100ms (attempt ${retryCount + 2})`
          );
          setTimeout(() => checkVisibility(retryCount + 1), 100);
        } else {
          console.error('Error checking visibility after retries:', error);
          // On repeated failures, default to visible to avoid hiding the tab bar indefinitely
          debugLog('Defaulting to visible after failed retries');
          setIsVisible(true);
        }
      }
    };

    // Only start polling if we have settings
    if (settings !== null) {
      // Check immediately
      debugLog('Starting initial visibility check');
      checkVisibility();

      // Then check every 250ms for more responsive detection
      debugLog('Setting up visibility polling interval (250ms)');
      intervalId = setInterval(() => checkVisibility(), 250);
    }

    return () => {
      debugLog('Cleaning up visibility polling interval');
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [settings]);

  // Control actual window visibility when isVisible changes
  useEffect(() => {
    if (settings !== null) {
      debugLog('Setting window visibility via IPC:', isVisible);
      window.vstab.setWindowVisibility(isVisible);
    }
  }, [isVisible, settings]);

  return { isVisible };
}
