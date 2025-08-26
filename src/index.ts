import { ContentScanner } from '@/utils/scanner';
import { ContentDatabaseHandler } from '@/utils/database';
import { DEFAULT_TARGET_SCORES } from '@/utils/constants';
import { ContentEntry, QualityDimensions } from '@/types/content';
import { AIScorer, AIContentAnalysis } from '@/utils/ai';
import { IContentScanner, IContentDatabase, IContentScorer, ContentCollectionConfig, CONTENT_COLLECTIONS } from '@/types/interfaces';
import path from 'path';
import fs from 'fs/promises';

export * from '@/types/content';
export * from '@/types/interfaces';

/**
 * Options for Shakespeare constructor
 */
export interface ShakespeareOptions {
  scanner?: IContentScanner;
  database?: IContentDatabase;
  ai?: IContentScorer;
  /** Content collection configuration */
  contentCollection?: ContentCollectionConfig | keyof typeof CONTENT_COLLECTIONS;
}

export class Shakespeare {
  private scanner: IContentScanner;
  private db: IContentDatabase;
  private ai: IContentScorer;
  private rootDir: string;
  private dbPath: string;

  constructor(rootDir: string = process.cwd(), dbPath?: string, options: ShakespeareOptions = {}) {
    this.rootDir = rootDir;
    this.dbPath = dbPath ?? path.join(rootDir, '.shakespeare', 'content-db.json');
    
    // Create scanner with content collection configuration
    this.scanner = options.scanner ?? new ContentScanner(rootDir, options.contentCollection);
    this.db = options.database ?? new ContentDatabaseHandler(this.dbPath);
    this.ai = options.ai ?? new AIScorer();

    // Ensure database directory exists
    const dbDir = path.dirname(this.dbPath);
    fs.mkdir(dbDir, { recursive: true }).catch(console.error);
  }

  /**
   * Initialize the system
   */
  async initialize(): Promise<void> {
    await this.db.load();
  }

  /**
   * Update content index with new files
   */
  async updateContentIndex(): Promise<void> {
    const files = await this.scanner.scanContent();
    const database = this.db.getData();

    for (const file of files) {
      if (!database.entries[file]) {
        // Initialize new content entry
        const content = await this.scanner.readContent(file);
        const analysis = await this.ai.scoreContent(content);

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
          }]
        };

        await this.db.updateEntry(file, (_entry: ContentEntry | undefined) => newEntry);
      }
    }
  }

  /**
   * Get the entry with the lowest average score
   */
  getWorstScoringContent(): string | null {
    const database = this.db.getData();
    let worstScore = Infinity;
    let worstPath: string | null = null;

    for (const [path, entry] of Object.entries(database.entries)) {
      if (entry.status === 'meets_targets') continue;

      const avgScore = Object.values(entry.currentScores).reduce((a, b) => a + b, 0) / 
        Object.keys(entry.currentScores).length;

      if (avgScore < worstScore) {
        worstScore = avgScore;
        worstPath = path;
      }
    }

    return worstPath;
  }

  /**
   * Improve content at the specified path
   */
  async improveContent(path: string): Promise<void> {
    const database = this.db.getData();
    const entry = database.entries[path];

    if (!entry) {
      throw new Error(`No content found at path: ${path}`);
    }

    // Read current content
    const content = await this.scanner.readContent(path);
    
    // Get current analysis
    const analysis = await this.ai.scoreContent(content);
    
    // Generate improved content
    const improvedContent = await this.ai.improveContent(content, analysis);
    
    // Score the improved content
    const newAnalysis = await this.ai.scoreContent(improvedContent);
    
    // Update the content file
    await fs.writeFile(path, improvedContent, 'utf-8');
    
    // Update database entry
    await this.db.updateEntry(path, (entry: ContentEntry | undefined) => {
      if (!entry) {
        throw new Error(`Entry not found for path: ${path}`);
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
}

/**
 * Factory function for creating Shakespeare instances
 */
export function createShakespeare(rootDir?: string, dbPath?: string, options?: ShakespeareOptions): Shakespeare {
  return new Shakespeare(rootDir, dbPath, options);
}

/**
 * Convenience factory functions for different frameworks
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
    new Shakespeare(rootDir, dbPath, { ...options, contentCollection: contentConfig })
};
