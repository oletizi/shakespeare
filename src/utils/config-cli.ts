/**
 * CLI configuration management utilities
 */

import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { validateConfigSchemaStrict, SchemaValidationError } from '@/utils/schema-validation';
import { ShakespeareConfig } from '@/types/interfaces';

/**
 * Configuration templates for different use cases
 */
export const CONFIG_TEMPLATES = {
  astro: {
    "$schema": "https://schemas.shakespeare.ai/config/v2.json",
    "contentCollection": "astro",
    "verbose": true,
    "logLevel": "info" as const,
    "models": {
      "review": { "model": "gpt-4o-mini", "provider": "tetrate" },
      "improve": { "model": "claude-3-5-sonnet-latest", "provider": "tetrate" },
      "generate": { "model": "claude-3-5-sonnet-latest", "provider": "tetrate" }
    }
  },
  nextjs: {
    "$schema": "https://schemas.shakespeare.ai/config/v2.json",
    "contentCollection": "nextjs",
    "verbose": true,
    "logLevel": "info" as const,
    "models": {
      "review": { "model": "gpt-4o-mini", "provider": "tetrate" },
      "improve": { "model": "claude-3-5-sonnet-latest", "provider": "tetrate" },
      "generate": { "model": "claude-3-5-sonnet-latest", "provider": "tetrate" }
    }
  },
  gatsby: {
    "$schema": "https://schemas.shakespeare.ai/config/v2.json",
    "contentCollection": "gatsby",
    "verbose": true,
    "logLevel": "info" as const,
    "models": {
      "review": { "model": "gemini-1.5-flash-8b", "provider": "google" },
      "improve": { "model": "claude-3-5-sonnet", "provider": "anthropic" }, 
      "generate": { "model": "claude-3-5-sonnet", "provider": "anthropic" }
    }
  },
  costOptimized: {
    "$schema": "https://schemas.shakespeare.ai/config/v2.json",
    "costOptimized": true,
    "verbose": false,
    "logLevel": "info" as const
  },
  qualityFirst: {
    "$schema": "https://schemas.shakespeare.ai/config/v2.json",
    "qualityFirst": true,
    "verbose": true,
    "logLevel": "debug" as const
  },
  minimal: {
    "$schema": "https://schemas.shakespeare.ai/config/v2.json",
    "verbose": false
  }
} as const;

export type ConfigTemplate = keyof typeof CONFIG_TEMPLATES;

/**
 * Initialize a new Shakespeare configuration
 */
export async function initConfig(template: ConfigTemplate = 'astro', customPath?: string): Promise<void> {
  const configDir = join(process.cwd(), '.shakespeare');
  const configPath = customPath || join(configDir, 'config.json');
  
  // Check if config already exists
  if (existsSync(configPath)) {
    console.log(`❌ Configuration already exists at: ${configPath}`);
    console.log('   Use --force to overwrite or choose a different path');
    return;
  }
  
  // Create .shakespeare directory if it doesn't exist
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  
  // Get template configuration
  const config = CONFIG_TEMPLATES[template];
  
  // Write configuration file
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  
  console.log(`✅ Created Shakespeare configuration at: ${configPath}`);
  console.log(`📋 Template: ${template}`);
  console.log('');
  console.log('📝 Next steps:');
  console.log('   1. Edit the config file to customize your setup');
  console.log('   2. Run: npx shakespeare discover');
  console.log('   3. Run: npx shakespeare review');
}

/**
 * Initialize with force overwrite
 */
export async function initConfigForce(template: ConfigTemplate = 'astro', customPath?: string): Promise<void> {
  const configDir = join(process.cwd(), '.shakespeare');
  const configPath = customPath || join(configDir, 'config.json');
  
  // Create .shakespeare directory if it doesn't exist
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  
  // Get template configuration
  const config = CONFIG_TEMPLATES[template];
  
  // Write configuration file
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  
  console.log(`✅ Created Shakespeare configuration at: ${configPath}`);
  console.log(`📋 Template: ${template} (overwrote existing)`);
  console.log('');
  console.log('📝 Next steps:');
  console.log('   1. Edit the config file to customize your setup');
  console.log('   2. Run: npx shakespeare discover');
  console.log('   3. Run: npx shakespeare review');
}

/**
 * Validate current configuration
 */
