import fs from 'fs/promises';
import path from 'path';
import { ContentDatabase, ContentEntry, CostAccounting, OperationCostInfo, QualityImprovementMetrics } from '@/types/content';
import { IContentDatabase, AICostInfo } from '@/types/interfaces';

export { ContentDatabase as ContentDatabaseType } from '@/types/content';

/**
 * Database handler for content tracking
 */
export class ContentDatabaseHandler implements IContentDatabase {
  private dbPath: string;
  private dbDir: string;
  private data: ContentDatabase = {
    lastUpdated: new Date().toISOString(),
    entries: {}
  };

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    this.dbDir = path.dirname(dbPath);
  }

  /**
   * Convert absolute path to relative path from database directory
   */
  private toRelativePath(absolutePath: string): string {
    return path.relative(this.dbDir, absolutePath);
  }

  /**
   * Convert relative path to absolute path from database directory
   */
  private toAbsolutePath(relativePath: string): string {
    return path.resolve(this.dbDir, relativePath);
  }

  /**
   * Load the database from disk
   */
  async load(): Promise<ContentDatabase> {
    try {
      const content = await fs.readFile(this.dbPath, 'utf-8');
      this.data = JSON.parse(content);
      
      // Convert stored relative paths to absolute paths for internal use
      const normalizedEntries: { [key: string]: ContentEntry } = {};
      for (const [relativePath, entry] of Object.entries(this.data.entries)) {
        const absolutePath = this.toAbsolutePath(relativePath);
        normalizedEntries[absolutePath] = {
          ...entry,
          path: absolutePath // Ensure entry.path is also absolute
        };
      }
      this.data.entries = normalizedEntries;
      
      return this.data;
    } catch (error) {
      // If file doesn't exist, create new database
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        await this.save();
        return this.data;
      }
      throw error;
    }
  }

  /**
   * Save the database to disk
   */
  async save(): Promise<void> {
    this.data.lastUpdated = new Date().toISOString();
    
    // Ensure database directory exists - fail loudly if we can't create it
    try {
      await fs.mkdir(this.dbDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create database directory ${this.dbDir}: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Convert absolute paths to relative paths for storage
    const storageData: ContentDatabase = {
      ...this.data,
      entries: {}
    };
    
    for (const [absolutePath, entry] of Object.entries(this.data.entries)) {
      const relativePath = this.toRelativePath(absolutePath);
      storageData.entries[relativePath] = {
        ...entry,
        path: relativePath // Store relative path in entry.path as well
      };
    }
    
    await fs.writeFile(this.dbPath, JSON.stringify(storageData, null, 2));
  }

  /**
   * Get the current database state
   */
  getData(): ContentDatabase {
    return this.data;
  }

  /**
   * Update an entry in the database
   */
  async updateEntry(entryPath: string, updateFn: (entry: ContentEntry | undefined) => ContentEntry): Promise<void> {
    this.data.entries[entryPath] = updateFn(this.data.entries[entryPath]);
    await this.save();
  }

  /**
   * Initialize cost accounting for a new content entry
   */
  private initializeCostAccounting(): CostAccounting {
    return {
      reviewCosts: 0,
      improvementCosts: 0,
      generationCosts: 0,
      totalCost: 0,
      operationHistory: [],
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Add cost information to a content entry
   */
  async addOperationCost(
    entryPath: string,
    operation: 'review' | 'improve' | 'generate',
    costInfo: AICostInfo,
    qualityBefore?: number,
    qualityAfter?: number
  ): Promise<void> {
    await this.updateEntry(entryPath, (entry) => {
      if (!entry) {
        throw new Error(`Content entry not found: ${entryPath}`);
      }

      // Initialize cost accounting if it doesn't exist (for backward compatibility)
      if (!entry.costAccounting) {
        entry.costAccounting = this.initializeCostAccounting();
      }

      // Create operation cost info
      const operationCost: OperationCostInfo = {
        operation,
        cost: costInfo.totalCost,
        provider: costInfo.provider,
        model: costInfo.model,
        inputTokens: costInfo.inputTokens,
        outputTokens: costInfo.outputTokens,
        timestamp: costInfo.timestamp
      };

      // Add to operation history
      entry.costAccounting.operationHistory.push(operationCost);

      // Update cumulative costs
      switch (operation) {
        case 'review':
          entry.costAccounting.reviewCosts += costInfo.totalCost;
          break;
        case 'improve':
          entry.costAccounting.improvementCosts += costInfo.totalCost;
          break;
        case 'generate':
          entry.costAccounting.generationCosts += costInfo.totalCost;
          break;
      }

      // Update total cost
      entry.costAccounting.totalCost = 
        entry.costAccounting.reviewCosts + 
        entry.costAccounting.improvementCosts + 
        entry.costAccounting.generationCosts;

      // Update timestamp
      entry.costAccounting.lastUpdated = new Date().toISOString();

      // Calculate quality improvement metrics if both scores are provided
      if (operation === 'improve' && qualityBefore !== undefined && qualityAfter !== undefined) {
        const qualityDelta = qualityAfter - qualityBefore;
        const improvementMetrics: QualityImprovementMetrics = {
          scoreBefore: qualityBefore,
          scoreAfter: qualityAfter,
          qualityDelta,
          costPerQualityPoint: qualityDelta > 0 ? costInfo.totalCost / qualityDelta : 0,
          iterationNumber: entry.improvementIterations
        };

        // Add to the last review history entry if it exists
        if (entry.reviewHistory.length > 0) {
          const lastEntry = entry.reviewHistory[entry.reviewHistory.length - 1];
          lastEntry.improvementMetrics = improvementMetrics;
          lastEntry.costInfo = operationCost;
        }
      }

      return entry;
    });
  }

  /**
   * Get cost summary for all content or specific content
   */
  getCostSummary(specificPath?: string): {
    totalCosts: { review: number; improvement: number; generation: number; total: number };
    costsByContent: Record<string, CostAccounting>;
    averageCostPerQualityPoint: number;
    totalOperations: number;
  } {
    const entries = specificPath 
      ? { [specificPath]: this.data.entries[specificPath] }
      : this.data.entries;

    let totalReviewCosts = 0;
    let totalImprovementCosts = 0;
    let totalGenerationCosts = 0;
    let totalOperations = 0;
    let totalQualityPoints = 0;
    let totalImprovementCost = 0;
    
    const costsByContent: Record<string, CostAccounting> = {};

    for (const [path, entry] of Object.entries(entries)) {
      if (!entry?.costAccounting) continue;

      const costs = entry.costAccounting;
      costsByContent[path] = costs;

      totalReviewCosts += costs.reviewCosts;
      totalImprovementCosts += costs.improvementCosts;
      totalGenerationCosts += costs.generationCosts;
      totalOperations += costs.operationHistory.length;

      // Calculate quality improvements for ROI analysis
      for (const historyEntry of entry.reviewHistory) {
        if (historyEntry.improvementMetrics) {
          totalQualityPoints += historyEntry.improvementMetrics.qualityDelta;
          totalImprovementCost += historyEntry.costInfo?.cost || 0;
        }
      }
    }

    const totalCosts = totalReviewCosts + totalImprovementCosts + totalGenerationCosts;
    const averageCostPerQualityPoint = totalQualityPoints > 0 ? totalImprovementCost / totalQualityPoints : 0;

    return {
      totalCosts: {
        review: totalReviewCosts,
        improvement: totalImprovementCosts,
        generation: totalGenerationCosts,
        total: totalCosts
      },
      costsByContent,
      averageCostPerQualityPoint,
      totalOperations
    };
  }

  /**
   * Ensure entry has cost accounting initialized (for backward compatibility)
   */
  async ensureCostAccounting(entryPath: string): Promise<void> {
    await this.updateEntry(entryPath, (entry) => {
      if (!entry) {
        throw new Error(`Content entry not found: ${entryPath}`);
      }

      if (!entry.costAccounting) {
        entry.costAccounting = this.initializeCostAccounting();
      }

      return entry;
    });
  }
}
