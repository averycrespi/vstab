import { logger, configureLogger } from '@shared/logger';

// Configure the logger for renderer process
// We'll only log to console in renderer since file logging is handled by main process
configureLogger({
  level: 'debug', // Can be more verbose in renderer for development
  logToFile: false, // File logging is handled by main process
  logToConsole: true,
});

// Export configured logger for renderer use
export { logger };
export default logger;
