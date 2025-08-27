import { ShakespeareConfigV1, ShakespeareConfigV2 } from '@/types/interfaces';
/**
 * Configuration validation and migration utilities
 */
/**
 * Error thrown when configuration version is not supported
 */
export declare class UnsupportedConfigVersionError extends Error {
    constructor(version: number);
}
/**
 * Error thrown when configuration format is invalid
 */
export declare class InvalidConfigError extends Error {
    constructor(message: string);
}
/**
 * Detect and validate configuration version
 */
export declare function detectConfigVersion(config: any): number;
/**
 * Validate that a configuration object is valid for its version
 */
export declare function validateConfig(config: any, version: number): void;
/**
 * Migrate V1 configuration to V2 format
 */
export declare function migrateV1ToV2(v1Config: ShakespeareConfigV1): ShakespeareConfigV2;
/**
 * Normalize any configuration to V2 format
 */
export declare function normalizeConfig(rawConfig: any): ShakespeareConfigV2;
/**
 * Check if configuration needs migration
 */
export declare function needsMigration(config: any): boolean;
