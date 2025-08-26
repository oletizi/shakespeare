import { AIScorerOptions } from '@/utils/ai';
import { IContentScanner, IContentDatabase, IContentScorer, ContentCollectionConfig, CONTENT_COLLECTIONS, AIModelOptions } from '@/types/interfaces';
export * from '@/types/content';
export * from '@/types/interfaces';
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
export declare class Shakespeare {
    private scanner;
    private db;
    private ai;
    private rootDir;
    private dbPath;
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
}
/**
 * Factory function for creating Shakespeare instances
 */
export declare function createShakespeare(rootDir?: string, dbPath?: string, options?: ShakespeareOptions): Shakespeare;
/**
 * Convenience factory functions for different frameworks
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
