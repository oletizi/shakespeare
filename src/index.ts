import { ContentScanner } from '@/utils/scanner';
import { ContentDatabaseHandler } from '@/utils/database';
import { DEFAULT_TARGET_SCORES } from '@/utils/constants';
import { ContentEntry, QualityDimensions } from '@/types/content';
import { AIScorer, AIContentAnalysis, AIScorerOptions } from '@/utils/ai';
import { GooseAI } from '@/utils/goose';
import { IContentScanner, IContentDatabase, IContentScorer, ContentCollectionConfig, CONTENT_COLLECTIONS, AIModelOptions, WorkflowConfig } from '@/types/interfaces';
import path from 'path';
import fs from 'fs/promises';

export * from '@/types/content';
export * from '@/types/interfaces';
export { GooseAI } from '@/utils/goose';
export { AIScorer } from '@/utils/ai';

/**
 * Options for Shakespeare constructor
 */
export interface ShakespeareOptions {
  scanner?: IContentScanner;
  database?: IContentDatabase;
  ai?: IContentScorer;
  /** AI model configuration for cost optimization */
  aiOptions?: AIScorerOptions;
  /** Default AI model options (provider, model, etc.) */
  defaultModelOptions?: AIModelOptions;
  /** Content collection configuration */
  contentCollection?: ContentCollectionConfig | keyof typeof CONTENT_COLLECTIONS;
}

/**
 * High-level configuration options for simplified setup
 */
export interface ShakespeareConfig {
  /** Use cost-optimized models (cheap, fast) */
  costOptimized?: boolean;
  /** Use quality-first models (expensive, best results) */
  qualityFirst?: boolean;
  /** Override specific model */
  model?: string;
  /** Override specific provider */
  provider?: string;
  /** Custom model options */
  modelOptions?: AIModelOptions;
  /** Enable verbose progress reporting */
  verbose?: boolean;
  /** Project root directory */
  rootDir?: string;
  /** Database path override */
  dbPath?: string;
  /** Content collection override */
  contentCollection?: ContentCollectionConfig | keyof typeof CONTENT_COLLECTIONS;
}

/**
 * Result of a workflow operation
 */
export interface WorkflowResult {
  /** Successfully processed items */
  successful: string[];
  /** Failed items with error messages */
  failed: { path: string; error: string }[];
  /** Summary statistics */
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    duration: number;
  };
}

export class Shakespeare {
  private scanner: IContentScanner;
  private db: IContentDatabase;
  private ai: IContentScorer;
  private rootDir: string;
  private dbPath: string;
  private verbose: boolean = false;

  constructor(rootDir: string = process.cwd(), dbPath?: string, options: ShakespeareOptions = {}) {
    this.rootDir = rootDir;
    this.dbPath = dbPath ?? path.join(rootDir, '.shakespeare', 'content-db.json');
    
    // Create scanner with content collection configuration
    this.scanner = options.scanner ?? new ContentScanner(rootDir, options.contentCollection);
    this.db = options.database ?? new ContentDatabaseHandler(this.dbPath);
    
    // Create AI scorer with proper configuration for cost optimization
    if (options.ai) {
      this.ai = options.ai;
    } else {
      // Create AIScorer with cost-optimized configuration
      let aiScorerOptions: AIScorerOptions = {};
      
      if (options.aiOptions) {
        aiScorerOptions = options.aiOptions;
      } else if (options.defaultModelOptions) {
        // Create a GooseAI instance with the specified model options
        const gooseAI = new GooseAI(rootDir, options.defaultModelOptions);
        aiScorerOptions = { ai: gooseAI };
      }
      
      this.ai = new AIScorer(aiScorerOptions);
    }

    // Ensure database directory exists
    const dbDir = path.dirname(this.dbPath);
    fs.mkdir(dbDir, { recursive: true }).catch(console.error);
  }

  /**
   * Initialize the system
   */
  async initialize(): Promise<void> {
    await this.db.load();
  }

