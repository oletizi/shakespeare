/**
 * Shakespeare CLI - Zero-configuration content management commands
 * Automatically uses workflow configuration from .shakespeare/content-db.json
 */

import { Shakespeare } from '@/index';
import { 
  initConfig, 
  initConfigForce, 
  validateConfig, 
  showConfig, 
  listTemplates, 
  showConfigHelp,
  ConfigTemplate,
  CONFIG_TEMPLATES
} from '@/utils/config-cli';

/**
 * Display CLI help information
 */
function showHelp() {
  console.log(`
🎭 Shakespeare CLI - AI-powered content management

USAGE
  npx shakespeare <command>

COMMANDS
  discover     Discover and index content files
  review       Review all content that needs analysis
  improve      Improve worst-scoring content
  batch        Batch processing operations (review, improve)
  status       Show content health status dashboard
  workflow     Run complete workflow (discover → review → improve)
  config       Configuration management (init, validate, show)
  help         Show this help message

CONFIGURATION
  Shakespeare automatically loads configuration from:
  1. .shakespeare/config.json
  2. shakespeare.config.js/mjs/json
  3. .shakespeare.json
  4. .shakespeare/content-db.json (legacy workflow config)

EXAMPLES
  npx shakespeare discover              # Find and index all content
  npx shakespeare review                # AI review of unreviewed content
  npx shakespeare improve               # Improve lowest-scoring content
  npx shakespeare batch review          # Batch review with parallel processing
  npx shakespeare batch improve 10 3    # Batch improve 10 files, 3 at a time
  npx shakespeare status                # Show content health dashboard
  npx shakespeare workflow              # Complete end-to-end workflow
  npx shakespeare config init astro     # Initialize config for Astro
  npx shakespeare config validate       # Validate current config

For more information, visit: https://github.com/oletizi/shakespeare
  `);
}

/**
 * Main CLI function
 */
