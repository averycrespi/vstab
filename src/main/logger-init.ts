import { logger, configureLogger } from '../shared/logger';
import { getFileLogger, updateFileLoggerConfig } from './file-logger';
import { AppSettings } from '../shared/types';

let isInitialized = false;

export async function initializeLogging(settings: AppSettings): Promise<void> {
  if (isInitialized) {
    return;
  }

  try {
    // Configure file logger
    const fileLogger = getFileLogger();
    updateFileLoggerConfig({
      maxFileSizeMB: settings.maxLogFileSize,
      retentionDays: settings.logRetentionDays,
    });

    // Connect file logger to main logger
    logger.setFileLogger(entry => fileLogger.writeLog(entry));

    // Configure main logger
    configureLogger({
      level: settings.logLevel,
      logToFile: settings.logToFile,
      logToConsole: true, // Always log to console in main process for debugging
    });

    isInitialized = true;
    logger.info('Logging system initialized', 'logger-init', {
      logLevel: settings.logLevel,
      logToFile: settings.logToFile,
      maxLogFileSize: settings.maxLogFileSize,
      retentionDays: settings.logRetentionDays,
    });
  } catch (error) {
    console.error('Failed to initialize logging system:', error);
    throw error;
  }
}

export function updateLoggingSettings(settings: AppSettings): void {
  if (!isInitialized) {
    return;
  }

  try {
    // Update file logger config
    updateFileLoggerConfig({
      maxFileSizeMB: settings.maxLogFileSize,
      retentionDays: settings.logRetentionDays,
    });

    // Update main logger config
    configureLogger({
      level: settings.logLevel,
      logToFile: settings.logToFile,
      logToConsole: true,
    });

    logger.info('Logging settings updated', 'logger-init', {
      logLevel: settings.logLevel,
      logToFile: settings.logToFile,
      maxLogFileSize: settings.maxLogFileSize,
      retentionDays: settings.logRetentionDays,
    });
  } catch (error) {
    logger.error('Failed to update logging settings', 'logger-init', error);
  }
}

export function isLoggingInitialized(): boolean {
  return isInitialized;
}
