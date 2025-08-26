import { ShakespeareConfig, ShakespeareConfigV1, ShakespeareConfigV2 } from '@/types/interfaces';

/**
 * Configuration validation and migration utilities
 */

/**
 * Error thrown when configuration version is not supported
 */
export class UnsupportedConfigVersionError extends Error {
  constructor(version: number) {
    super(`Unsupported configuration version: ${version}. Supported versions: 1, 2`);
    this.name = 'UnsupportedConfigVersionError';
  }
}

/**
 * Error thrown when configuration format is invalid
 */
export class InvalidConfigError extends Error {
  constructor(message: string) {
    super(`Invalid configuration: ${message}`);
    this.name = 'InvalidConfigError';
  }
}

/**
 * Detect and validate configuration version
 */
export function detectConfigVersion(config: any): number {
  // Check if config has version field
  if (typeof config === 'object' && config !== null) {
    if ('version' in config && typeof config.version === 'number') {
      return config.version;
    }
    
    // Legacy detection: if config has 'models' or 'workflows' properties, treat as v1
    if ('models' in config || 'workflows' in config) {
      return 1;
    }
    
    // If config has v2-style properties but no version, assume v2
    if ('costOptimized' in config || 'qualityFirst' in config) {
      return 2;
    }
  }
  
  // Default to v2 for minimal configs
  return 2;
}

/**
 * Validate that a configuration object is valid for its version
 */
export function validateConfig(config: any, version: number): void {
  if (!config || typeof config !== 'object') {
    throw new InvalidConfigError('Configuration must be an object');
  }
  
  switch (version) {
    case 1:
      validateV1Config(config);
      break;
    case 2:
      validateV2Config(config);
      break;
    default:
      throw new UnsupportedConfigVersionError(version);
  }
}

/**
 * Validate V1 configuration format
 */
function validateV1Config(config: any): void {
  // V1 configs can have models, providers, workflows, etc.
  // Basic validation - ensure no conflicting V2 properties
  const v2Props = ['costOptimized', 'qualityFirst', 'modelOptions'];
  const hasV2Props = v2Props.some(prop => prop in config);
  
  if (hasV2Props) {
    throw new InvalidConfigError('V1 configuration contains V2-specific properties. Please use version 2 or migrate the configuration.');
  }
}

/**
 * Validate V2 configuration format  
 */
function validateV2Config(config: any): void {
  // V2 configs should not have the old models/workflows structure
  const v1Props = ['models', 'workflows', 'providers'];
  const hasV1Props = v1Props.some(prop => prop in config);
  
  if (hasV1Props) {
    throw new InvalidConfigError('V2 configuration contains V1-specific properties. Please use version 1 or migrate the configuration.');
  }
}

/**
 * Migrate V1 configuration to V2 format
 */
export function migrateV1ToV2(v1Config: ShakespeareConfigV1): ShakespeareConfigV2 {
  const v2Config: ShakespeareConfigV2 = {
    version: 2,
    verbose: v1Config.verbose,
    logLevel: v1Config.logLevel,
    contentCollection: v1Config.contentCollection
  };
  
  // rootDir may not be in v1Config, but will be set by normalizeConfig
  
  // Migrate models configuration
  // Use the 'review' model as the default since it's most commonly used
  if (v1Config.models?.review) {
    v2Config.model = v1Config.models.review;
  }
  
  if (v1Config.providers?.review) {
    v2Config.provider = v1Config.providers.review;
  }
  
  // If both provider and model are specified, create modelOptions
  if (v2Config.provider || v2Config.model) {
    v2Config.modelOptions = {
      provider: v2Config.provider,
      model: v2Config.model
    };
  }
  
  return v2Config;
}

/**
 * Normalize any configuration to V2 format
 */
export function normalizeConfig(rawConfig: any, rootDir?: string): ShakespeareConfigV2 {
  const version = detectConfigVersion(rawConfig);
  validateConfig(rawConfig, version);
  
  let config: ShakespeareConfigV2;
  
  switch (version) {
    case 1: {
      // Add version to v1 config if not present
      const v1Config: ShakespeareConfigV1 = { version: 1, ...rawConfig };
      config = migrateV1ToV2(v1Config);
      console.warn('⚠️  Loading legacy V1 configuration format. Consider migrating to V2 format by adding "version": 2 and updating the structure.');
      break;
    }
    case 2: {
      config = { version: 2, ...rawConfig } as ShakespeareConfigV2;
      break;
    }
    default:
      throw new UnsupportedConfigVersionError(version);
  }
  
  // Set rootDir if provided
  if (rootDir) {
    config.rootDir = rootDir;
  }
  
  return config;
}

/**
 * Check if configuration needs migration
 */
export function needsMigration(config: any): boolean {
  const version = detectConfigVersion(config);
  return version < 2;
}