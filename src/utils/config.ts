import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { ShakespeareConfig } from '@/types/interfaces';

/**
 * Configuration loading and validation utilities
 */

export class InvalidConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidConfigError';
  }
}

/**
 * Find configuration file in current directory or project root
 */
export function findConfigFile(startDir: string = process.cwd()): string | null {
  const configNames = ['.shakespeare.json', 'shakespeare.json'];
  let currentDir = resolve(startDir);

  while (true) {
    for (const configName of configNames) {
      const configPath = join(currentDir, configName);
      if (existsSync(configPath)) {
        return configPath;
      }
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      break; // Reached root directory
    }
    currentDir = parentDir;
  }

  return null;
}

/**
 * Load and validate Shakespeare configuration from file
 */
export function loadConfig(configPath?: string): ShakespeareConfig | null {
  const actualConfigPath = configPath || findConfigFile();
  if (!actualConfigPath) {
    return null;
  }

  try {
    const configData = readFileSync(actualConfigPath, 'utf8');
    const config = JSON.parse(configData) as ShakespeareConfig;
    
    validateConfig(config);
    return config;
  } catch (error: any) {
    if (error instanceof InvalidConfigError) {
      throw error;
    }
    throw new InvalidConfigError(`Failed to load configuration from ${actualConfigPath}: ${error.message}`);
  }
}

/**
 * Validate Shakespeare configuration format
 */
function validateConfig(config: any): void {
  if (!config || typeof config !== 'object') {
    throw new InvalidConfigError('Configuration must be a valid JSON object');
  }

  // Validate model configuration structure if present
  if (config.models) {
    for (const [workflowType, modelConfig] of Object.entries(config.models)) {
      if (!['review', 'improve', 'generate'].includes(workflowType)) {
        throw new InvalidConfigError(`Invalid workflow type in models: ${workflowType}`);
      }
      
      if (typeof modelConfig === 'string') {
        // String format is valid
        continue;
      } else if (typeof modelConfig === 'object' && modelConfig !== null) {
        const obj = modelConfig as any;
        if (!obj.model || typeof obj.model !== 'string') {
          throw new InvalidConfigError(`Model configuration for ${workflowType} must have a 'model' property with string value`);
        }
        if (obj.provider && typeof obj.provider !== 'string') {
          throw new InvalidConfigError(`Provider in ${workflowType} model configuration must be a string`);
        }
      } else {
        throw new InvalidConfigError(`Model configuration for ${workflowType} must be either a string or object with model/provider properties`);
      }
    }
  }

  // Validate taskModelOptions if present
  if (config.taskModelOptions) {
    for (const [workflowType, options] of Object.entries(config.taskModelOptions)) {
      if (!['review', 'improve', 'generate'].includes(workflowType)) {
        throw new InvalidConfigError(`Invalid workflow type in taskModelOptions: ${workflowType}`);
      }
      
      if (typeof options !== 'object' || options === null) {
        throw new InvalidConfigError(`Task model options for ${workflowType} must be an object`);
      }
    }
  }
}