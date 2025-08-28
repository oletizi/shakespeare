import { ContentDatabase, ContentEntry, CostAccounting } from '@/types/content';
import { IContentDatabase, AICostInfo } from '@/types/interfaces';
export { ContentDatabase as ContentDatabaseType } from '@/types/content';
/**
 * Database handler for content tracking
 */
export declare class ContentDatabaseHandler implements IContentDatabase {
    private dbPath;
    private dbDir;
    private data;
    constructor(dbPath: string);
    /**
     * Convert absolute path to relative path from database directory
     */
    private toRelativePath;
    /**
     * Convert relative path to absolute path from database directory
     */
    private toAbsolutePath;
    /**
     * Load the database from disk
     */
    load(): Promise<ContentDatabase>;
    /**
     * Save the database to disk
     */
    save(): Promise<void>;
    /**
     * Get the current database state
     */
    getData(): ContentDatabase;
    /**
     * Update an entry in the database
     */
    updateEntry(entryPath: string, updateFn: (entry: ContentEntry | undefined) => ContentEntry): Promise<void>;
    /**
     * Initialize cost accounting for a new content entry
     */
    private initializeCostAccounting;
    /**
     * Add cost information to a content entry
     */
    addOperationCost(entryPath: string, operation: 'review' | 'improve' | 'generate', costInfo: AICostInfo, qualityBefore?: number, qualityAfter?: number): Promise<void>;
    /**
     * Get cost summary for all content or specific content
     */
    getCostSummary(specificPath?: string): {
        totalCosts: {
            review: number;
            improvement: number;
            generation: number;
            total: number;
        };
        costsByContent: Record<string, CostAccounting>;
        averageCostPerQualityPoint: number;
        totalOperations: number;
    };
    /**
     * Ensure entry has cost accounting initialized (for backward compatibility)
     */
    ensureCostAccounting(entryPath: string): Promise<void>;
}