  /**
   * Discover and index content without scoring (lightweight operation)
   * Creates database entries for new files with 'needs_review' status
   */
  async discoverContent(): Promise<string[]> {
    const files = await this.scanner.scanContent();
    const database = this.db.getData();
    const newFiles: string[] = [];

    for (const file of files) {
      if (!database.entries[file]) {
        // Create lightweight entry without AI scoring
        const newEntry: ContentEntry = {
          path: file,
          currentScores: {
            readability: 0,
            seoScore: 0,
            technicalAccuracy: 0,
            engagement: 0,
            contentDepth: 0
          },
          targetScores: DEFAULT_TARGET_SCORES,
          lastReviewDate: new Date().toISOString(),
          improvementIterations: 0,
          status: 'needs_review', // Mark as unreviewed
          reviewHistory: []
        };

        await this.db.updateEntry(file, (_entry: ContentEntry | undefined) => newEntry);
        newFiles.push(file);
      }
    }

    // Update database timestamp
    await this.db.save();
    
    return newFiles;
  }

  /**
   * Update content index with new files
   */
  async updateContentIndex(): Promise<void> {
    const files = await this.scanner.scanContent();
    const database = this.db.getData();

    for (const file of files) {
      if (!database.entries[file]) {
        // Initialize new content entry
        const content = await this.scanner.readContent(file);
        const analysis = await this.ai.scoreContent(content);

        const newEntry: ContentEntry = {
          path: file,
          currentScores: analysis.scores,
          targetScores: DEFAULT_TARGET_SCORES,
          lastReviewDate: new Date().toISOString(),
          improvementIterations: 0,
          status: this.determineStatus(analysis.scores),
          reviewHistory: [{
            date: new Date().toISOString(),
            scores: analysis.scores,
            improvements: []
          }]
        };

        await this.db.updateEntry(file, (_entry: ContentEntry | undefined) => newEntry);
      }
    }
  }

  /**
   * Get the current database data
   */
  getDatabaseData() {
    return this.db.getData();
  }

  /**
   * Get content that needs review (unreviewed/discovered content)
   */
  getContentNeedingReview(): string[] {
    const database = this.db.getData();
    return Object.entries(database.entries)
      .filter(([_, entry]) => entry.status === 'needs_review')
      .map(([path, _]) => path);
  }

  /**
   * Review/score a specific content file
   */
  async reviewContent(path: string): Promise<void> {
    const database = this.db.getData();
    const entry = database.entries[path];
    
    if (!entry) {
      throw new Error(`Content not found: ${path}`);
    }

    if (entry.status !== 'needs_review') {
      throw new Error(`Content has already been reviewed: ${path}`);
    }

    // Score the content with AI
    const content = await this.scanner.readContent(path);
    const analysis = await this.ai.scoreContent(content);

    // Update entry with scores and proper status
    const updatedEntry: ContentEntry = {
      ...entry,
      currentScores: analysis.scores,
      lastReviewDate: new Date().toISOString(),
      status: this.determineStatus(analysis.scores),
      reviewHistory: [{
        date: new Date().toISOString(),
        scores: analysis.scores,
        improvements: []
      }]
    };

    await this.db.updateEntry(path, () => updatedEntry);
    await this.db.save();
  }

  /**
   * Get the entry with the lowest average score (excludes unreviewed content)
   */
  getWorstScoringContent(): string | null {
    const database = this.db.getData();
    let worstScore = Infinity;
    let worstPath: string | null = null;

    for (const [path, entry] of Object.entries(database.entries)) {
      // Skip content that meets targets or hasn't been reviewed yet
      if (entry.status === 'meets_targets' || entry.status === 'needs_review') continue;

      const avgScore = Object.values(entry.currentScores).reduce((a, b) => a + b, 0) / 
        Object.keys(entry.currentScores).length;

      // Also skip content with zero scores (unreviewed)
      if (avgScore === 0) continue;

      if (avgScore < worstScore) {
        worstScore = avgScore;
        worstPath = path;
      }
    }

    return worstPath;
  }

