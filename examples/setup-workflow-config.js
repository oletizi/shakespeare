#!/usr/bin/env node

/**
 * Example: Setting up workflow configuration in content database
 * This demonstrates how to configure Shakespeare for zero-config scripts
 */

import { Shakespeare } from '../dist/index.js';

console.log('🎭 Setting up workflow configuration...\n');

// Create Shakespeare instance
const shakespeare = new Shakespeare();

// Define workflow configuration
const workflowConfig = {
  contentCollection: 'astro',
  verbose: true,
  
  // Model configuration for different workflow types
  models: {
    review: 'gpt-4o-mini',        // Fast, cheap for bulk review operations
    improve: 'claude-3-5-sonnet', // High quality for content improvement
    generate: 'claude-3-5-sonnet' // High quality for content generation
  },
  
  // Provider configuration
  providers: {
    review: 'openai',
    improve: 'anthropic',
    generate: 'anthropic'
  },
  
  // Workflow-specific settings
  workflows: {
    discover: {
      resetExisting: false,   // Don't reset existing entries
      autoInit: true         // Auto-initialize database
    },
    review: {
      batchSize: 5,          // Process 5 files at a time
      estimateCosts: true,   // Show cost estimates
      retryFailures: true    // Retry failed operations
    },
    improve: {
      maxCount: 3,           // Improve up to 3 files by default
      requireReviewFirst: true, // Ensure content is reviewed first
      targetThreshold: 7.0   // Only improve content scoring below 7.0
    },
    complete: {
      improveCount: 3,       // Improve 3 worst items in complete workflow
      runDiscovery: true     // Run discovery as part of complete workflow
    }
  }
};

// Save configuration to database
await shakespeare.saveWorkflowConfig(workflowConfig);

console.log('✅ Workflow configuration saved to .shakespeare/content-db.json');
console.log('\nNow you can use zero-configuration scripts:');
console.log('  • node examples/zero-config-scripts/content-discover.js');
console.log('  • node examples/zero-config-scripts/content-review.js');
console.log('  • node examples/zero-config-scripts/content-improve.js');
console.log('  • node examples/zero-config-scripts/content-workflow.js');
console.log('\nEach script is just 2 lines and uses the configuration automatically!');

// Verify configuration was saved
const savedConfig = await shakespeare.getWorkflowConfig();
console.log('\n📋 Configuration saved:');
console.log(JSON.stringify(savedConfig, null, 2));