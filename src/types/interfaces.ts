import { ContentDatabase, ContentEntry } from './content';
import { AIContentAnalysis } from '../utils/ai';

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