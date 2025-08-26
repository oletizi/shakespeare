import { ContentScanner } from '@/utils/scanner';
import { ContentDatabaseHandler } from '@/utils/database';
import { DEFAULT_TARGET_SCORES } from '@/utils/constants';
import { ContentEntry, QualityDimensions } from '@/types/content';
import { AIScorer, AIContentAnalysis } from '@/utils/ai';
import { IContentScanner, IContentDatabase, IContentScorer } from '@/types/interfaces';
import path from 'path';
import fs from 'fs/promises';

export * from '@/types/content';

/**
 * Options for Shakespeare constructor
 */
export interface ShakespeareOptions {
  scanner?: IContentScanner;
  database?: IContentDatabase;
  ai?: IContentScorer;
}

export class Shakespeare {
  private scanner: IContentScanner;
  private db: IContentDatabase;
  private ai: IContentScorer;
  private contentDir: string;
  private dbPath: string;

  constructor(contentDir: string, dbPath: string, options: ShakespeareOptions = {}) {
    this.contentDir = contentDir;
    this.dbPath = dbPath;
    this.scanner = options.scanner ?? new ContentScanner(contentDir);
    this.db = options.database ?? new ContentDatabaseHandler(dbPath);
    this.ai = options.ai ?? new AIScorer();

    // Ensure database directory exists
    const dbDir = path.dirname(dbPath);
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
export function createShakespeare(contentDir: string, dbPath: string, options?: ShakespeareOptions): Shakespeare {
  return new Shakespeare(contentDir, dbPath, options);
}
