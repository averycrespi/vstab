import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { LogEntry } from '../shared/logger';

const LOG_DIR = path.join(os.homedir(), '.config', 'vstab', 'logs');
const MAX_LOG_FILE_SIZE_MB = 10;
const DEFAULT_RETENTION_DAYS = 7;

export interface FileLoggerConfig {
  maxFileSizeMB: number;
  retentionDays: number;
}

export class FileLogger {
  private config: FileLoggerConfig;
  private currentLogFile: string;
  private initPromise: Promise<void>;

  constructor(config: Partial<FileLoggerConfig> = {}) {
    this.config = {
      maxFileSizeMB: config.maxFileSizeMB || MAX_LOG_FILE_SIZE_MB,
      retentionDays: config.retentionDays || DEFAULT_RETENTION_DAYS,
    };

    this.currentLogFile = this.getLogFileName();
    this.initPromise = this.initialize();
  }

  private getLogFileName(date?: Date): string {
    const logDate = date || new Date();
    const dateStr = logDate.toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(LOG_DIR, `vstab-${dateStr}.log`);
  }

  private async initialize(): Promise<void> {
    try {
      await fs.mkdir(LOG_DIR, { recursive: true });
      await this.cleanupOldLogs();
    } catch (error) {
      console.error('Failed to initialize file logger:', error);
      throw error;
    }
  }

  private async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  private async rotateLogIfNeeded(): Promise<void> {
    const currentDate = new Date();
    const expectedLogFile = this.getLogFileName(currentDate);

    // Check if we need to rotate to a new day
    if (this.currentLogFile !== expectedLogFile) {
      this.currentLogFile = expectedLogFile;
      return;
    }

    // Check if current file exceeds size limit
    const fileSizeBytes = await this.getFileSize(this.currentLogFile);
    const maxSizeBytes = this.config.maxFileSizeMB * 1024 * 1024;

    if (fileSizeBytes > maxSizeBytes) {
      // Create a new file with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const basename = path.basename(this.currentLogFile, '.log');
      const newLogFile = path.join(LOG_DIR, `${basename}-${timestamp}.log`);
      this.currentLogFile = newLogFile;
    }
  }

  private async cleanupOldLogs(): Promise<void> {
    try {
      const files = await fs.readdir(LOG_DIR);
      const logFiles = files.filter(
        file => file.startsWith('vstab-') && file.endsWith('.log')
      );

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      for (const file of logFiles) {
        const filePath = path.join(LOG_DIR, file);
        try {
          const stats = await fs.stat(filePath);
          if (stats.mtime < cutoffDate) {
            await fs.unlink(filePath);
          }
        } catch (error) {
          // Ignore errors for individual files
        }
      }
    } catch (error) {
      // Don't throw, just log the error
      console.error('Failed to cleanup old logs:', error);
    }
  }

  async writeLog(entry: LogEntry): Promise<void> {
    try {
      await this.initPromise;
      await this.rotateLogIfNeeded();

      const logLine = JSON.stringify(entry) + '\n';
      await fs.appendFile(this.currentLogFile, logLine, 'utf-8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
      throw error;
    }
  }

  async getLogDirectory(): Promise<string> {
    await this.initPromise;
    return LOG_DIR;
  }

  updateConfig(config: Partial<FileLoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async getLogFiles(): Promise<string[]> {
    try {
      await this.initPromise;
      const files = await fs.readdir(LOG_DIR);
      return files
        .filter(file => file.startsWith('vstab-') && file.endsWith('.log'))
        .sort()
        .reverse(); // Most recent first
    } catch {
      return [];
    }
  }

  async readLogFile(filename: string, lines?: number): Promise<LogEntry[]> {
    try {
      const filePath = path.join(LOG_DIR, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      const logLines = content
        .trim()
        .split('\n')
        .filter(line => line.trim());

      let entries = logLines
        .map(line => {
          try {
            return JSON.parse(line) as LogEntry;
          } catch {
            return null;
          }
        })
        .filter((entry): entry is LogEntry => entry !== null);

      if (lines && lines > 0) {
        entries = entries.slice(-lines); // Get last N lines
      }

      return entries;
    } catch {
      return [];
    }
  }
}

let fileLoggerInstance: FileLogger | null = null;

export function getFileLogger(): FileLogger {
  if (!fileLoggerInstance) {
    fileLoggerInstance = new FileLogger();
  }
  return fileLoggerInstance;
}

export function updateFileLoggerConfig(
  config: Partial<FileLoggerConfig>
): void {
  if (fileLoggerInstance) {
    fileLoggerInstance.updateConfig(config);
  }
}

export function resetFileLogger(): void {
  fileLoggerInstance = null;
}
