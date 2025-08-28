import { ContentEntry, ContentStatus } from '@/types/content';
import { AIScorerOptions } from '@/utils/ai';
import { ShakespeareLogger } from '@/utils/logger';
import { IContentScanner, IContentDatabase, IContentScorer, ContentCollectionConfig, CONTENT_COLLECTIONS, AIModelOptions, ShakespeareConfig } from '@/types/interfaces';
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
/**
 * Result of a workflow operation
 */
export interface WorkflowResult {
    /** Successfully processed items */
    successful: string[];
    /** Failed items with error messages */
    failed: {
        path: string;
        error: string;
    }[];
    /** Summary statistics */
    summary: {
        total: number;
        succeeded: number;
        failed: number;
        duration: number;
    };
}
export declare class Shakespeare {
    private scanner;
    private _db;
    private ai;
    private rootDir;
    private dbPath;
    logger: ShakespeareLogger;
    private verbose;
    /** Configuration used to create this instance */
    readonly config: ShakespeareConfig;
    /** Model options being used for AI operations */
    readonly modelOptions?: AIModelOptions;
    /**
     * Get database instance for testing purposes
     * @internal
     */
    get db(): IContentDatabase;
    constructor(rootDir?: string, dbPath?: string, options?: ShakespeareOptions);
    /**
     * Initialize the system
     */
    initialize(): Promise<void>;
    /**
     * Discover and index content without scoring (lightweight operation)
     * Creates database entries for new files with 'needs_review' status
     */
    discoverContent(): Promise<string[]>;
    /**
     * Update content index with new files
     */
    updateContentIndex(): Promise<void>;
    /**
     * Get the current database data
     */
    getDatabaseData(): import("@/types/content").ContentDatabase;
    /**
     * Get content that needs review (unreviewed/discovered content)
     * @deprecated Use getContentNeedingReviewDetails() for full content objects
     */
    getContentNeedingReview(): string[];
    /**
     * Get detailed content objects that need review
     */
    getContentNeedingReviewDetails(): ContentEntry[];
    /**
     * Get content entries by status
     */
    getContentByStatus(status: ContentStatus): ContentEntry[];
    /**
     * Review/score a specific content file
     * This is a convenience method that delegates to batch processing with a single item
     */
    reviewContent(path: string): Promise<void>;
    /**
     * Calculate overall quality score from quality dimensions
     */
    private calculateOverallQuality;
    /**
     * Get the entry with the lowest average score (excludes unreviewed content)
     */
    getWorstScoringContent(): string | null;
    /**
     * Improve content at the specified path
     * This is a convenience method that delegates to batch processing with a single item
     */
    improveContent(filePath: string): Promise<void>;
    /**
     * Determine content status based on scores
     */
    private determineStatus;
    /**
     * Set verbose logging for progress reporting
     */
    setVerbose(verbose: boolean): void;
    /**
     * Get current verbose setting
     */
    isVerbose(): boolean;
    /**
     * Get current model options being used
     */
    getModelOptions(): AIModelOptions | undefined;
    /**
     * Log message using structured logger
     * @param message - The message to log
     * @param level - Log level: 'always' (always log), 'verbose' (only when verbose), 'debug' (extra detail)
     */
    private log;
    /**
     * Review multiple files in batch with optimized AI operations
     */
    reviewContentBatch(filePaths: string[], batchSize?: number): Promise<WorkflowResult>;
    /**
     * Improve multiple files in batch
     */
    improveContentBatch(filePaths: string[], batchSize?: number): Promise<WorkflowResult>;
    /**
     * Review all content using batch processing for better performance
     */
    reviewAllBatch(batchSize?: number): Promise<WorkflowResult>;
    /**
     * Improve worst-scoring content using batch processing
     */
    improveWorstBatch(count?: number, batchSize?: number): Promise<WorkflowResult>;
    /**
     * Discover content and provide detailed reporting
     */
    discoverAndReport(): Promise<WorkflowResult>;
    /**
     * Review all content that needs review
     */
    reviewAll(): Promise<WorkflowResult>;
    /**
     * Improve the worst-scoring content
     */
    improveWorst(count?: number): Promise<WorkflowResult>;
    /**
     * Run the complete workflow: discover -> review -> improve
     */
    runFullWorkflow(options?: {
        improveCount?: number;
    }): Promise<{
        discovery: WorkflowResult;
        review: WorkflowResult;
        improvement: WorkflowResult;
    }>;
    /**
     * Get detailed ROI analysis for content improvements
     */
    getROIAnalysis(): Promise<{
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
    }>;
    /**
     * List interrupted improvement jobs
     */
    listProgressFiles(): Promise<Array<{
        executionId: string;
        startTime: string;
        completedChunks: number;
        totalChunks: number;
        totalCost: number;
        filePath: string;
    }>>;
    /**
     * Resume a progress job by execution ID
     */
    resumeProgressJob(executionId: string): Promise<{
        totalCost: number;
        contentLength: number;
    }>;
    /**
     * Get content health status dashboard
     */
    getStatus(): Promise<{
        totalFiles: number;
        needsReview: number;
        needsImprovement: number;
        meetsTargets: number;
        averageScore: number;
        worstScoring: string | null;
        costSummary: {
            totalCosts: {
                review: number;
                improvement: number;
                generation: number;
                total: number;
            };
            costsByContent: Record<string, any>;
            averageCostPerQualityPoint: number;
            totalOperations: number;
        };
    }>;
    /**
     * Create Shakespeare instance with smart defaults and auto-detection
     * @param rootDir - The root directory to operate in
     * @param config - Configuration options
     */
    static create(rootDir: string, config?: ShakespeareConfig): Promise<Shakespeare>;
    /**
     * Create Shakespeare from configuration file or database config
     */
    static fromConfig(configPath?: string): Promise<Shakespeare>;
    /**
     * Convert ShakespeareConfig to ShakespeareConfig
     */
    static workflowConfigToShakespeareConfig(workflowConfig: ShakespeareConfig): Promise<ShakespeareConfig>;
    /**
     * Save workflow configuration to the content database
     */
    saveShakespeareConfig(workflowConfig: ShakespeareConfig): Promise<void>;
    /**
     * Get current workflow configuration from database
     */
    getShakespeareConfig(): Promise<ShakespeareConfig | undefined>;
    /**
     * Get model information as a formatted string for display
     */
    getModelInfoString(workflowType: 'review' | 'improve' | 'generate'): Promise<string>;
    /**
     * Get workflow-specific model options for an operation type
     */
    private getWorkflowModelOptions;
}
/**
 * Factory function for creating Shakespeare instances
 */
export declare function createShakespeare(rootDir?: string, dbPath?: string, options?: ShakespeareOptions): Shakespeare;
/**
 * Legacy factory functions (maintained for backward compatibility)
 */
export declare const ShakespeareFactory: {
    /** Create Shakespeare for Astro projects with content collections */
    forAstro: (rootDir?: string, dbPath?: string, options?: ShakespeareOptions) => Shakespeare;
    /** Create Shakespeare for Next.js projects */
    forNextJS: (rootDir?: string, dbPath?: string, options?: ShakespeareOptions) => Shakespeare;
    /** Create Shakespeare for Gatsby projects */
    forGatsby: (rootDir?: string, dbPath?: string, options?: ShakespeareOptions) => Shakespeare;
    /** Create Shakespeare with custom content collection configuration */
    forCustom: (contentConfig: ContentCollectionConfig, rootDir?: string, dbPath?: string, options?: ShakespeareOptions) => Shakespeare;
    /** Create cost-optimized Shakespeare with specific model configuration */
    withCostOptimization: (modelOptions: AIModelOptions, rootDir?: string, dbPath?: string, options?: ShakespeareOptions) => Shakespeare;
};
