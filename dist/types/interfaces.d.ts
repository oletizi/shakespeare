import { ContentDatabase, ContentEntry } from './content';
import { AIContentAnalysis } from '../utils/ai';
/**
 * Content collection configuration for different frameworks
 */
export interface ContentCollectionConfig {
    /** Base directory to scan for content */
    baseDir: string;
    /** File patterns to include (glob patterns) */
    include: readonly string[];
    /** File patterns to exclude (glob patterns) */
    exclude?: readonly string[];
    /** Framework-specific settings */
    framework?: 'astro' | 'nextjs' | 'gatsby' | 'custom';
}
/**
 * Predefined content collection configurations
 */
export declare const CONTENT_COLLECTIONS: {
    readonly astro: {
        readonly baseDir: "src/content";
        readonly include: readonly ["**/*.mdx", "**/*.md"];
        readonly exclude: readonly ["**/index.md", "**/README.md"];
        readonly framework: "astro";
    };
    readonly nextjs: {
        readonly baseDir: "content";
        readonly include: readonly ["**/*.mdx", "**/*.md"];
        readonly exclude: readonly ["**/README.md"];
        readonly framework: "nextjs";
    };
    readonly gatsby: {
        readonly baseDir: "content";
        readonly include: readonly ["**/*.mdx", "**/*.md"];
        readonly exclude: readonly ["**/README.md"];
        readonly framework: "gatsby";
    };
    readonly custom: (baseDir: string, include?: string[], exclude?: string[]) => {
        baseDir: string;
        include: string[];
        exclude: string[];
        framework: "custom";
    };
};
/**
 * Interface for AI interaction
 */
export interface IAI {
    prompt(prompt: string): Promise<string>;
}
/**
 * Interface for file system operations
 */
export interface IFileSystem {
    readFile(path: string, encoding?: BufferEncoding): Promise<string>;
    writeFile(path: string, data: string, encoding?: BufferEncoding): Promise<void>;
    readdir(path: string, options?: {
        withFileTypes?: boolean;
    }): Promise<any[]>;
    mkdir(path: string, options?: {
        recursive?: boolean;
    }): Promise<void>;
}
/**
 * Interface for content scanning
 */
export interface IContentScanner {
    scanContent(): Promise<string[]>;
    readContent(filePath: string): Promise<string>;
}
/**
 * Interface for database operations
 */
export interface IContentDatabase {
    load(): Promise<ContentDatabase>;
    save(): Promise<void>;
    getData(): ContentDatabase;
    updateEntry(entryPath: string, updateFn: (entry: ContentEntry | undefined) => ContentEntry): Promise<void>;
}
/**
 * Interface for AI content scoring
 */
export interface IContentScorer {
    scoreContent(content: string): Promise<AIContentAnalysis>;
    improveContent(content: string, analysis: AIContentAnalysis): Promise<string>;
}
