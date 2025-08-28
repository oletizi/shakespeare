import { ContentScanner } from '@/utils/scanner';
import { ContentDatabaseHandler } from '@/utils/database';
import { DEFAULT_TARGET_SCORES } from '@/utils/constants';
import { ContentEntry, QualityDimensions, ContentStatus } from '@/types/content';
import { AIScorer, AIContentAnalysis, AIScorerOptions } from '@/utils/ai';
import { GooseAI } from '@/utils/goose';
import { ShakespeareLogger } from '@/utils/logger';
import { IContentScanner, IContentDatabase, IContentScorer, ContentCollectionConfig, CONTENT_COLLECTIONS, AIModelOptions, ShakespeareConfig } from '@/types/interfaces';
import { loadConfig, InvalidConfigError } from '@/utils/config';
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
  public readonly config: ShakespeareConfig;
  
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
    
    // Initialize logger with rootDir for error log placement
    this.logger = new ShakespeareLogger(rootDir);
    
    // Store configuration for public access (rootDir is not part of config)
    this.config = {
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
        aiScorerOptions = { 
          ai: gooseAI, 
          defaultModelOptions: options.defaultModelOptions
        };
      } else {
        // Create default GooseAI with logger
        const gooseAI = new GooseAI(rootDir, {}, this.logger);
        aiScorerOptions = { ai: gooseAI };
      }
      
      this.ai = new AIScorer(aiScorerOptions);
    }

    // Database directory creation will be handled during first database operation
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
            contentDepth: 0,
            contentIntegrity: 0
          },
          targetScores: DEFAULT_TARGET_SCORES,
          lastReviewDate: new Date().toISOString(),
          improvementIterations: 0,
          status: 'needs_review', // Mark as unreviewed
          reviewHistory: [],
          costAccounting: {
            reviewCosts: 0,
            improvementCosts: 0,
            generationCosts: 0,
            totalCost: 0,
            operationHistory: [],
            lastUpdated: new Date().toISOString()
          }
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
        const scoringResult = await this.ai.scoreContent(content);
        const analysis = scoringResult.analysis;

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
          }],
          costAccounting: {
            reviewCosts: 0,
            improvementCosts: 0,
            generationCosts: 0,
            totalCost: 0,
            operationHistory: [],
            lastUpdated: new Date().toISOString()
          }
        };

        await this._db.updateEntry(file, (_entry: ContentEntry | undefined) => newEntry);
        
        // Track the initial review cost
        if (scoringResult.costInfo) {
          await this._db.addOperationCost(file, 'review', scoringResult.costInfo);
        }
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
   * This is a convenience method that delegates to batch processing with a single item
   */
  async reviewContent(path: string): Promise<void> {
    const result = await this.reviewContentBatch([path], 1);
    
    // If the single item failed, throw the error to maintain the original API contract
    if (result.failed.length > 0) {
      throw new Error(result.failed[0].error);
    }
  }

  /**
   * Calculate overall quality score from quality dimensions
   * Content integrity is treated as a gating factor - low integrity significantly impacts overall score
   */
  private calculateOverallQuality(scores: QualityDimensions): number {
    // Content integrity is critical - if it's below 4, cap the overall score
    if (scores.contentIntegrity < 4) {
      this.logger.warn('Content integrity is critically low, capping overall quality score', {
        contentIntegrity: scores.contentIntegrity,
        operation: 'calculate_overall_quality_integrity_penalty'
      });
      return Math.min(3, scores.contentIntegrity); // Can't be better than integrity score
    }
    
    const values = Object.values(scores);
    return values.reduce((sum, score) => sum + score, 0) / values.length;
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

      const avgScore = this.calculateOverallQuality(entry.currentScores);

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
   * This is a convenience method that delegates to batch processing with a single item
   */
  async improveContent(filePath: string): Promise<void> {
    const result = await this.improveContentBatch([filePath], 1);
    
    // If the single item failed, throw the error to maintain the original API contract
    if (result.failed.length > 0) {
      throw new Error(result.failed[0].error);
    }
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

  // ========== BATCH PROCESSING METHODS ==========

  /**
   * Review multiple files in batch with optimized AI operations
   */
  async reviewContentBatch(filePaths: string[], batchSize: number = 5): Promise<WorkflowResult> {
    const startTime = Date.now();
    this.log(`📊 Starting batch review of ${filePaths.length} files (batch size: ${batchSize})`, 'always');
    
    await this.initialize();
    const successful: string[] = [];
    const failed: { path: string; error: string }[] = [];
    
    // Process files in batches
    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(filePaths.length / batchSize);
      
      this.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} files)`, 'always');
      
      // Process batch concurrently with controlled concurrency
      const batchPromises = batch.map(async (filePath) => {
        try {
          this.log(`📊 Reviewing ${path.basename(filePath)}`, 'verbose');
          
          // Business logic moved from reviewContent method
          const database = this._db.getData();
          const entry = database.entries[filePath];
          
          if (!entry) {
            throw new Error(`Content not found: ${filePath}`);
          }

          if (entry.status !== 'needs_review') {
            throw new Error(`Content has already been reviewed: ${filePath}`);
          }

          // Score the content with AI
          const content = await this.scanner.readContent(filePath);
          const analysis = await this.ai.scoreContent(content);

          // Update entry with scores and proper status
          const updatedEntry: ContentEntry = {
            ...entry,
            currentScores: analysis.analysis.scores,
            lastReviewDate: new Date().toISOString(),
            status: this.determineStatus(analysis.analysis.scores),
            reviewHistory: [{
              date: new Date().toISOString(),
              scores: analysis.analysis.scores,
              improvements: []
            }]
          };

          await this._db.updateEntry(filePath, () => updatedEntry);
          
          // Track the review cost
          if (analysis.costInfo) {
            await this._db.addOperationCost(filePath, 'review', analysis.costInfo);
          }
          
          await this._db.save();
          
          return { path: filePath, success: true };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.log(`❌ Failed to review ${path.basename(filePath)}: ${errorMessage}`, 'always');
          return { path: filePath, success: false, error: errorMessage };
        }
      });
      
      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Collect results
      batchResults.forEach(result => {
        if (result.success) {
          successful.push(result.path);
          this.log(`✅ Reviewed: ${path.basename(result.path)}`, 'verbose');
        } else {
          failed.push({ path: result.path, error: result.error || 'Unknown error' });
        }
      });
      
      // Brief pause between batches to avoid overwhelming APIs
      if (i + batchSize < filePaths.length) {
        this.log('⏸️  Pausing between batches...', 'debug');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    const duration = Date.now() - startTime;
    this.log(`🎉 Batch review completed: ${successful.length} succeeded, ${failed.length} failed`, 'always');
    
    if (this.verbose) {
      this.log(`   ⏱️  Total time: ${duration}ms (${Math.round(duration / 1000 * 10) / 10}s)`);
      this.log(`   ⚡ Average time per file: ${Math.round(duration / filePaths.length)}ms`);
      this.log(`   📦 Files per batch: ${batchSize}`);
    }
    
    return {
      successful,
      failed,
      summary: {
        total: filePaths.length,
        succeeded: successful.length,
        failed: failed.length,
        duration
      }
    };
  }

  /**
   * Improve multiple files in batch
   */
  async improveContentBatch(filePaths: string[], batchSize: number = 3): Promise<WorkflowResult> {
    const startTime = Date.now();
    this.log(`🚀 Starting batch improvement of ${filePaths.length} files (batch size: ${batchSize})`, 'always');
    
    await this.initialize();
    const successful: string[] = [];
    const failed: { path: string; error: string }[] = [];
    
    // Process files in batches (smaller batches for improvement due to higher cost/complexity)
    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(filePaths.length / batchSize);
      
      this.log(`📦 Processing improvement batch ${batchNumber}/${totalBatches} (${batch.length} files)`, 'always');
      
      // Process batch concurrently
      const batchPromises = batch.map(async (filePath) => {
        try {
          this.log(`📝 Improving ${path.basename(filePath)}`, 'verbose');
          
          // Business logic moved from improveContent method
          // Ensure database is loaded
          await this._db.load();
          
          const database = this._db.getData();
          this.logger.debug(`🔍 Looking for entry with path: ${filePath}`);
          this.logger.debug(`🔍 Available database entries: ${Object.keys(database.entries).join(', ')}`);
          
          // Try to find the entry with the exact path first
          let entry = database.entries[filePath];
          
          // If not found, try to resolve the path to absolute and look again
          if (!entry) {
            const absolutePath = path.resolve(this.rootDir, filePath);
            this.logger.debug(`🔍 Trying absolute path: ${absolutePath}`);
            entry = database.entries[absolutePath];
          }

          if (!entry) {
            throw new Error(`No content found at path: ${filePath}. Available paths: ${Object.keys(database.entries).join(', ')}`);
          }

          // Use the absolute path from the entry for all file operations
          const absoluteFilePath = entry.path;
          this.logger.debug(`🔍 Using absolute path from entry: ${absoluteFilePath}`);
          
          // Read current content
          const content = await this.scanner.readContent(absoluteFilePath);
          
          // Get current analysis
          const analysis = await this.ai.scoreContent(content);
          
          // Get the database key for cost tracking
          const databaseKey = Object.keys(database.entries).find(key => database.entries[key] === entry);
          if (!databaseKey) {
            throw new Error(`Could not find database key for entry with path: ${absoluteFilePath}`);
          }
          
          // Track the review cost (for scoring before improvement)
          if (analysis.costInfo) {
            await this._db.addOperationCost(databaseKey, 'review', analysis.costInfo);
          }
          
          // Generate improved content - single code path, no fallbacks
          this.logger.info(`📝 Attempting to improve content with ${content.length} characters...`);
          
          // Get workflow-specific model options array for improvement (includes fallbacks)
          const modelOptionsArray = await this.getWorkflowModelOptions('improve');
          
          // Call the unified improveContent method with model array and file path
          const response = await (this.ai as any).improveContentWithModels(content, analysis.analysis, modelOptionsArray, absoluteFilePath);
          const improvedContent = response.content;
          
          this.logger.info(`✅ Content improvement successful, got ${improvedContent.length} characters back`);
          
          // Validation is now handled inside ai.improveContent(), but we can still check for identical content
          if (improvedContent === content) {
            this.logger.warn('⚠️  Warning: Improved content is identical to original');
          }
          
          // Score the improved content
          const newScoringResult = await this.ai.scoreContent(improvedContent);
          const newAnalysis = newScoringResult.analysis;
          
          // Calculate quality improvement for ROI tracking
          const qualityBefore = this.calculateOverallQuality(analysis.analysis.scores);
          const qualityAfter = this.calculateOverallQuality(newAnalysis.scores);
          
          // Track the improvement cost with quality metrics
          if (response.costInfo) {
            await this._db.addOperationCost(
              databaseKey, 
              'improve', 
              response.costInfo, 
              qualityBefore, 
              qualityAfter
            );
          }
          
          // Track the cost for scoring the improved content
          if (newScoringResult.costInfo) {
            await this._db.addOperationCost(databaseKey, 'review', newScoringResult.costInfo);
          }
          
          // Update the content file
          try {
            // Use the absolute path from the entry
            if (!path.isAbsolute(absoluteFilePath)) {
              throw new Error(`Expected absolute path from database entry, but got relative path: ${absoluteFilePath}`);
            }
            
            this.logger.debug(`🔍 Writing improved content to: ${absoluteFilePath}`);
            await fs.writeFile(absoluteFilePath, improvedContent, 'utf-8');
            this.logger.info(`📄 Successfully wrote improved content to ${absoluteFilePath}`);
          } catch (writeError) {
            const errorMessage = writeError instanceof Error ? writeError.message : String(writeError);
            this.logger.error(`❌ Failed to write improved content to file: ${errorMessage}`);
            throw writeError;
          }
          
          // Update database entry - use the path that was found in the database (already resolved above)
          
          await this._db.updateEntry(databaseKey, (entry: ContentEntry | undefined) => {
            if (!entry) {
              throw new Error(`Entry not found for path: ${databaseKey}`);
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
          
          return { path: filePath, success: true };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.log(`❌ Failed to improve ${path.basename(filePath)}: ${errorMessage}`, 'always');
          return { path: filePath, success: false, error: errorMessage };
        }
      });
      
      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Collect results
      batchResults.forEach(result => {
        if (result.success) {
          successful.push(result.path);
          this.log(`✅ Improved: ${path.basename(result.path)}`, 'verbose');
        } else {
          failed.push({ path: result.path, error: result.error || 'Unknown error' });
        }
      });
      
      // Longer pause between improvement batches (more expensive operations)
      if (i + batchSize < filePaths.length) {
        this.log('⏸️  Pausing between improvement batches...', 'debug');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    const duration = Date.now() - startTime;
    this.log(`🎉 Batch improvement completed: ${successful.length} succeeded, ${failed.length} failed`, 'always');
    
    if (this.verbose) {
      this.log(`   ⏱️  Total time: ${duration}ms (${Math.round(duration / 1000 * 10) / 10}s)`);
      this.log(`   ⚡ Average time per file: ${Math.round(duration / filePaths.length)}ms`);
      this.log(`   📦 Files per batch: ${batchSize}`);
    }
    
    return {
      successful,
      failed,
      summary: {
        total: filePaths.length,
        succeeded: successful.length,
        failed: failed.length,
        duration
      }
    };
  }

  /**
   * Review all content using batch processing for better performance
   */
  async reviewAllBatch(batchSize: number = 5): Promise<WorkflowResult> {
    const startTime = Date.now();
    
    // Get model configuration for review workflow
    const reviewOptionsArray = await this.getWorkflowModelOptions('review');
    const primaryModel = reviewOptionsArray[0];
    const modelInfo = primaryModel ? 
      `${primaryModel.provider || 'default'}${primaryModel.model ? `/${primaryModel.model}` : ''}` : 
      'default';
    
    this.log(`📊 Starting batch content review using ${modelInfo}...`, 'always');
    
    await this.initialize();
    const database = this._db.getData();
    const allEntries = Object.entries(database.entries || {});
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
    this.log(`📦 Using batch size: ${batchSize}`, 'verbose');
    
    // Use the batch processing method
    const result = await this.reviewContentBatch(contentNeedingReview, batchSize);
    
    // Update summary with total time
    result.summary.duration = Date.now() - startTime;
    
    return result;
  }

  /**
   * Improve worst-scoring content using batch processing
   */
  async improveWorstBatch(count: number = 5, batchSize: number = 3): Promise<WorkflowResult> {
    const startTime = Date.now();
    this.log(`🚀 Starting batch improvement of ${count} worst-scoring content (batch size: ${batchSize})...`, 'always');
    
    await this.initialize();
    const database = this._db.getData();
    
    // Get worst-scoring files
    const worstFiles: string[] = [];
    const entries = Object.entries(database.entries);
    
    // Sort by average score (ascending) to get worst first
    const scoredEntries = entries
      .filter(([, entry]) => entry.status !== 'needs_review' && entry.status !== 'meets_targets')
      .map(([path, entry]) => {
        const scores = Object.values(entry.currentScores);
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        return { path, avgScore, entry };
      })
      .filter(({ avgScore }) => avgScore > 0) // Exclude unreviewed content
      .sort((a, b) => a.avgScore - b.avgScore);
    
    // Take the worst N files
    for (let i = 0; i < Math.min(count, scoredEntries.length); i++) {
      worstFiles.push(scoredEntries[i].path);
    }
    
    if (worstFiles.length === 0) {
      this.log('✅ No content needs improvement', 'always');
      return {
        successful: [],
        failed: [],
        summary: { total: 0, succeeded: 0, failed: 0, duration: Date.now() - startTime }
      };
    }
    
    this.log(`📋 Selected ${worstFiles.length} files for improvement:`, 'verbose');
    worstFiles.forEach((file, index) => {
      const entry = scoredEntries.find(e => e.path === file);
      this.log(`   ${index + 1}. ${path.basename(file)} (score: ${entry?.avgScore.toFixed(1)})`, 'verbose');
    });
    
    // Use batch processing for improvements
    const result = await this.improveContentBatch(worstFiles, batchSize);
    
    // Update summary with total time
    result.summary.duration = Date.now() - startTime;
    
    return result;
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
          this.log(`      Content Integrity: ${updatedEntry.currentScores.contentIntegrity}/10`);
          
          const avgScore = this.calculateOverallQuality(updatedEntry.currentScores);
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
   * Get detailed ROI analysis for content improvements
   */
  async getROIAnalysis(): Promise<{
    totalInvestment: number;
    totalQualityGain: number;
    averageCostPerQualityPoint: number;
    contentEfficiency: Array<{
      path: string;
      investment: number;
      qualityGain: number;
      efficiency: number;
      iterations: number;
    }>;
    diminishingReturns: Array<{
      path: string;
      iterationEfficiency: Array<{
        iteration: number;
        cost: number;
        qualityGain: number;
        efficiency: number;
      }>;
    }>;
  }> {
    await this.initialize();
    const database = this._db.getData();
    const costSummary = this._db.getCostSummary();
    
    let totalInvestment = 0;
    let totalQualityGain = 0;
    const contentEfficiency = [];
    const diminishingReturns = [];
    
    for (const [path, entry] of Object.entries(database.entries)) {
      if (entry.costAccounting && entry.reviewHistory.length > 0) {
        const investment = entry.costAccounting.improvementCosts;
        if (investment > 0) {
          totalInvestment += investment;
          
          // Calculate quality gain from review history
          let qualityGain = 0;
          const iterationEfficiency = [];
          
          for (let i = 0; i < entry.reviewHistory.length; i++) {
            const historyEntry = entry.reviewHistory[i];
            if (historyEntry.improvementMetrics) {
              const metrics = historyEntry.improvementMetrics;
              qualityGain += metrics.qualityDelta;
              totalQualityGain += metrics.qualityDelta;
              
              iterationEfficiency.push({
                iteration: i + 1,
                cost: historyEntry.costInfo?.cost || 0,
                qualityGain: metrics.qualityDelta,
                efficiency: metrics.costPerQualityPoint
              });
            }
          }
          
          if (qualityGain > 0) {
            contentEfficiency.push({
              path: path,
              investment,
              qualityGain,
              efficiency: investment / qualityGain,
              iterations: entry.improvementIterations
            });
            
            if (iterationEfficiency.length > 1) {
              diminishingReturns.push({
                path: path,
                iterationEfficiency
              });
            }
          }
        }
      }
    }
    
    // Sort by efficiency (lower is better - less cost per quality point)
    contentEfficiency.sort((a, b) => a.efficiency - b.efficiency);
    
    return {
      totalInvestment,
      totalQualityGain,
      averageCostPerQualityPoint: costSummary.averageCostPerQualityPoint,
      contentEfficiency,
      diminishingReturns
    };
  }

  /**
   * List interrupted improvement jobs
   */
  async listProgressFiles(): Promise<Array<{
    executionId: string;
    startTime: string;
    completedChunks: number;
    totalChunks: number;
    totalCost: number;
    filePath: string;
  }>> {
    const progressDir = path.join(this.rootDir, '.shakespeare', 'progress');
    
    try {
      const files = await fs.readdir(progressDir);
      const progressFiles = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(progressDir, file);
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            const progress = JSON.parse(content);
            const executionId = file.replace('.json', '');
            
            // Extract start time from execution ID (timestamp format)
            const timestampMatch = executionId.match(/improve-chunked-(\d+)/);
            const startTime = timestampMatch 
              ? new Date(parseInt(timestampMatch[1])).toISOString()
              : 'Unknown';
            
            progressFiles.push({
              executionId,
              startTime,
              completedChunks: progress.improvedChunks?.length || 0,
              totalChunks: progress.totalChunks || 0,
              totalCost: progress.totalCost || 0,
              filePath
            });
          } catch (error) {
            // Skip corrupted progress files
            continue;
          }
        }
      }
      
      // Sort by start time (newest first)
      return progressFiles.sort((a, b) => 
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
      
    } catch (error) {
      // Directory doesn't exist or can't be read
      return [];
    }
  }

  /**
   * Resume a progress job by execution ID
   */
  async resumeProgressJob(executionId: string): Promise<{
    totalCost: number;
    contentLength: number;
  }> {
    await this.initialize();
    
    // Load progress data to get original content path and other details
    const progressDir = path.join(this.rootDir, '.shakespeare', 'progress');
    const progressPath = path.join(progressDir, `${executionId}.json`);
    
    let progress: any;
    try {
      const content = await fs.readFile(progressPath, 'utf-8');
      progress = JSON.parse(content);
    } catch (error) {
      throw new Error(`Progress file not found for execution ID: ${executionId}`);
    }
    
    if (!progress.originalContent || !progress.analysis) {
      throw new Error(`Progress file ${executionId} is missing required data (originalContent or analysis)`);
    }
    
    // Resume the AI improvement using the stored data
    const result = await (this.ai as any).resumeChunkedImprovement(executionId);
    
    // Find the database entry to update using stored file path
    const database = this._db.getData();
    let matchingEntry: any = null;
    let databaseKey: string | null = null;
    
    if (progress.filePath) {
      // Try to find by stored file path first
      databaseKey = Object.keys(database.entries).find(key => 
        database.entries[key].path === progress.filePath
      ) || null;
      if (databaseKey) {
        matchingEntry = database.entries[databaseKey];
      }
    }
    
    // Fallback: match by content if file path lookup failed
    if (!matchingEntry || !databaseKey) {
      for (const [key, entry] of Object.entries(database.entries)) {
        try {
          const fileContent = await this.scanner.readContent(entry.path);
          if (fileContent === progress.originalContent) {
            matchingEntry = entry;
            databaseKey = key;
            break;
          }
        } catch {
          // Skip files that can't be read
          continue;
        }
      }
    }
    
    if (!matchingEntry || !databaseKey) {
      this.logger.warn(`Could not find matching database entry for resumed job ${executionId}`);
      // Continue with the improvement but skip database updates
    }
    
    // Update cost tracking in database if we found the entry
    if (matchingEntry && databaseKey && result.costInfo) {
      // Calculate quality metrics for the improvement
      const qualityBefore = this.calculateOverallQuality(progress.analysis.scores);
      
      // Score the improved content to get quality after
      const newAnalysis = await this.ai.scoreContent(result.content);
      const qualityAfter = this.calculateOverallQuality(newAnalysis.analysis.scores);
      
      // Track the improvement cost
      await this._db.addOperationCost(databaseKey, 'improve', result.costInfo, qualityBefore, qualityAfter);
      
      // Track the final scoring cost
      if (newAnalysis.costInfo) {
        await this._db.addOperationCost(databaseKey, 'review', newAnalysis.costInfo);
      }
      
      // Update the database entry with new scores and status
      await this._db.updateEntry(databaseKey, (entry) => {
        if (!entry) throw new Error(`Entry not found: ${databaseKey}`);
        
        return {
          ...entry,
          currentScores: newAnalysis.analysis.scores,
          lastReviewDate: new Date().toISOString(),
          improvementIterations: entry.improvementIterations + 1,
          status: this.determineStatus(newAnalysis.analysis.scores),
          reviewHistory: [
            ...entry.reviewHistory,
            {
              date: new Date().toISOString(),
              scores: newAnalysis.analysis.scores,
              improvements: Object.values(newAnalysis.analysis).flatMap((d: any) => d.suggestions || []),
              costInfo: result.costInfo,
              improvementMetrics: {
                scoreBefore: qualityBefore,
                scoreAfter: qualityAfter,
                qualityDelta: qualityAfter - qualityBefore,
                costPerQualityPoint: qualityAfter > qualityBefore ? result.costInfo.totalCost / (qualityAfter - qualityBefore) : 0,
                iterationNumber: entry.improvementIterations + 1
              }
            }
          ]
        };
      });
      
      // Write the improved content back to the file
      if (progress.filePath) {
        try {
          await fs.writeFile(progress.filePath, result.content, 'utf-8');
          this.logger.info(`📄 Successfully wrote improved content to ${progress.filePath}`);
        } catch (writeError) {
          const errorMessage = writeError instanceof Error ? writeError.message : String(writeError);
          this.logger.error(`❌ Failed to write improved content to file: ${errorMessage}`);
          throw writeError;
        }
      }
    }
    
    // Clean up the progress file since job is complete
    try {
      await fs.unlink(progressPath);
      this.logger.info(`Cleaned up progress file for completed job: ${executionId}`);
    } catch (error) {
      this.logger.warn(`Could not clean up progress file: ${error}`);
    }
    
    return {
      totalCost: result.costInfo.totalCost,
      contentLength: result.content.length
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
    costSummary: {
      totalCosts: { review: number; improvement: number; generation: number; total: number };
      costsByContent: Record<string, any>;
      averageCostPerQualityPoint: number;
      totalOperations: number;
    };
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
    
    // Get cost summary from database
    const costSummary = this._db.getCostSummary();

    return {
      totalFiles: entries.length,
      needsReview,
      needsImprovement,
      meetsTargets,
      averageScore: Math.round(averageScore * 10) / 10,
      worstScoring,
      costSummary
    };
  }

  // ========== STATIC FACTORY METHODS ==========

  /**
   * Create Shakespeare instance with smart defaults and auto-detection
   * @param rootDir - The root directory to operate in
   * @param config - Configuration options
   */
  static async create(rootDir: string, config: ShakespeareConfig = {}): Promise<Shakespeare> {
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
      join(cwd, '.shakespeare', 'config.json'),
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
            // Process configuration to extract model/provider info
            const normalizedConfig = await this.workflowConfigToShakespeareConfig(config);
            
            // The root directory should be the project root, not the config directory
            // For configs in .shakespeare/, use the parent directory
            let configDir = dirname(resolve(configFile!));
            if (configFile!.includes('.shakespeare')) {
              configDir = dirname(configDir);
            }
            
            // Resolve dbPath relative to config file location if provided
            if (normalizedConfig.dbPath) {
              normalizedConfig.dbPath = resolve(configDir, normalizedConfig.dbPath);
            }
            
            const shakespeare = await Shakespeare.create(configDir, normalizedConfig);
            return shakespeare;
          } catch (error) {
            if (error instanceof InvalidConfigError) {
              // Provide helpful error messages for configuration issues
              new ShakespeareLogger().error(`Failed to load config from ${configFile}: ${error.message}`);
              throw error;
            }
            throw error;
          }
        }
      } catch (error) {
        // Re-throw validation errors instead of swallowing them
        if (error instanceof InvalidConfigError) {
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
            // Process database configuration to extract model/provider info
            const normalizedConfig = await this.workflowConfigToShakespeareConfig(db.config);
            // Use current working directory as root when loading from database
            const shakespeare = await Shakespeare.create(cwd, normalizedConfig);
            return shakespeare;
          } catch (error) {
            if (error instanceof InvalidConfigError) {
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
   * Convert ShakespeareConfig to ShakespeareConfig
   */
  static async workflowConfigToShakespeareConfig(workflowConfig: ShakespeareConfig): Promise<ShakespeareConfig> {
    const config: ShakespeareConfig = {
      verbose: workflowConfig.verbose,
      logLevel: workflowConfig.logLevel
    };

    // Set content collection if specified
    if (workflowConfig.contentCollection) {
      config.contentCollection = workflowConfig.contentCollection;
    }

    // Copy all other properties from the source config
    Object.keys(workflowConfig).forEach(key => {
      if (!['verbose', 'logLevel', 'contentCollection'].includes(key)) {
        (config as any)[key] = (workflowConfig as any)[key];
      }
    });

    // Configure models - use first review model as default since it's most commonly used if no global model
    if (!config.model && workflowConfig.models?.review) {
      const reviewModelConfig = workflowConfig.models.review;
      // Handle both old format and new array format
      const firstReviewModel = Array.isArray(reviewModelConfig) ? reviewModelConfig[0] : reviewModelConfig;
      
      if (typeof firstReviewModel === 'string') {
        config.model = firstReviewModel;
      } else if (firstReviewModel && typeof firstReviewModel === 'object') {
        config.model = firstReviewModel.model;
        if (firstReviewModel.provider && !config.provider) {
          config.provider = firstReviewModel.provider;
        }
      }
    }

    // If model is specified, set up model options
    if (config.model) {
      config.modelOptions = {
        model: config.model,
        provider: config.provider
      };
    }

    return config;
  }

  // ========== WORKFLOW CONFIGURATION METHODS ==========

  /**
   * Save workflow configuration to the content database
   */
  async saveShakespeareConfig(workflowConfig: ShakespeareConfig): Promise<void> {
    await this._db.load();
    const currentData = this._db.getData();
    currentData.config = workflowConfig;
    await this._db.save();
    this.log('💾 Workflow configuration saved to content database');
  }

  /**
   * Get current workflow configuration from database
   */
  async getShakespeareConfig(): Promise<ShakespeareConfig | undefined> {
    await this._db.load();
    return this._db.getData().config;
  }

  /**
   * Get model information as a formatted string for display
   */
  async getModelInfoString(workflowType: 'review' | 'improve' | 'generate'): Promise<string> {
    const modelOptionsArray = await this.getWorkflowModelOptions(workflowType);
    if (!modelOptionsArray || modelOptionsArray.length === 0) return 'default';
    
    const primaryModel = modelOptionsArray[0];
    const provider = primaryModel.provider || 'default';
    const model = primaryModel.model ? `/${primaryModel.model}` : '';
    return `${provider}${model}`;
  }

  /**
   * Get workflow-specific model options for an operation type
   */
  private async getWorkflowModelOptions(workflowType: 'review' | 'improve' | 'generate'): Promise<AIModelOptions[]> {
    // First check the current instance config (V2 format)
    if (this.config.taskModelOptions?.[workflowType]) {
      return [this.config.taskModelOptions[workflowType]];
    }
    
    // Then check for consolidated models configuration
    const modelConfig = this.config.models?.[workflowType];
    if (modelConfig) {
      if (Array.isArray(modelConfig)) {
        // New array format: try each model in order
        return modelConfig.map(config => {
          if (typeof config === 'string') {
            return { model: config };
          } else {
            return {
              model: config.model,
              provider: config.provider
            };
          }
        });
      } else if (typeof modelConfig === 'string') {
        // Backward compatibility: string model name
        return [{ model: modelConfig }];
      } else {
        // Single object format: object with model and optional provider
        return [{
          model: modelConfig.model,
          provider: modelConfig.provider
        }];
      }
    }
    

    // Provide sensible defaults when no configuration is found (with fallback)
    const defaults = {
      review: [
        { model: 'gpt-4o-mini', provider: 'tetrate' }, // Fast, cost-effective for scoring
        { model: 'gemini-1.5-flash-8b', provider: 'google' } // Fallback
      ],
      improve: [
        { model: 'claude-3-5-sonnet-latest', provider: 'tetrate' }, // Higher quality for content improvement
        { model: 'gemini-1.5-flash-8b', provider: 'google' } // Fallback
      ],
      generate: [
        { model: 'claude-3-5-sonnet-latest', provider: 'tetrate' }, // Higher quality for content generation
        { model: 'gemini-1.5-flash-8b', provider: 'google' } // Fallback
      ]
    };

    return defaults[workflowType];
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
