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
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Get Shakespeare version from package.json
 */
function getVersion(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const packageJsonPath = join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Display CLI help information
 */
function showHelp() {
  console.log(`
🎭 Shakespeare CLI v${getVersion()} - AI-powered content management

USAGE
  npx shakespeare <command>

COMMANDS
  discover     Discover and index content files
  review       Review all content that needs analysis
  improve      Improve worst-scoring content
  batch        Batch processing operations (review, improve)
  status       Show content health status dashboard
  roi          Show ROI analysis and diminishing returns
  progress     Manage interrupted improvement jobs (list, resume)
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
  npx shakespeare roi                   # Show ROI analysis and diminishing returns
  npx shakespeare progress list         # List interrupted improvement jobs
  npx shakespeare progress resume <id>  # Resume specific improvement job
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
    console.log(`🎭 Shakespeare CLI v${getVersion()}\n`);
    
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
        const improvePath = process.argv[3];
        const improveModelInfo = await shakespeare.getModelInfoString('improve');
        if (improvePath) {
          console.log(`🚀 Running content improvement for: ${improvePath} using ${improveModelInfo}...`);
          await shakespeare.improveContent(improvePath);
        } else {
          console.log(`🚀 Running content improvement using ${improveModelInfo}...`);
          await shakespeare.improveWorst();
        }
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
        
        // Display cost information
        const costs = status.costSummary;
        if (costs.totalOperations > 0) {
          console.log('💰 Cost Analysis:');
          console.log(`   📊 Total Operations: ${costs.totalOperations}`);
          console.log(`   💰 Total Cost: $${costs.totalCosts.total.toFixed(4)}`);
          console.log(`   📝 Review Costs: $${costs.totalCosts.review.toFixed(4)}`);
          console.log(`   🚀 Improvement Costs: $${costs.totalCosts.improvement.toFixed(4)}`);
          if (costs.totalCosts.generation > 0) {
            console.log(`   ✨ Generation Costs: $${costs.totalCosts.generation.toFixed(4)}`);
          }
          if (costs.averageCostPerQualityPoint > 0) {
            console.log(`   📈 Cost per Quality Point: $${costs.averageCostPerQualityPoint.toFixed(4)}`);
          }
          console.log('');
        }
        
        // Show progress information
        const progressFiles = await shakespeare.listProgressFiles();
        if (progressFiles.length > 0) {
          console.log('🔄 Interrupted Jobs:');
          console.log(`   📋 ${progressFiles.length} interrupted improvement${progressFiles.length === 1 ? '' : 's'}`);
          const totalProgressCost = progressFiles.reduce((sum, p) => sum + p.totalCost, 0);
          if (totalProgressCost > 0) {
            console.log(`   💰 Cost in progress: $${totalProgressCost.toFixed(4)}`);
          }
          console.log(`   💡 Use 'npx shakespeare progress list' to see details`);
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
        
      case 'roi':
        console.log('📊 ROI Analysis & Diminishing Returns\n');
        const roi = await shakespeare.getROIAnalysis();
        
        console.log('💰 Investment Overview:');
        console.log(`   💸 Total Investment: $${roi.totalInvestment.toFixed(4)}`);
        console.log(`   📈 Total Quality Gain: ${roi.totalQualityGain.toFixed(2)} points`);
        console.log(`   💡 Average Cost per Quality Point: $${roi.averageCostPerQualityPoint.toFixed(4)}`);
        console.log('');
        
        if (roi.contentEfficiency.length > 0) {
          console.log('🏆 Content Efficiency Rankings (Best ROI first):');
          roi.contentEfficiency.slice(0, 10).forEach((content, index) => {
            const filename = content.path.split('/').pop() || content.path;
            console.log(`   ${index + 1}. ${filename}`);
            console.log(`      💰 Investment: $${content.investment.toFixed(4)}`);
            console.log(`      📈 Quality Gain: +${content.qualityGain.toFixed(2)} points`);
            console.log(`      ⚡ Efficiency: $${content.efficiency.toFixed(4)}/point`);
            console.log(`      🔄 Iterations: ${content.iterations}`);
            console.log('');
          });
        }
        
        if (roi.diminishingReturns.length > 0) {
          console.log('📉 Diminishing Returns Analysis:');
          roi.diminishingReturns.forEach(content => {
            const filename = content.path.split('/').pop() || content.path;
            console.log(`   📄 ${filename}:`);
            content.iterationEfficiency.forEach(iter => {
              const trendIcon = iter.efficiency > 0.01 ? '📈' : iter.efficiency > 0.005 ? '⚡' : '✅';
              console.log(`      ${trendIcon} Iteration ${iter.iteration}: +${iter.qualityGain.toFixed(2)} points for $${iter.cost.toFixed(4)} ($${iter.efficiency.toFixed(4)}/point)`);
            });
            console.log('');
          });
        }
        
        if (roi.contentEfficiency.length === 0) {
          console.log('ℹ️  No improvement data available yet. Run some improvements to see ROI analysis.');
        }
        break;
        
      case 'progress':
        const progressSubcommand = process.argv[3] || 'list';
        
        switch (progressSubcommand) {
          case 'list':
            console.log('📋 Interrupted Improvement Jobs\n');
            const progressFiles = await shakespeare.listProgressFiles();
            
            if (progressFiles.length === 0) {
              console.log('ℹ️  No interrupted improvement jobs found.');
            } else {
              progressFiles.forEach((progress, index) => {
                console.log(`${index + 1}. ${progress.executionId}`);
                console.log(`   📅 Started: ${progress.startTime}`);
                console.log(`   📊 Progress: ${progress.completedChunks}/${progress.totalChunks} chunks`);
                console.log(`   💰 Cost so far: $${progress.totalCost.toFixed(4)}`);
                console.log(`   📁 Progress file: ${progress.filePath}`);
                console.log('');
              });
              
              console.log(`💡 To resume a job, run: npx shakespeare progress resume <execution-id>`);
            }
            break;
            
          case 'resume':
            const executionId = process.argv[4];
            if (!executionId) {
              console.error('❌ Please provide an execution ID to resume');
              console.log('Usage: npx shakespeare progress resume <execution-id>');
              console.log('Use "npx shakespeare progress list" to see available jobs');
              process.exit(1);
            }
            
            console.log(`🔄 Resuming improvement job: ${executionId}`);
            
            try {
              const result = await shakespeare.resumeProgressJob(executionId);
              console.log(`✅ Job resumed successfully!`);
              console.log(`   📊 Final cost: $${result.totalCost.toFixed(4)}`);
              console.log(`   📄 Content length: ${result.contentLength} characters`);
            } catch (error) {
              console.error(`❌ Failed to resume job: ${error instanceof Error ? error.message : error}`);
              process.exit(1);
            }
            break;
            
          case 'help':
            console.log(`
📋 Progress Command Help

USAGE
  npx shakespeare progress <subcommand>

SUBCOMMANDS
  list             List all interrupted improvement jobs
  resume <id>      Resume a specific improvement job by execution ID
  help             Show this help message

EXAMPLES
  npx shakespeare progress list                    # List interrupted jobs
  npx shakespeare progress resume improve-chunked-1234567890-abcdef123  # Resume specific job
            `);
            break;
            
          default:
            console.error(`❌ Unknown progress subcommand: ${progressSubcommand}`);
            console.log('Run "npx shakespeare progress help" for usage information.');
            process.exit(1);
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
  main().catch((error) => {
    // Only log the error message, not the full stack trace
    // The full error details are already logged to the error log file
    console.error(`❌ ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  });
}

export { main as runCLI };