async function main() {
  const command = process.argv[2];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    return;
  }

  try {
    console.log('🎭 Shakespeare CLI\n');
    
    // Handle config commands that don't need Shakespeare instance
    if (command === 'config') {
      const subcommand = process.argv[3];
      const options = process.argv.slice(4);
      
      switch (subcommand) {
        case 'init': {
          const template = options[0] as ConfigTemplate || 'astro';
          const forceIndex = options.indexOf('--force');
          const pathIndex = options.indexOf('--path');
          const customPath = pathIndex !== -1 ? options[pathIndex + 1] : undefined;
          
          if (!CONFIG_TEMPLATES[template]) {
            console.log(`❌ Unknown template: ${template}`);
            console.log('Run "npx shakespeare config templates" to see available templates.');
            process.exit(1);
          }
          
          if (forceIndex !== -1) {
            await initConfigForce(template, customPath);
          } else {
            await initConfig(template, customPath);
          }
          break;
        }
        case 'validate':
          await validateConfig();
          break;
        case 'show':
          await showConfig();
          break;
        case 'templates':
          listTemplates();
          break;
        case 'help':
        case undefined:
          showConfigHelp();
          break;
        default:
          console.error(`❌ Unknown config subcommand: ${subcommand}`);
          console.log('Run "npx shakespeare config help" for usage information.');
          process.exit(1);
      }
      return;
    }
    
    // Load Shakespeare with configuration for content commands
    const shakespeare = await Shakespeare.fromConfig();
    
    // Execute content management commands
    switch (command) {
      case 'discover':
        console.log('📂 Running content discovery...');
        await shakespeare.discoverAndReport();
        break;
        
      case 'review':
        console.log('📊 Running content review...');
        await shakespeare.reviewAll();
        break;
        
      case 'improve':
        console.log('🚀 Running content improvement...');
        await shakespeare.improveWorst();
        break;
        
      case 'batch':
        const batchSubcommand = process.argv[3];
        const batchArgs = process.argv.slice(4);
        
        switch (batchSubcommand) {
          case 'review':
            console.log('📦 Running batch review...');
            const batchSize = parseInt(batchArgs[0]) || 5;
            const reviewResult = await shakespeare.reviewAllBatch(batchSize);
            console.log(`\n📊 Batch Review Results:`);
            console.log(`   ✅ Successful: ${reviewResult.successful.length}`);
            console.log(`   ❌ Failed: ${reviewResult.failed.length}`);
            console.log(`   ⏱️  Duration: ${Math.round(reviewResult.summary.duration / 1000)}s`);
            if (reviewResult.failed.length > 0) {
              console.log(`\n❌ Failed files:`);
              reviewResult.failed.forEach(({path, error}) => {
                console.log(`   • ${path}: ${error}`);
              });
            }
            break;
            
          case 'improve':
            console.log('📦 Running batch improvement...');
            const count = parseInt(batchArgs[0]) || 5;
            const improveBatchSize = parseInt(batchArgs[1]) || 3;
            const improveResult = await shakespeare.improveWorstBatch(count, improveBatchSize);
            console.log(`\n🚀 Batch Improvement Results:`);
            console.log(`   ✅ Successful: ${improveResult.successful.length}`);
            console.log(`   ❌ Failed: ${improveResult.failed.length}`);
            console.log(`   ⏱️  Duration: ${Math.round(improveResult.summary.duration / 1000)}s`);
            if (improveResult.failed.length > 0) {
              console.log(`\n❌ Failed files:`);
              improveResult.failed.forEach(({path, error}) => {
                console.log(`   • ${path}: ${error}`);
              });
            }
            break;
            
          case 'help':
          case undefined:
            console.log(`
🎭 Shakespeare Batch Processing Commands

USAGE
  npx shakespeare batch <subcommand> [options]

SUBCOMMANDS
  review [batchSize]           Run batch review (default batch size: 5)
  improve [count] [batchSize]  Run batch improvement (default: 5 files, batch size: 3)
  help                         Show this help

EXAMPLES
  npx shakespeare batch review              # Review all with default batch size (5)
  npx shakespeare batch review 10           # Review all with batch size 10
  npx shakespeare batch improve             # Improve 5 worst files with batch size 3
  npx shakespeare batch improve 10 2        # Improve 10 worst files with batch size 2

BENEFITS
  • Parallel processing for faster operations
  • Controlled concurrency to avoid API rate limits  
  • Better cost optimization through batching
  • Progress tracking and error handling per batch
            `);
            break;
            
          default:
            console.error(`❌ Unknown batch subcommand: ${batchSubcommand}`);
            console.log('Run "npx shakespeare batch help" for usage information.');
            process.exit(1);
        }
        break;
        
      case 'status':
        console.log('📊 Content Health Status\n');
        const status = await shakespeare.getStatus();
        console.log('📈 Overview:');
        console.log(`   📂 Total Files: ${status.totalFiles}`);
        console.log(`   ⏳ Needs Review: ${status.needsReview}`);
        console.log(`   ⚠️  Needs Improvement: ${status.needsImprovement}`);
        console.log(`   ✅ Meets Targets: ${status.meetsTargets}`);
        console.log('');
        
        if (status.averageScore > 0) {
          console.log('📊 Content Quality:');
          console.log(`   📈 Average Score: ${status.averageScore.toFixed(1)}/10`);
          if (status.worstScoring) {
            console.log(`   📉 Lowest Scoring: ${status.worstScoring}`);
          }
          console.log('');
        }
        
        // Show next recommended actions with batch options
        if (status.needsReview > 0) {
          console.log('🔄 Recommended Next Steps:');
          console.log(`   1. Run: npx shakespeare review           # Review ${status.needsReview} files`);
          console.log(`      Or: npx shakespeare batch review      # Batch review for better performance`);
        }
        if (status.needsImprovement > 0) {
          const stepNum = status.needsReview > 0 ? '2' : '1';
          console.log(`   ${stepNum}. Run: npx shakespeare improve          # Improve worst-scoring content`);
          console.log(`      Or: npx shakespeare batch improve     # Batch improve for better performance`);
        }
        if (status.needsReview === 0 && status.needsImprovement === 0) {
          console.log('🎉 All content is up to date!');
        }
        break;
        
      case 'workflow':
        console.log('🔄 Running complete workflow...');
        await shakespeare.runFullWorkflow();
        break;
        
      default:
        console.error(`❌ Unknown command: ${command}`);
        console.log('Run "npx shakespeare help" for usage information.');
        process.exit(1);
    }
    
    console.log('\n✅ Command completed successfully!');
    
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

// Run CLI if this file is executed directly
// Note: In ES modules, we can't use require.main, so we check process.argv[1]
// Check if running via npx/npm bin or directly as cli.js
const isMainModule = process.argv[1]?.includes('cli.js') || process.argv[1]?.includes('shakespeare');
if (isMainModule) {
  main().catch(console.error);
}

export { main as runCLI };