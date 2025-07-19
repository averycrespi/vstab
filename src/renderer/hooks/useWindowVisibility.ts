import { useState, useEffect } from 'react';
import { logger } from '../logger';
import { AppSettings } from '@shared/types';

export function useWindowVisibility() {
  logger.debug('Initializing window visibility hook', 'useWindowVisibility');
  const [isVisible, setIsVisible] = useState(true);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Error rate limiting state
  const [errorCount, setErrorCount] = useState(0);
  const [lastErrorTime, setLastErrorTime] = useState(0);
  const [backoffDelay, setBackoffDelay] = useState(100);

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
          // Reset error tracking on successful operation
          if (errorCount > 0) {
            setErrorCount(0);
            setBackoffDelay(100);
          }
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

        // To avoid looping, show the tab bar when vstab is the frontmost app
        const shouldShow =
          matchesEditor ||
          frontmostApp === 'vstab' ||
          frontmostApp === 'Electron';

        logger.debug('Visibility check', 'useWindowVisibility', {
          frontmostApp,
          shouldShow,
          matchesEditor,
          autoHide: settings?.autoHide,
          editorConfig: settings?.editorDetectionConfig,
        });
        setIsVisible(shouldShow);

        // Reset error tracking on successful operation
        if (errorCount > 0) {
          setErrorCount(0);
          setBackoffDelay(100);
        }
      } catch (error) {
        const now = Date.now();
        const timeSinceLastError = now - lastErrorTime;

        // Update error tracking
        setLastErrorTime(now);
        const newErrorCount = errorCount + 1;
        setErrorCount(newErrorCount);

        logger.error('Error checking visibility', 'useWindowVisibility', {
          attempt: retryCount + 1,
          totalErrors: newErrorCount,
          timeSinceLastError,
          currentBackoff: backoffDelay,
          error,
        });

        // Implement exponential backoff with maximum retry limits
        const maxRetries = 3;
        const maxBackoffDelay = 5000; // 5 seconds max

        if (retryCount < maxRetries && newErrorCount < 10) {
          // Calculate exponential backoff delay: 100ms, 200ms, 400ms, etc.
          const currentDelay = Math.min(
            backoffDelay * Math.pow(2, retryCount),
            maxBackoffDelay
          );

          logger.debug(
            'Retrying visibility check with exponential backoff',
            'useWindowVisibility',
            {
              nextAttempt: retryCount + 2,
              delay: currentDelay,
              totalErrors: newErrorCount,
            }
          );

          setTimeout(() => checkVisibility(retryCount + 1), currentDelay);
        } else {
          // Rate limiting: if too many errors in short time, increase base backoff
          if (newErrorCount >= 5 && timeSinceLastError < 10000) {
            const newBackoffDelay = Math.min(backoffDelay * 2, maxBackoffDelay);
            setBackoffDelay(newBackoffDelay);
            logger.warn(
              'High error rate detected, increasing backoff delay',
              'useWindowVisibility',
              {
                newBackoffDelay,
                errorCount: newErrorCount,
                timeSinceLastError,
              }
            );
          }

          console.error('Error checking visibility after retries:', error);
          // On repeated failures, default to visible to avoid hiding the tab bar indefinitely
          logger.warn(
            'Defaulting to visible after failed retries',
            'useWindowVisibility',
            {
              finalErrorCount: newErrorCount,
              finalRetryCount: retryCount + 1,
            }
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
