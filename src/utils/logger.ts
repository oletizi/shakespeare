import winston from 'winston';

/**
 * Structured logger for Shakespeare with configurable verbosity levels
 */
export class ShakespeareLogger {
  private logger: winston.Logger;
  private verboseEnabled: boolean = false;

  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
              return `[${timestamp}] ${level}: ${message}${metaStr}`;
            })
          )
        })
      ]
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
   * Error level logging
   */
  error(message: string, meta?: any): void {
    this.logger.error(`❌ ${message}`, meta);
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