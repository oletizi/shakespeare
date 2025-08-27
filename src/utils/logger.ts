import winston from 'winston';
import { join } from 'path';
import { mkdirSync, existsSync, writeFileSync } from 'fs';

/**
 * Structured logger for Shakespeare with configurable verbosity levels
 */
export class ShakespeareLogger {
  private logger: winston.Logger;
  private verboseEnabled: boolean = false;
  private errorLogPath: string;

  constructor(rootDir?: string) {
    // Set up error log path in .shakespeare directory
    const logDir = rootDir ? join(rootDir, '.shakespeare') : join(process.cwd(), '.shakespeare');
    this.errorLogPath = join(logDir, 'errors.log');
    
    // Determine if we can create file logs (skip in test environments with problematic paths)
    const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
    const canCreateLogDir = !isTestEnvironment || rootDir?.startsWith('/tmp') || rootDir?.startsWith(process.cwd());
    
    let fileTransport = null;
    
    if (canCreateLogDir) {
      // Ensure .shakespeare directory exists
      if (!existsSync(logDir)) {
        try {
          mkdirSync(logDir, { recursive: true });
        } catch (error) {
          // If we can't create the directory, we'll just log to console
          if (!isTestEnvironment) {
            console.warn(`Warning: Could not create log directory ${logDir}`);
          }
        }
      }

      // Create .gitignore in .shakespeare directory to ignore log files (if it doesn't exist)
      if (existsSync(logDir)) {
        const gitignorePath = join(logDir, '.gitignore');
        if (!existsSync(gitignorePath)) {
          try {
            writeFileSync(gitignorePath, '# Ignore Shakespeare log files\n*.log*\n');
          } catch (error) {
            // Non-critical if we can't create .gitignore
          }
        }
      }

      // Try to create file transport
      if (existsSync(logDir)) {
        try {
          fileTransport = new winston.transports.File({
            filename: this.errorLogPath,
            level: 'error',
            format: winston.format.combine(
              winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
              winston.format.errors({ stack: true }),
              winston.format.json()
            ),
            maxsize: 10 * 1024 * 1024, // 10MB max file size
            maxFiles: 5, // Keep 5 error log files
            tailable: true
          });
        } catch (error) {
          // File transport creation failed, continue with console only
          if (!isTestEnvironment) {
            console.warn(`Warning: Could not create error log file ${this.errorLogPath}`);
          }
        }
      }
    }

    const transports: winston.transport[] = [
      // Console transport for regular logging
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            const timeStr = typeof timestamp === 'string' ? timestamp.split(' ')[1] : timestamp;
            return `[${timeStr}] ${level}: ${message}${metaStr}`;
          })
        )
      })
    ];

    // Add file transport if it was created successfully
    if (fileTransport) {
      transports.push(fileTransport);
    }

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports
    });
  }

  /**
   * Enable or disable verbose logging
   */
  setVerbose(enabled: boolean): void {
    this.verboseEnabled = enabled;
    this.logger.level = enabled ? 'debug' : 'info';
  }

  /**
   * Set explicit log level
   */
  setLevel(level: 'error' | 'warn' | 'info' | 'debug'): void {
    this.logger.level = level;
    // If debug level is set, enable verbose-style output
    this.verboseEnabled = level === 'debug';
  }

  /**
   * Check if verbose mode is enabled
   */
  isVerbose(): boolean {
    return this.verboseEnabled;
  }

  /**
   * Always log - shown regardless of verbose setting
   */
  always(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  /**
   * Verbose level logging - only shown when verbose is enabled
   */
  verbose(message: string, meta?: any): void {
    if (this.verboseEnabled) {
      this.logger.info(`🔧 ${message}`, meta);
    }
  }

  /**
   * Debug level logging - detailed information for debugging
   */
  debug(message: string, meta?: any): void {
    if (this.verboseEnabled) {
      this.logger.debug(`🐛 ${message}`, meta);
    }
  }

  /**
   * Info level logging - general information
   */
  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  /**
   * Warning level logging
   */
  warn(message: string, meta?: any): void {
    this.logger.warn(`⚠️  ${message}`, meta);
  }

  /**
   * Error level logging - logs to console and error file
   */
  error(message: string, meta?: any): void {
    this.logger.error(`❌ ${message}`, meta);
  }

  /**
   * Enhanced error logging with full context and user guidance
   */
  logError(operation: string, error: Error | string, context?: any): void {
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Full error context for the log file
    const fullContext = {
      timestamp,
      operation,
      error: errorMessage,
      stack: errorStack,
      context: context || {},
      process: {
        cwd: process.cwd(),
        argv: process.argv,
        version: process.version,
        platform: process.platform
      }
    };

    // Log full details to file
    this.logger.error('Operation failed', fullContext);

    // Show concise error to user with file reference
    const conciseMessage = `${operation} failed: ${errorMessage}`;
    console.error(`\n❌ ${conciseMessage}`);
    
    // Check if file logging is available
    const hasFileTransport = this.logger.transports.some(t => t instanceof winston.transports.File);
    if (hasFileTransport && existsSync(this.errorLogPath)) {
      console.error(`📋 Full error details logged to: ${this.errorLogPath}`);
      console.error(`💡 Run: tail -f "${this.errorLogPath}" to monitor errors\n`);
    } else {
      console.error(`📋 Full error details available in console output above\n`);
    }
  }

  /**
   * Get the path to the error log file
   */
  getErrorLogPath(): string {
    return this.errorLogPath;
  }

  /**
   * Log command execution with elided content
   */
  logCommand(command: string, args: string[], options?: { contentLength?: number }): void {
    if (this.verboseEnabled) {
      // Find and elide text content in arguments
      const processedArgs = args.map(arg => {
        // If argument looks like content (long text), elide it
        if (arg.length > 100 && !arg.startsWith('--') && !arg.includes('/') && !arg.includes('=')) {
          return `[CONTENT: ${arg.length} chars]`;
        }
        return arg;
      });

      const meta = {
        command,
        args: processedArgs,
        ...(options?.contentLength && { contentLength: options.contentLength })
      };

      this.logger.debug(`🚀 Executing command: ${command}`, meta);
    }
  }

  /**
   * Log timing information
   */
  logTiming(operation: string, duration: number, meta?: any): void {
    if (this.verboseEnabled) {
      this.logger.debug(`⏱️  ${operation} completed in ${duration}ms`, { duration, ...meta });
    }
  }

  /**
   * Log file processing information
   */
  logFileProcessing(filePath: string, operation: string, meta?: any): void {
    if (this.verboseEnabled) {
      const fileName = filePath.split('/').pop() || filePath;
      this.logger.debug(`📄 ${operation}: ${fileName}`, { filePath, operation, ...meta });
    }
  }

  /**
   * Log configuration details
   */
  logConfig(config: Record<string, any>): void {
    if (this.verboseEnabled) {
      this.logger.info('🔧 Configuration Details:', config);
    }
  }

  /**
   * Log statistics
   */
  logStats(stats: Record<string, any>): void {
    if (this.verboseEnabled) {
      this.logger.info('📊 Statistics:', stats);
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Record<string, any>): winston.Logger {
    return this.logger.child(context);
  }
}