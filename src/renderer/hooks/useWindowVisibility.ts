import { useState, useEffect } from 'react';
import { logger } from '../logger';
import { AppSettings } from '@shared/types';

export function useWindowVisibility() {
  logger.debug('Initializing window visibility hook', 'useWindowVisibility');
  const [isVisible, setIsVisible] = useState(true);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Load settings when hook initializes
  useEffect(() => {
    logger.debug('Loading settings for visibility hook', 'useWindowVisibility');
    window.vstab
      .getSettings()
      .then((loadedSettings: AppSettings) => {
        logger.debug(
          'Visibility hook - settings loaded',
          'useWindowVisibility',
          { settings: loadedSettings }
        );
        setSettings(loadedSettings);
      })
      .catch((error: any) => {
        logger.error(
          'Error loading settings in visibility hook',
          'useWindowVisibility',
          error
        );
        console.error('Error loading settings in visibility hook:', error);
      });

    // Listen for settings changes
    const handleSettingsChanged = (updatedSettings: AppSettings) => {
      logger.debug(
        'Visibility hook - settings changed',
        'useWindowVisibility',
        { settings: updatedSettings }
      );
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
          logger.debug(
            'Auto-hide disabled, showing tab bar',
            'useWindowVisibility'
          );
          setIsVisible(true);
          return;
        }

        const frontmostApp = await window.vstab.getFrontmostApp();

        // Check if frontmost app matches any supported editor
        const matchesEditor =
          settings?.editorDetectionConfig?.editors.some(editor =>
            editor.appNamePatterns.some(pattern =>
              frontmostApp.includes(pattern)
            )
          ) || false;

        const shouldShow = matchesEditor;

        logger.debug('Visibility check', 'useWindowVisibility', {
          frontmostApp,
          shouldShow,
          matchesEditor,
          autoHide: settings?.autoHide,
          editorConfig: settings?.editorDetectionConfig,
        });
        setIsVisible(shouldShow);
      } catch (error) {
        logger.error('Error checking visibility', 'useWindowVisibility', {
          attempt: retryCount + 1,
          error,
        });

        // Retry logic for failed yabai queries
        if (retryCount < 2) {
          logger.debug(
            'Retrying visibility check in 100ms',
            'useWindowVisibility',
            { nextAttempt: retryCount + 2 }
          );
          setTimeout(() => checkVisibility(retryCount + 1), 100);
        } else {
          console.error('Error checking visibility after retries:', error);
          // On repeated failures, default to visible to avoid hiding the tab bar indefinitely
          logger.warn(
            'Defaulting to visible after failed retries',
            'useWindowVisibility'
          );
          setIsVisible(true);
        }
      }
    };

    // Only start polling if we have settings
    if (settings !== null) {
      // Check immediately
      logger.debug('Starting initial visibility check', 'useWindowVisibility');
      checkVisibility();

      // Then check every 250ms for more responsive detection
      logger.debug(
        'Setting up visibility polling interval (250ms)',
        'useWindowVisibility'
      );
      intervalId = setInterval(() => checkVisibility(), 250);
    }

    return () => {
      logger.debug(
        'Cleaning up visibility polling interval',
        'useWindowVisibility'
      );
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [settings]);

  // Control actual window visibility when isVisible changes
  useEffect(() => {
    if (settings !== null) {
      logger.debug('Setting window visibility via IPC', 'useWindowVisibility', {
        isVisible,
      });
      window.vstab.setWindowVisibility(isVisible);
    }
  }, [isVisible, settings]);

  return { isVisible };
}
