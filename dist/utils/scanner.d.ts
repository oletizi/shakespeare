import { IContentScanner, ContentCollectionConfig, CONTENT_COLLECTIONS } from '@/types/interfaces';
/**
 * Content scanner with configurable content collection support
 */
export declare class ContentScanner implements IContentScanner {
    private config;
    private rootDir;
    constructor(rootDir?: string, config?: ContentCollectionConfig | keyof typeof CONTENT_COLLECTIONS);
    /**
     * Scan for content files based on configuration
     */
    scanContent(): Promise<string[]>;
    /**
     * Check if a file path matches any of the given glob-like patterns
     */
    private matchesPatterns;
    /**
     * Simple glob pattern matching (supports ** and * wildcards)
     */
    private matchesPattern;
    /**
     * Read content of a markdown file
     */
    readContent(filePath: string): Promise<string>;
}
