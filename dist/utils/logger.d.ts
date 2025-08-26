import winston from 'winston';
/**
 * Structured logger for Shakespeare with configurable verbosity levels
 */
export declare class ShakespeareLogger {
    private logger;
    private verboseEnabled;
    constructor();
    /**
     * Enable or disable verbose logging
     */
    setVerbose(enabled: boolean): void;
    /**
     * Check if verbose mode is enabled
     */
    isVerbose(): boolean;
    /**
     * Always log - shown regardless of verbose setting
     */
    always(message: string, meta?: any): void;
    /**
     * Verbose level logging - only shown when verbose is enabled
     */
    verbose(message: string, meta?: any): void;
    /**
     * Debug level logging - detailed information for debugging
     */
    debug(message: string, meta?: any): void;
    /**
     * Info level logging - general information
     */
    info(message: string, meta?: any): void;
    /**
     * Warning level logging
     */
    warn(message: string, meta?: any): void;
    /**
     * Error level logging
     */
    error(message: string, meta?: any): void;
    /**
     * Log command execution with elided content
     */
    logCommand(command: string, args: string[], options?: {
        contentLength?: number;
    }): void;
    /**
     * Log timing information
     */
    logTiming(operation: string, duration: number, meta?: any): void;
    /**
     * Log file processing information
     */
    logFileProcessing(filePath: string, operation: string, meta?: any): void;
    /**
     * Log configuration details
     */
    logConfig(config: Record<string, any>): void;
    /**
     * Log statistics
     */
    logStats(stats: Record<string, any>): void;
    /**
     * Create a child logger with additional context
     */
    child(context: Record<string, any>): winston.Logger;
}
