import { ShakespeareConfig } from '@/types/interfaces';
/**
 * Configuration loading and validation utilities
 */
export declare class InvalidConfigError extends Error {
    constructor(message: string);
}
/**
 * Find configuration file in current directory or project root
 */
export declare function findConfigFile(startDir?: string): string | null;
/**
 * Load and validate Shakespeare configuration from file
 */
export declare function loadConfig(configPath?: string): ShakespeareConfig | null;