  /**
   * Improve content at the specified path
   */
  async improveContent(path: string): Promise<void> {
    const database = this.db.getData();
    const entry = database.entries[path];

    if (!entry) {
      throw new Error(`No content found at path: ${path}`);
    }

    // Read current content
    const content = await this.scanner.readContent(path);
    
    // Get current analysis
    const analysis = await this.ai.scoreContent(content);
    
    // Generate improved content with better error handling
    let improvedContent: string;
    try {
      console.log(`📝 Attempting to improve content with ${content.length} characters...`);
      
      // Get workflow-specific model options for improvement
      const improveOptions = await this.getWorkflowModelOptions('improve');
      
      if ('improveContentWithCosts' in this.ai && typeof this.ai.improveContentWithCosts === 'function') {
        const response = await (this.ai as any).improveContentWithCosts(content, analysis, improveOptions);
        improvedContent = response.content;
      } else {
        // Fallback for basic AI implementations
        improvedContent = await this.ai.improveContent(content, analysis);
      }
      
      console.log(`✅ Content improvement successful, got ${improvedContent.length} characters back`);
      
      // Validate that we actually got improved content
      if (!improvedContent || improvedContent.trim().length === 0) {
        throw new Error('AI returned empty improved content');
      }
      
      if (improvedContent === content) {
        console.log('⚠️  Warning: Improved content is identical to original');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Content improvement failed: ${errorMessage}`);
      throw error; // Re-throw to prevent silent failures
    }
    
    // Score the improved content
    const newAnalysis = await this.ai.scoreContent(improvedContent);
    
    // Update the content file
    try {
      await fs.writeFile(path, improvedContent, 'utf-8');
      console.log(`📄 Successfully wrote improved content to ${path}`);
    } catch (writeError) {
      const errorMessage = writeError instanceof Error ? writeError.message : String(writeError);
      console.error(`❌ Failed to write improved content to file: ${errorMessage}`);
      throw writeError;
    }
    
    // Update database entry
    await this.db.updateEntry(path, (entry: ContentEntry | undefined) => {
      if (!entry) {
        throw new Error(`Entry not found for path: ${path}`);
      }
      return {
        ...entry,
        currentScores: newAnalysis.scores,
        lastReviewDate: new Date().toISOString(),
        improvementIterations: entry.improvementIterations + 1,
        status: this.determineStatus(newAnalysis.scores),
        reviewHistory: [
          ...entry.reviewHistory,
          {
            date: new Date().toISOString(),
            scores: newAnalysis.scores,
            improvements: Object.values(analysis.analysis).flatMap(a => a.suggestions)
          }
        ]
      };
    });
  }

  /**
   * Determine content status based on scores
   */
  private determineStatus(scores: QualityDimensions): ContentEntry['status'] {
    const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / 
      Object.keys(scores).length;

    if (avgScore >= 8.5) return 'meets_targets';
    if (avgScore >= 7.0) return 'needs_improvement';
    return 'needs_review';
  }

  /**
   * Set verbose logging for progress reporting
   */
  setVerbose(verbose: boolean): void {
    this.verbose = verbose;
  }

  /**
   * Log message if verbose mode is enabled
   */
  private log(message: string): void {
    if (this.verbose) {
      console.log(message);
    }
  }

  // ========== HIGH-LEVEL WORKFLOW METHODS ==========

  /**
   * Discover content and provide detailed reporting
   */
  async discoverAndReport(): Promise<WorkflowResult> {
    const startTime = Date.now();
    this.log('🔍 Starting content discovery...');
    
    try {
      const discovered = await this.discoverContent();
      const duration = Date.now() - startTime;
      
      this.log(`📊 Discovery completed: ${discovered.length} files found`);
      if (discovered.length > 0) {
        discovered.forEach(file => this.log(`  📄 ${path.basename(file)}`));
      }
      
      return {
        successful: discovered,
        failed: [],
        summary: {
          total: discovered.length,
          succeeded: discovered.length,
          failed: 0,
          duration
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`❌ Discovery failed: ${errorMessage}`);
      
      return {
        successful: [],
        failed: [{ path: 'discovery', error: errorMessage }],
        summary: {
          total: 0,
          succeeded: 0,
          failed: 1,
          duration: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Review all content that needs review
   */
  async reviewAll(): Promise<WorkflowResult> {
    const startTime = Date.now();
    this.log('📊 Starting content review...');
    
    await this.initialize();
    const database = this.db.getData();
    const contentNeedingReview = Object.entries(database.entries)
      .filter(([, entry]) => entry.status === 'needs_review')
      .map(([path]) => path);

    if (contentNeedingReview.length === 0) {
      this.log('✅ No content needs review');
      return {
        successful: [],
        failed: [],
        summary: { total: 0, succeeded: 0, failed: 0, duration: Date.now() - startTime }
      };
    }

    this.log(`📝 Found ${contentNeedingReview.length} files needing review`);

    const successful: string[] = [];
    const failed: { path: string; error: string }[] = [];

    for (let i = 0; i < contentNeedingReview.length; i++) {
      const filePath = contentNeedingReview[i];
      try {
        this.log(`📊 Reviewing ${path.basename(filePath)} (${i + 1}/${contentNeedingReview.length})`);
        await this.reviewContent(filePath);
        successful.push(filePath);
        this.log(`✅ Reviewed: ${path.basename(filePath)}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        failed.push({ path: filePath, error: errorMessage });
        this.log(`❌ Failed to review ${path.basename(filePath)}: ${errorMessage}`);
      }
    }

    const duration = Date.now() - startTime;
    this.log(`🎉 Review completed: ${successful.length} succeeded, ${failed.length} failed`);

    return {
      successful,
      failed,
      summary: {
        total: contentNeedingReview.length,
        succeeded: successful.length,
        failed: failed.length,
        duration
      }
    };
  }

