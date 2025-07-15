export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  source?: {
    file?: string;
    function?: string;
    line?: number;
  };
}

export interface LoggerConfig {
  level: LogLevel;
  logToFile: boolean;
  logToConsole: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

class Logger {
  private config: LoggerConfig = {
    level: 'info',
    logToFile: true,
    logToConsole: true,
  };

  private fileLogger?: (entry: LogEntry) => Promise<void>;

  constructor() {
    // Initialize with default config
  }

  setConfig(config: Partial<LoggerConfig>) {
    this.config = { ...this.config, ...config };
  }

  setFileLogger(fileLogger: (entry: LogEntry) => Promise<void>) {
    this.fileLogger = fileLogger;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] <= LOG_LEVELS[this.config.level];
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: string,
    data?: any
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (context) {
      entry.context = context;
    }

    if (data !== undefined) {
      entry.data = data;
    }

    // Capture stack trace for source information
    const stack = new Error().stack;
    if (stack) {
      const stackLines = stack.split('\n');
      // Skip this function and the public logging method
      const callerLine = stackLines[3];
      if (callerLine) {
        const match = callerLine.match(/at\s+(.+?)\s+\((.+):(\d+):\d+\)/);
        if (match) {
          entry.source = {
            function: match[1],
            file: match[2].split('/').pop(),
            line: parseInt(match[3], 10),
          };
        }
      }
    }

    return entry;
  }

  private async writeLog(entry: LogEntry) {
    if (this.config.logToConsole) {
      const timestamp = new Date(entry.timestamp).toISOString();
      const context = entry.context ? `[${entry.context}] ` : '';
      const source = entry.source
        ? ` (${entry.source.file}:${entry.source.line})`
        : '';

      switch (entry.level) {
        case 'error':
          console.error(
            `${timestamp} ERROR: ${context}${entry.message}${source}`,
            entry.data || ''
          );
          break;
        case 'warn':
          console.warn(
            `${timestamp} WARN: ${context}${entry.message}${source}`,
            entry.data || ''
          );
          break;
        case 'info':
          console.info(
            `${timestamp} INFO: ${context}${entry.message}${source}`,
            entry.data || ''
          );
          break;
        case 'debug':
          console.log(
            `${timestamp} DEBUG: ${context}${entry.message}${source}`,
            entry.data || ''
          );
          break;
      }
    }

    if (this.config.logToFile && this.fileLogger) {
      try {
        await this.fileLogger(entry);
      } catch (error) {
        // Don't let file logging errors break the application
        console.error('Failed to write log to file:', error);
      }
    }
  }

  error(message: string, context?: string, data?: any) {
    if (this.shouldLog('error')) {
      const entry = this.createLogEntry('error', message, context, data);
      this.writeLog(entry);
    }
  }

  warn(message: string, context?: string, data?: any) {
    if (this.shouldLog('warn')) {
      const entry = this.createLogEntry('warn', message, context, data);
      this.writeLog(entry);
    }
  }

  info(message: string, context?: string, data?: any) {
    if (this.shouldLog('info')) {
      const entry = this.createLogEntry('info', message, context, data);
      this.writeLog(entry);
    }
  }

  debug(message: string, context?: string, data?: any) {
    if (this.shouldLog('debug')) {
      const entry = this.createLogEntry('debug', message, context, data);
      this.writeLog(entry);
    }
  }
}

export const logger = new Logger();

export function setLogLevel(level: LogLevel) {
  logger.setConfig({ level });
}

export function setLogToFile(enabled: boolean) {
  logger.setConfig({ logToFile: enabled });
}

export function setLogToConsole(enabled: boolean) {
  logger.setConfig({ logToConsole: enabled });
}

export function configureLogger(config: Partial<LoggerConfig>) {
  logger.setConfig(config);
}
