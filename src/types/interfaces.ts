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
export const CONTENT_COLLECTIONS = {
  astro: {
    baseDir: 'src/content',
    include: ['**/*.mdx', '**/*.md'],
    exclude: ['**/index.md', '**/README.md'],
    framework: 'astro' as const
  },
  nextjs: {
    baseDir: 'content',
    include: ['**/*.mdx', '**/*.md'],
    exclude: ['**/README.md'],
    framework: 'nextjs' as const
  },
  gatsby: {
    baseDir: 'content',
    include: ['**/*.mdx', '**/*.md'],
    exclude: ['**/README.md'],
    framework: 'gatsby' as const
  },
  custom: (baseDir: string, include: string[] = ['**/*.md'], exclude: string[] = []) => ({
    baseDir,
    include,
    exclude,
    framework: 'custom' as const
  })
} as const;

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
  readdir(path: string, options?: { withFileTypes?: boolean }): Promise<any[]>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
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