  /**
   * Improve the worst-scoring content
   */
  async improveWorst(count: number = 1): Promise<WorkflowResult> {
    const startTime = Date.now();
    this.log(`🚀 Starting improvement of ${count} worst-scoring content...`);
    
    await this.initialize();
    const successful: string[] = [];
    const failed: { path: string; error: string }[] = [];

    for (let i = 0; i < count; i++) {
      try {
        const worstPath = this.getWorstScoringContent();
        if (!worstPath) {
          this.log('✅ No content needs improvement');
          break;
        }

        this.log(`📝 Improving ${path.basename(worstPath)} (${i + 1}/${count})`);
        await this.improveContent(worstPath);
        successful.push(worstPath);
        this.log(`✅ Improved: ${path.basename(worstPath)}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        failed.push({ path: 'improvement', error: errorMessage });
        this.log(`❌ Improvement failed: ${errorMessage}`);
      }
    }

    const duration = Date.now() - startTime;
    this.log(`🎉 Improvement completed: ${successful.length} succeeded, ${failed.length} failed`);

    return {
      successful,
      failed,
      summary: {
        total: count,
        succeeded: successful.length,
        failed: failed.length,
        duration
      }
    };
  }

  /**
   * Run the complete workflow: discover -> review -> improve
   */
  async runFullWorkflow(options: { improveCount?: number } = {}): Promise<{
    discovery: WorkflowResult;
    review: WorkflowResult;
    improvement: WorkflowResult;
  }> {
    this.log('🎭 Starting complete Shakespeare workflow...');

    const discovery = await this.discoverAndReport();
    const review = await this.reviewAll();
    const improvement = await this.improveWorst(options.improveCount || 1);

    this.log('🎉 Complete workflow finished!');

    return {
      discovery,
      review,
      improvement
    };
  }

  /**
   * Get content health status dashboard
   */
  async getStatus(): Promise<{
    totalFiles: number;
    needsReview: number;
    needsImprovement: number;
    meetsTargets: number;
    averageScore: number;
    worstScoring: string | null;
  }> {
    await this.initialize();
    const database = this.db.getData();
    const entries = Object.entries(database.entries);

    const needsReview = entries.filter(([, entry]) => entry.status === 'needs_review').length;
    const needsImprovement = entries.filter(([, entry]) => entry.status === 'needs_improvement').length;
    const meetsTargets = entries.filter(([, entry]) => entry.status === 'meets_targets').length;

    const scores = entries.map(([, entry]) => {
      const scores = Object.values(entry.currentScores || {});
      return scores.reduce((a, b) => a + b, 0) / scores.length;
    }).filter(score => !isNaN(score));

    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const worstScoring = this.getWorstScoringContent();

    return {
      totalFiles: entries.length,
      needsReview,
      needsImprovement,
      meetsTargets,
      averageScore: Math.round(averageScore * 10) / 10,
      worstScoring
    };
  }

  // ========== STATIC FACTORY METHODS ==========

  /**
   * Create Shakespeare instance with smart defaults and auto-detection
   */
  static async create(config: ShakespeareConfig = {}): Promise<Shakespeare> {
    const rootDir = config.rootDir || process.cwd();
    const dbPath = config.dbPath;
    
    // Auto-detect project type if not specified
    const detectedType = await detectProjectType(rootDir);
    const contentCollection = config.contentCollection || detectedType;
    
    // Get optimized model options
    const defaultModelOptions = getOptimizedModelOptions(config);
    
    const options: ShakespeareOptions = {
      contentCollection,
      defaultModelOptions
    };
    
    const shakespeare = new Shakespeare(rootDir, dbPath, options);
    
    if (config.verbose) {
      shakespeare.setVerbose(true);
    }
    
    return shakespeare;
  }

  /**
   * Create Shakespeare from configuration file or database config
   */
  static async fromConfig(configPath?: string): Promise<Shakespeare> {
    const { join } = await import('path');
    const { existsSync, readFileSync } = await import('fs');
    const rootDir = process.cwd();
    
    // Try to find external config file first
    const possiblePaths = [
      configPath,
      join(rootDir, 'shakespeare.config.js'),
      join(rootDir, 'shakespeare.config.mjs'),
      join(rootDir, 'shakespeare.config.json'),
      join(rootDir, '.shakespeare.json')
    ].filter(Boolean);
    
    for (const configFile of possiblePaths) {
      try {
        if (existsSync(configFile!)) {
          let config: ShakespeareConfig;
          
          if (configFile!.endsWith('.json')) {
            config = JSON.parse(readFileSync(configFile!, 'utf-8'));
          } else {
            // Dynamic import for JS/MJS files
            const configModule = await import(configFile!);
            config = configModule.default || configModule;
          }
          
          return await Shakespeare.create(config);
        }
      } catch (error) {
        console.warn(`Failed to load config from ${configFile}: ${error}`);
      }
    }
    
    // Try to load configuration from content database
    try {
      const dbPath = join(rootDir, '.shakespeare', 'content-db.json');
      if (existsSync(dbPath)) {
        const db = JSON.parse(readFileSync(dbPath, 'utf-8'));
        if (db.config) {
          // Convert WorkflowConfig to ShakespeareConfig
          const shakespeareConfig = await Shakespeare.workflowConfigToShakespeareConfig(db.config, rootDir);
          return await Shakespeare.create(shakespeareConfig);
        }
      }
    } catch (error) {
      console.warn(`Failed to load config from database: ${error}`);
    }
    
    // Fallback to default configuration
    return await Shakespeare.create();
  }

  /**
   * Convert WorkflowConfig to ShakespeareConfig
   */
  private static async workflowConfigToShakespeareConfig(workflowConfig: WorkflowConfig, rootDir: string): Promise<ShakespeareConfig> {
    const config: ShakespeareConfig = {
      rootDir,
      verbose: workflowConfig.verbose
    };

    // Set content collection if specified
    if (workflowConfig.contentCollection) {
      config.contentCollection = workflowConfig.contentCollection;
    }

    // Configure models - use review model as default since it's most commonly used
    if (workflowConfig.models?.review) {
      config.model = workflowConfig.models.review;
    }

    if (workflowConfig.providers?.review) {
      config.provider = workflowConfig.providers.review;
    }

    // If both provider and model are specified, combine them
    if (config.provider || config.model) {
      config.modelOptions = {
        provider: config.provider,
        model: config.model
      };
    }

    return config;
  }

  // ========== WORKFLOW CONFIGURATION METHODS ==========

  /**
   * Save workflow configuration to the content database
   */
  async saveWorkflowConfig(workflowConfig: WorkflowConfig): Promise<void> {
    await this.db.load();
    const currentData = this.db.getData();
    currentData.config = workflowConfig;
    await this.db.save();
    this.log('💾 Workflow configuration saved to content database');
  }

  /**
   * Get current workflow configuration from database
   */
  async getWorkflowConfig(): Promise<WorkflowConfig | undefined> {
    await this.db.load();
    return this.db.getData().config;
  }

  /**
   * Get workflow-specific model options for an operation type
   */
  private async getWorkflowModelOptions(workflowType: 'review' | 'improve' | 'generate'): Promise<AIModelOptions | undefined> {
    const config = await this.getWorkflowConfig();
    if (!config) return undefined;

    const provider = config.providers?.[workflowType];
    const model = config.models?.[workflowType];

    if (provider || model) {
      return { provider, model };
    }

    return undefined;
  }
}

/**
 * Factory function for creating Shakespeare instances
 */
export function createShakespeare(rootDir?: string, dbPath?: string, options?: ShakespeareOptions): Shakespeare {
  return new Shakespeare(rootDir, dbPath, options);
}

/**
 * Auto-detect project type based on file structure
 */
async function detectProjectType(rootDir: string): Promise<keyof typeof CONTENT_COLLECTIONS | 'custom'> {
  try {
    const { existsSync } = await import('fs');
    const { join } = await import('path');
    
    // Check for Astro
    if (existsSync(join(rootDir, 'astro.config.mjs')) || 
        existsSync(join(rootDir, 'astro.config.js')) ||
        existsSync(join(rootDir, 'src/content'))) {
      return 'astro';
    }
    
    // Check for Next.js
    if (existsSync(join(rootDir, 'next.config.js')) || 
        existsSync(join(rootDir, 'next.config.mjs'))) {
      return 'nextjs';
    }
    
    // Check for Gatsby
    if (existsSync(join(rootDir, 'gatsby-config.js')) || 
        existsSync(join(rootDir, 'gatsby-config.ts'))) {
      return 'gatsby';
    }
    
    return 'custom';
  } catch {
    return 'custom';
  }
}

/**
 * Get model options based on optimization preference
 */
function getOptimizedModelOptions(config: ShakespeareConfig): AIModelOptions | undefined {
  if (config.modelOptions) return config.modelOptions;
  
  if (config.model || config.provider) {
    return {
      provider: config.provider,
      model: config.model
    };
  }
  
  if (config.costOptimized) {
    return {
      provider: 'google',
      model: 'gemini-1.5-flash'
    };
  }
  
  if (config.qualityFirst) {
    return {
      provider: 'anthropic', 
      model: 'claude-3-5-sonnet'
    };
  }
  
  return undefined;
}

/**
 * Legacy factory functions (maintained for backward compatibility)
 */
export const ShakespeareFactory = {
  /** Create Shakespeare for Astro projects with content collections */
  forAstro: (rootDir?: string, dbPath?: string, options: ShakespeareOptions = {}) => 
    new Shakespeare(rootDir, dbPath, { ...options, contentCollection: 'astro' }),
  
  /** Create Shakespeare for Next.js projects */
  forNextJS: (rootDir?: string, dbPath?: string, options: ShakespeareOptions = {}) =>
    new Shakespeare(rootDir, dbPath, { ...options, contentCollection: 'nextjs' }),
  
  /** Create Shakespeare for Gatsby projects */
  forGatsby: (rootDir?: string, dbPath?: string, options: ShakespeareOptions = {}) =>
    new Shakespeare(rootDir, dbPath, { ...options, contentCollection: 'gatsby' }),
  
  /** Create Shakespeare with custom content collection configuration */
  forCustom: (contentConfig: ContentCollectionConfig, rootDir?: string, dbPath?: string, options: ShakespeareOptions = {}) =>
    new Shakespeare(rootDir, dbPath, { ...options, contentCollection: contentConfig }),

  /** Create cost-optimized Shakespeare with specific model configuration */
  withCostOptimization: (modelOptions: AIModelOptions, rootDir?: string, dbPath?: string, options: ShakespeareOptions = {}) =>
    new Shakespeare(rootDir, dbPath, { ...options, defaultModelOptions: modelOptions })
};