export async function validateConfig(): Promise<void> {
  const configPaths = [
    join(process.cwd(), '.shakespeare', 'config.json'),
    join(process.cwd(), 'shakespeare.config.json'),
    join(process.cwd(), '.shakespeare.json')
  ];
  
  let configFound = false;
  
  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      configFound = true;
      
      try {
        const configContent = readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        
        console.log(`📋 Validating config: ${configPath}`);
        
        // Validate with schema
        validateConfigSchemaStrict(config);
        
        console.log('✅ Configuration is valid!');
        console.log(`   Version: ${config.version || 'auto-detected'}`);
        console.log(`   Content Collection: ${config.contentCollection || 'auto-detected'}`);
        
        if (config.models) {
          console.log('   Task-specific models:');
          for (const [task, model] of Object.entries(config.models)) {
            console.log(`     ${task}: ${model}`);
          }
        }
        
        if (config.costOptimized) {
          console.log('   Optimization: Cost-optimized (cheap, fast models)');
        } else if (config.qualityFirst) {
          console.log('   Optimization: Quality-first (expensive, best models)');
        }
        
        console.log('');
        
      } catch (error) {
        if (error instanceof SchemaValidationError) {
          console.log(`❌ Configuration validation failed:`);
          console.log(`   File: ${configPath}`);
          console.log(`   Errors:`);
          error.errors.forEach(err => {
            console.log(`     • ${err.path || 'root'}: ${err.message}`);
          });
        } else if (error instanceof SyntaxError) {
          console.log(`❌ JSON syntax error in: ${configPath}`);
          console.log(`   ${error.message}`);
        } else {
          console.log(`❌ Error reading config: ${configPath}`);
          console.log(`   ${error}`);
        }
        process.exit(1);
      }
    }
  }
  
  if (!configFound) {
    console.log('❌ No configuration file found');
    console.log('   Run: npx shakespeare config init');
    process.exit(1);
  }
}

/**
 * Show current configuration
 */
export async function showConfig(): Promise<void> {
  const configPaths = [
    join(process.cwd(), '.shakespeare', 'config.json'),
    join(process.cwd(), 'shakespeare.config.json'),
    join(process.cwd(), '.shakespeare.json')
  ];
  
  let configFound = false;
  
  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      configFound = true;
      
      try {
        const configContent = readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        
        console.log(`📋 Configuration: ${configPath}`);
        console.log('');
        console.log(JSON.stringify(config, null, 2));
        console.log('');
        
        // Show detected properties
        console.log('📊 Detected Properties:');
        console.log(`   Version: ${config.version || 'auto-detected'}`);
        console.log(`   Content Collection: ${config.contentCollection || 'auto-detected'}`);
        console.log(`   Verbose: ${config.verbose || false}`);
        console.log(`   Log Level: ${config.logLevel || 'info'}`);
        
        if (config.models) {
          console.log('   Task Models:');
          for (const [task, modelConfig] of Object.entries(config.models)) {
            if (typeof modelConfig === 'string') {
              console.log(`     ${task}: ${modelConfig} (default provider)`);
            } else if (typeof modelConfig === 'object' && modelConfig) {
              const obj = modelConfig as any;
              const provider = obj.provider || 'default';
              console.log(`     ${task}: ${obj.model} (${provider})`);
            }
          }
        }
        
        if (config.costOptimized) {
          console.log('   🚀 Cost-optimized setup (fast, cheap models)');
        } else if (config.qualityFirst) {
          console.log('   ⭐ Quality-first setup (best models, higher cost)');
        }
        
      } catch (error) {
        console.log(`❌ Error reading config: ${configPath}`);
        console.log(`   ${error}`);
        process.exit(1);
      }
    }
  }
  
  if (!configFound) {
    console.log('❌ No configuration file found');
    console.log('   Run: npx shakespeare config init');
    process.exit(1);
  }
}

/**
 * List available configuration templates
 */
export function listTemplates(): void {
  console.log('📋 Available Configuration Templates:\n');
  
  console.log('🎯 Framework-Specific:');
  console.log('   astro      - Astro projects (src/content/)');
  console.log('   nextjs     - Next.js projects (content/)');
  console.log('   gatsby     - Gatsby projects (content/)');
  console.log('');
  
  console.log('⚡ Optimization Presets:');
  console.log('   costOptimized  - Fast, cheap models (Google Gemini)');
  console.log('   qualityFirst   - Best models, higher cost (Claude Sonnet)');
  console.log('');
  
  console.log('🔧 Other:');
  console.log('   minimal    - Minimal configuration');
  console.log('');
  
  console.log('💡 Usage:');
  console.log('   npx shakespeare config init astro');
  console.log('   npx shakespeare config init costOptimized');
}

/**
 * Show configuration help
 */
export function showConfigHelp(): void {
  console.log(`
🎭 Shakespeare Configuration Commands

USAGE
  npx shakespeare config <subcommand> [options]

SUBCOMMANDS
  init [template]     Initialize new configuration
  validate           Validate current configuration  
  show              Show current configuration
  templates         List available templates
  help              Show this help

TEMPLATES
  astro, nextjs, gatsby, costOptimized, qualityFirst, minimal

OPTIONS
  --force           Overwrite existing configuration
  --path <path>     Custom configuration file path

EXAMPLES
  npx shakespeare config init astro        # Create Astro config
  npx shakespeare config init --force      # Overwrite existing config
  npx shakespeare config validate         # Check config validity
  npx shakespeare config show             # Display current config
  npx shakespeare config templates        # List all templates

For more information, visit: https://github.com/oletizi/shakespeare
  `);
}