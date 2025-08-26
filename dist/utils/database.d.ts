import { ContentDatabase, ContentEntry } from '@/types/content';
import { IContentDatabase } from '@/types/interfaces';
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
}
