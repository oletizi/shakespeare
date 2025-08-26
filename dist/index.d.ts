import { AIScorerOptions } from '@/utils/ai';
import { IContentScanner, IContentDatabase, IContentScorer, ContentCollectionConfig, CONTENT_COLLECTIONS, AIModelOptions, WorkflowConfig } from '@/types/interfaces';
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
    private db;
    private ai;
    private rootDir;
    private dbPath;
    private verbose;
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
     */
    getContentNeedingReview(): string[];
    /**
     * Review/score a specific content file
     */
    reviewContent(path: string): Promise<void>;
    /**
     * Get the entry with the lowest average score (excludes unreviewed content)
     */
    getWorstScoringContent(): string | null;
    /**
     * Improve content at the specified path
     */
    improveContent(path: string): Promise<void>;
    /**
     * Determine content status based on scores
     */
    private determineStatus;
    /**
     * Set verbose logging for progress reporting
     */
    setVerbose(verbose: boolean): void;
    /**
     * Log message if verbose mode is enabled
     */
    private log;
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
     * Get content health status dashboard
     */
    getStatus(): Promise<{
        totalFiles: number;
        needsReview: number;
        needsImprovement: number;
        meetsTargets: number;
        averageScore: number;
        worstScoring: string | null;
    }>;
    /**
     * Create Shakespeare instance with smart defaults and auto-detection
     */
    static create(config?: ShakespeareConfig): Promise<Shakespeare>;
    /**
     * Create Shakespeare from configuration file or database config
     */
    static fromConfig(configPath?: string): Promise<Shakespeare>;
    /**
     * Convert WorkflowConfig to ShakespeareConfig
     */
    private static workflowConfigToShakespeareConfig;
    /**
     * Save workflow configuration to the content database
     */
    saveWorkflowConfig(workflowConfig: WorkflowConfig): Promise<void>;
    /**
     * Get current workflow configuration from database
     */
    getWorkflowConfig(): Promise<WorkflowConfig | undefined>;
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
