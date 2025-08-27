import { ContentScanner } from '@/utils/scanner';
import { ContentDatabaseHandler } from '@/utils/database';
import { DEFAULT_TARGET_SCORES } from '@/utils/constants';
import { ContentEntry, QualityDimensions, ContentStatus } from '@/types/content';
import { AIScorer, AIContentAnalysis, AIScorerOptions } from '@/utils/ai';
import { GooseAI } from '@/utils/goose';
import { ShakespeareLogger } from '@/utils/logger';
import { IContentScanner, IContentDatabase, IContentScorer, ContentCollectionConfig, CONTENT_COLLECTIONS, AIModelOptions, WorkflowConfig, ShakespeareConfig, ShakespeareConfigV1, ShakespeareConfigV2 } from '@/types/interfaces';
import { normalizeConfig, UnsupportedConfigVersionError, InvalidConfigError } from '@/utils/config';
import path from 'path';
import fs from 'fs/promises';

export * from '@/types/content';
export * from '@/types/interfaces';
export { GooseAI } from '@/utils/goose';
export { AIScorer } from '@/utils/ai';
export * from '@/utils/schema-validation';

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

// ShakespeareConfig is now imported from types/interfaces.ts

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
  private _db: IContentDatabase;
  private ai: IContentScorer;
  private rootDir: string;
  private dbPath: string;
  public logger: ShakespeareLogger;
  private verbose: boolean = false;
  
  /** Configuration used to create this instance */
  public readonly config: ShakespeareConfigV2;
  
  /** Model options being used for AI operations */
  public readonly modelOptions?: AIModelOptions;

  /**
   * Get database instance for testing purposes
   * @internal
   */
  get db(): IContentDatabase {
    return this._db;
  }

  constructor(rootDir: string = process.cwd(), dbPath?: string, options: ShakespeareOptions = {}) {
    this.rootDir = rootDir;
    this.dbPath = dbPath ?? path.join(rootDir, '.shakespeare', 'content-db.json');
    
    // Initialize logger
    this.logger = new ShakespeareLogger();
    
    // Store configuration for public access (rootDir is not part of config)
    this.config = {
      version: 2,
      dbPath,
      contentCollection: options.contentCollection,
      verbose: false, // Will be updated by setVerbose() if needed
      model: options.defaultModelOptions?.model,
      provider: options.defaultModelOptions?.provider,
      modelOptions: options.defaultModelOptions
    };
    this.modelOptions = options.defaultModelOptions;
    
    // Create scanner with content collection configuration
    this.scanner = options.scanner ?? new ContentScanner(rootDir, options.contentCollection);
    this._db = options.database ?? new ContentDatabaseHandler(this.dbPath);
    
    // Create AI scorer with proper configuration for cost optimization
    if (options.ai) {
      this.ai = options.ai;
    } else {
      // Create AIScorer with cost-optimized configuration
      let aiScorerOptions: AIScorerOptions = {};
      
      if (options.aiOptions) {
        aiScorerOptions = options.aiOptions;
      } else if (options.defaultModelOptions) {
        // Create a GooseAI instance with the specified model options and logger
        const gooseAI = new GooseAI(rootDir, options.defaultModelOptions, this.logger);
        aiScorerOptions = { ai: gooseAI };
      } else {
        // Create default GooseAI with logger
        const gooseAI = new GooseAI(rootDir, {}, this.logger);
        aiScorerOptions = { ai: gooseAI };
      }
      
      this.ai = new AIScorer(aiScorerOptions);
    }

    // Ensure database directory exists
    const dbDir = path.dirname(this.dbPath);
    fs.mkdir(dbDir, { recursive: true }).catch(err => this.logger.error(`Failed to create database directory: ${err}`));
  }

  /**
   * Initialize the system
   */
  async initialize(): Promise<void> {
    await this._db.load();
  }

  /**
   * Discover and index content without scoring (lightweight operation)
   * Creates database entries for new files with 'needs_review' status
   */
  async discoverContent(): Promise<string[]> {
    const files = await this.scanner.scanContent();
    const database = this._db.getData();
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

        await this._db.updateEntry(file, (_entry: ContentEntry | undefined) => newEntry);
        newFiles.push(file);
      }
    }

    // Update database timestamp
    await this._db.save();
    
    return newFiles;
  }

  /**
   * Update content index with new files
   */
  async updateContentIndex(): Promise<void> {
    const files = await this.scanner.scanContent();
    const database = this._db.getData();

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

        await this._db.updateEntry(file, (_entry: ContentEntry | undefined) => newEntry);
      }
    }
  }

  /**
   * Get the current database data
   */
  getDatabaseData() {
    return this._db.getData();
  }

  /**
   * Get content that needs review (unreviewed/discovered content)
   * @deprecated Use getContentNeedingReviewDetails() for full content objects
   */
  getContentNeedingReview(): string[] {
    // Ensure database is loaded
    if (!this._db.getData().lastUpdated) {
      this.logger.warn('Database not loaded. Call initialize() first.');
    }
    const database = this._db.getData();
    return Object.entries(database.entries || {})
      .filter(([_, entry]) => entry.status === 'needs_review')
      .map(([path, _]) => path);
  }

  /**
   * Get detailed content objects that need review
   */
  getContentNeedingReviewDetails(): ContentEntry[] {
    // Ensure database is loaded
    if (!this._db.getData().lastUpdated) {
      this.logger.warn('Database not loaded. Call initialize() first.');
    }
    const database = this._db.getData();
    return Object.entries(database.entries || {})
      .filter(([_, entry]) => entry.status === 'needs_review')
      .map(([_, entry]) => entry);
  }

  /**
   * Get content entries by status
   */
  getContentByStatus(status: ContentStatus): ContentEntry[] {
    // Ensure database is loaded
    if (!this._db.getData().lastUpdated) {
      this.logger.warn('Database not loaded. Call initialize() first.');
    }
    const database = this._db.getData();
    return Object.entries(database.entries || {})
      .filter(([_, entry]) => entry.status === status)
      .map(([_, entry]) => entry);
  }

  /**
   * Review/score a specific content file
   */
  async reviewContent(path: string): Promise<void> {
    const database = this._db.getData();
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

    await this._db.updateEntry(path, () => updatedEntry);
    await this._db.save();
  }

  /**
   * Get the entry with the lowest average score (excludes unreviewed content)
   */
  getWorstScoringContent(): string | null {
    const database = this._db.getData();
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
    const database = this._db.getData();
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
      this.logger.info(`📝 Attempting to improve content with ${content.length} characters...`);
      
      // Get workflow-specific model options for improvement
      const improveOptions = await this.getWorkflowModelOptions('improve');
      
      if ('improveContentWithCosts' in this.ai && typeof this.ai.improveContentWithCosts === 'function') {
        const response = await (this.ai as any).improveContentWithCosts(content, analysis, improveOptions);
        improvedContent = response.content;
      } else {
        // Fallback for basic AI implementations
        improvedContent = await this.ai.improveContent(content, analysis);
      }
      
      this.logger.info(`✅ Content improvement successful, got ${improvedContent.length} characters back`);
      
      // Validate that we actually got improved content
      if (!improvedContent || improvedContent.trim().length === 0) {
        throw new Error('AI returned empty improved content');
      }
      
      if (improvedContent === content) {
        this.logger.warn('⚠️  Warning: Improved content is identical to original');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Content improvement failed: ${errorMessage}`);
      throw error; // Re-throw to prevent silent failures
    }
    
    // Score the improved content
    const newAnalysis = await this.ai.scoreContent(improvedContent);
    
    // Update the content file
    try {
      await fs.writeFile(path, improvedContent, 'utf-8');
      this.logger.info(`📄 Successfully wrote improved content to ${path}`);
    } catch (writeError) {
      const errorMessage = writeError instanceof Error ? writeError.message : String(writeError);
      this.logger.error(`❌ Failed to write improved content to file: ${errorMessage}`);
      throw writeError;
    }
    
    // Update database entry
    await this._db.updateEntry(path, (entry: ContentEntry | undefined) => {
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
    this.logger.setVerbose(verbose);
    // Update the public config to reflect the change
    (this.config as any).verbose = verbose;
  }

  /**
   * Get current verbose setting
   */
  isVerbose(): boolean {
    return this.verbose;
  }

  /**
   * Get current model options being used
   */
  getModelOptions(): AIModelOptions | undefined {
    return this.modelOptions;
  }

  /**
   * Log message using structured logger
   * @param message - The message to log
   * @param level - Log level: 'always' (always log), 'verbose' (only when verbose), 'debug' (extra detail)
   */
  private log(message: string, level: 'always' | 'verbose' | 'debug' = 'verbose'): void {
    switch (level) {
      case 'always':
        this.logger.always(message);
        break;
      case 'verbose':
        this.logger.verbose(message);
        break;
      case 'debug':
        this.logger.debug(message);
        break;
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
    this.log('📊 Starting content review...', 'always');
    
    // Show configuration details in verbose mode
    if (this.verbose) {
      this.log('🔧 Configuration Details:');
      this.log(`   Root Directory: ${this.rootDir}`);
      this.log(`   Database Path: ${this.dbPath}`);
      this.log(`   Content Collection: ${this.config.contentCollection || 'auto-detected'}`);
      this.log(`   Model: ${this.config.model || 'default'}`);
      this.log(`   Provider: ${this.config.provider || 'default'}`);
      this.log(`   Verbose Mode: ${this.verbose ? '✓ enabled' : '✗ disabled'}`);
      this.log('');
    }
    
    await this.initialize();
    const database = this._db.getData();
    
    this.log('📋 Database Status:', 'always');
    this.log(`   Total entries: ${Object.keys(database.entries || {}).length}`, 'always');
    this.log(`   Last updated: ${database.lastUpdated || 'never'}`, 'always');
    
    const allEntries = Object.entries(database.entries || {});
    const statusCounts = allEntries.reduce((counts, [, entry]) => {
      counts[entry.status] = (counts[entry.status] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    this.log('   Status breakdown:', 'always');
    Object.entries(statusCounts).forEach(([status, count]) => {
      this.log(`     ${status}: ${count}`, 'always');
    });
    this.log('', 'always');
    
    const contentNeedingReview = allEntries
      .filter(([, entry]) => entry.status === 'needs_review')
      .map(([path]) => path);

    if (contentNeedingReview.length === 0) {
      this.log('✅ No content needs review', 'always');
      return {
        successful: [],
        failed: [],
        summary: { total: 0, succeeded: 0, failed: 0, duration: Date.now() - startTime }
      };
    }

    this.log(`📝 Found ${contentNeedingReview.length} files needing review`, 'always');
    
    if (this.verbose) {
      this.log('📂 Files to review:');
      contentNeedingReview.forEach((filePath, index) => {
        this.log(`   ${index + 1}. ${path.basename(filePath)}`);
      });
      this.log('');
    }

    const successful: string[] = [];
    const failed: { path: string; error: string }[] = [];
    let totalFileSize = 0;
    let totalScoreTime = 0;

    for (let i = 0; i < contentNeedingReview.length; i++) {
      const filePath = contentNeedingReview[i];
      const fileStartTime = Date.now();
      
      try {
        this.log(`📊 Reviewing ${path.basename(filePath)} (${i + 1}/${contentNeedingReview.length})`, 'always');
        
        if (this.verbose) {
          // Show file details
          try {
            const fs = await import('fs/promises');
            const stats = await fs.stat(filePath);
            const fileSize = Math.round(stats.size / 1024 * 10) / 10; // KB with 1 decimal
            totalFileSize += stats.size;
            this.log(`   📄 File size: ${fileSize} KB`, 'debug');
            this.log(`   📅 Last modified: ${stats.mtime.toISOString()}`, 'debug');
          } catch (statError) {
            this.log(`   ⚠️ Could not read file stats: ${statError}`, 'debug');
          }
        }
        
        const reviewStartTime = Date.now();
        await this.reviewContent(filePath);
        const reviewDuration = Date.now() - reviewStartTime;
        totalScoreTime += reviewDuration;
        
        // Get updated entry to show scores
        const updatedDatabase = this._db.getData();
        const updatedEntry = updatedDatabase.entries[filePath];
        
        successful.push(filePath);
        const fileDuration = Date.now() - fileStartTime;
        this.log(`✅ Reviewed: ${path.basename(filePath)} (${fileDuration}ms)`, 'always');
        
        if (this.verbose && updatedEntry) {
          this.log('   📊 Quality Scores:');
          this.log(`      Readability: ${updatedEntry.currentScores.readability}/10`);
          this.log(`      SEO Score: ${updatedEntry.currentScores.seoScore}/10`);
          this.log(`      Technical Accuracy: ${updatedEntry.currentScores.technicalAccuracy}/10`);
          this.log(`      Engagement: ${updatedEntry.currentScores.engagement}/10`);
          this.log(`      Content Depth: ${updatedEntry.currentScores.contentDepth}/10`);
          
          const avgScore = Object.values(updatedEntry.currentScores).reduce((a, b) => a + b, 0) / 5;
          this.log(`   🎯 Average Score: ${Math.round(avgScore * 10) / 10}/10`);
          this.log(`   ⏱️ Review Time: ${reviewDuration}ms`, 'debug');
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        failed.push({ path: filePath, error: errorMessage });
        const fileDuration = Date.now() - fileStartTime;
        this.log(`❌ Failed to review ${path.basename(filePath)} (${fileDuration}ms): ${errorMessage}`, 'always');
        
        if (this.verbose) {
          this.log(`   🔍 Error details: ${error instanceof Error ? error.stack : errorMessage}`, 'debug');
        }
      }
      
      // Progress indicator
      const progress = Math.round((i + 1) / contentNeedingReview.length * 100);
      if (this.verbose) {
        this.log(`   📈 Progress: ${progress}% (${i + 1}/${contentNeedingReview.length})`, 'debug');
        this.log('', 'debug');
      }
    }

    const duration = Date.now() - startTime;
    this.log(`🎉 Review completed: ${successful.length} succeeded, ${failed.length} failed`, 'always');
    
    if (this.verbose) {
      this.log('📊 Summary Statistics:');
      this.log(`   ⏱️ Total time: ${duration}ms (${Math.round(duration / 1000 * 10) / 10}s)`);
      this.log(`   📄 Total file size: ${Math.round(totalFileSize / 1024 * 10) / 10} KB`);
      this.log(`   🤖 Total scoring time: ${totalScoreTime}ms`);
      this.log(`   ⚡ Average time per file: ${Math.round(duration / contentNeedingReview.length)}ms`);
      
      if (successful.length > 0) {
        this.log(`   ✅ Success rate: ${Math.round(successful.length / contentNeedingReview.length * 100)}%`);
      }
      
      if (failed.length > 0) {
        this.log('   ❌ Failed files:');
        failed.forEach(({path: filePath, error}) => {
          this.log(`      ${path.basename(filePath)}: ${error}`);
        });
      }
    }

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
    const database = this._db.getData();
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
   * @param rootDir - The root directory to operate in
   * @param config - Configuration options
   */
  static async create(rootDir: string, config: ShakespeareConfigV2 = {}): Promise<Shakespeare> {
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
    
    // Store the full configuration that was used to create this instance (without rootDir)
    (shakespeare.config as any) = {
      ...shakespeare.config,
      ...config,
      contentCollection,
      model: defaultModelOptions?.model || config.model,
      provider: defaultModelOptions?.provider || config.provider,
      modelOptions: defaultModelOptions
    };
    // Note: rootDir is not stored in config as it's a runtime parameter
    
    if (config.verbose) {
      shakespeare.setVerbose(true);
    }
    
    if (config.logLevel) {
      shakespeare.logger.setLevel(config.logLevel);
    }
    
    return shakespeare;
  }

  /**
   * Create Shakespeare from configuration file or database config
   */
  static async fromConfig(configPath?: string): Promise<Shakespeare> {
    const { join, dirname, resolve } = await import('path');
    const { existsSync, readFileSync } = await import('fs');
    const cwd = process.cwd();
    
    // Try to find external config file first
    const possiblePaths = [
      configPath,
      join(cwd, 'shakespeare.config.js'),
      join(cwd, 'shakespeare.config.mjs'),
      join(cwd, 'shakespeare.config.json'),
      join(cwd, '.shakespeare.json')
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
          
          try {
            // Normalize configuration using versioning system
            const normalizedConfig = normalizeConfig(config);
            
            // The root directory is the directory containing the config file
            const configDir = dirname(resolve(configFile!));
            
            // Resolve dbPath relative to config file location if provided
            if (normalizedConfig.dbPath) {
              normalizedConfig.dbPath = resolve(configDir, normalizedConfig.dbPath);
            }
            
            const shakespeare = await Shakespeare.create(configDir, normalizedConfig);
            return shakespeare;
          } catch (error) {
            if (error instanceof UnsupportedConfigVersionError || error instanceof InvalidConfigError) {
              // Provide helpful error messages for configuration issues
              new ShakespeareLogger().error(`Failed to load config from ${configFile}: ${error.message}`);
              throw error;
            }
            throw error;
          }
        }
      } catch (error) {
        // Re-throw validation errors instead of swallowing them
        if (error instanceof UnsupportedConfigVersionError || error instanceof InvalidConfigError) {
          throw error;
        }
        // Only warn and continue for other errors (file not found, parse errors, etc.)
        new ShakespeareLogger().warn(`Failed to load config from ${configFile}: ${error}`);
      }
    }
    
    // Try to load configuration from content database
    try {
      const dbPath = join(cwd, '.shakespeare', 'content-db.json');
      if (existsSync(dbPath)) {
        const db = JSON.parse(readFileSync(dbPath, 'utf-8'));
        if (db.config) {
          try {
            // Normalize database configuration using versioning system
            const normalizedConfig = normalizeConfig(db.config);
            // Use current working directory as root when loading from database
            const shakespeare = await Shakespeare.create(cwd, normalizedConfig);
            return shakespeare;
          } catch (error) {
            if (error instanceof UnsupportedConfigVersionError || error instanceof InvalidConfigError) {
              new ShakespeareLogger().error(`Failed to load config from database: ${error.message}`);
              throw error;
            }
            throw error;
          }
        }
      }
    } catch (error) {
      new ShakespeareLogger().warn(`Failed to load config from database: ${error}`);
    }
    
    // Fallback to default configuration with current working directory
    return await Shakespeare.create(cwd);
  }

  /**
   * Convert WorkflowConfig to ShakespeareConfig
   */
  static async workflowConfigToShakespeareConfig(workflowConfig: WorkflowConfig): Promise<ShakespeareConfigV2> {
    const config: ShakespeareConfigV2 = {
      version: 2,
      verbose: workflowConfig.verbose,
      logLevel: workflowConfig.logLevel
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
    await this._db.load();
    const currentData = this._db.getData();
    currentData.config = workflowConfig;
    await this._db.save();
    this.log('💾 Workflow configuration saved to content database');
  }

  /**
   * Get current workflow configuration from database
   */
  async getWorkflowConfig(): Promise<WorkflowConfig | undefined> {
    await this._db.load();
    return this._db.getData().config;
  }

  /**
   * Get workflow-specific model options for an operation type
   */
  private async getWorkflowModelOptions(workflowType: 'review' | 'improve' | 'generate'): Promise<AIModelOptions | undefined> {
    // First check the current instance config (V2 format)
    if (this.config.taskModelOptions?.[workflowType]) {
      return this.config.taskModelOptions[workflowType];
    }
    
    // Then check for task-specific models/providers in current config
    const provider = this.config.providers?.[workflowType];
    const model = this.config.models?.[workflowType];
    
    if (provider || model) {
      return { provider, model };
    }
    
    // Fallback to legacy workflow config from database
    const workflowConfig = await this.getWorkflowConfig();
    if (workflowConfig) {
      const legacyProvider = workflowConfig.providers?.[workflowType];
      const legacyModel = workflowConfig.models?.[workflowType];
      
      if (legacyProvider || legacyModel) {
        return { provider: legacyProvider, model: legacyModel };
      }
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
function getOptimizedModelOptions(config: ShakespeareConfigV2): AIModelOptions | undefined {
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
