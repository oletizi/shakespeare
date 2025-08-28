import { describe, expect, test, beforeEach, afterEach } from '@jest/globals';
import { ContentDatabaseHandler } from '@/utils/database';
import { ContentEntry, ContentDatabase } from '@/types/content';
import path from 'path';
import fs from 'fs/promises';

describe('ContentDatabaseHandler', () => {
  const testDbPath = path.join(__dirname, 'test-database.json');
  let db: ContentDatabaseHandler;

  beforeEach(() => {
    db = new ContentDatabaseHandler(testDbPath);
  });

  afterEach(async () => {
    // Clean up test database file
    try {
      await fs.unlink(testDbPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });

  test('should create new database if file does not exist', async () => {
    const data = await db.load();
    
    expect(data).toBeDefined();
    expect(data.entries).toEqual({});
    expect(data.lastUpdated).toBeDefined();
    
    // Should create the file
    const fileExists = await fs.access(testDbPath).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);
  });

  test('should load existing database from file', async () => {
    const existingData: ContentDatabase = {
      lastUpdated: '2023-01-01T00:00:00Z',
      entries: {
        'test.md': {
          path: 'test.md',
          currentScores: {
            readability: 8.0,
            seoScore: 7.5,
            technicalAccuracy: 9.0,
            engagement: 7.0,
            contentDepth: 8.5
          },
          targetScores: {
            readability: 8.0,
            seoScore: 8.5,
            technicalAccuracy: 9.0,
            engagement: 8.0,
            contentDepth: 8.5
          },
          lastReviewDate: '2023-01-01T00:00:00Z',
          improvementIterations: 0,
          status: 'needs_improvement',
          reviewHistory: [],
          costAccounting: {
            reviewCosts: 0,
            improvementCosts: 0,
            generationCosts: 0,
            totalCost: 0,
            operationHistory: [],
            lastUpdated: new Date().toISOString()
          }
        }
      }
    };

    // Write test data to file
    await fs.writeFile(testDbPath, JSON.stringify(existingData, null, 2));

    const data = await db.load();
    expect(data.lastUpdated).toBe('2023-01-01T00:00:00Z');
    
    // The path gets converted to absolute during load
    const expectedAbsolutePath = path.resolve(path.dirname(testDbPath), 'test.md');
    expect(data.entries[expectedAbsolutePath]).toBeDefined();
    expect(data.entries[expectedAbsolutePath].path).toBe(expectedAbsolutePath);
  });

  test('should handle corrupted database file', async () => {
    // Write invalid JSON to file
    await fs.writeFile(testDbPath, 'invalid json content');

    await expect(db.load()).rejects.toThrow();
  });

  test('should save database to file', async () => {
    await db.load();
    await db.save();

    // Check that file was written
    const fileContent = await fs.readFile(testDbPath, 'utf-8');
    const parsedData = JSON.parse(fileContent);
    
    expect(parsedData).toBeDefined();
    expect(parsedData.lastUpdated).toBeDefined();
    expect(parsedData.entries).toEqual({});
  });

  test('should update lastUpdated timestamp on save', async () => {
    await db.load();
    const originalData = db.getData();
    const originalTimestamp = originalData.lastUpdated;

    // Wait a moment to ensure timestamp changes
    await new Promise(resolve => setTimeout(resolve, 10));
    
    await db.save();
    const updatedData = db.getData();
    
    expect(updatedData.lastUpdated).not.toBe(originalTimestamp);
    expect(new Date(updatedData.lastUpdated).getTime()).toBeGreaterThan(new Date(originalTimestamp).getTime());
  });

  test('should return current database data', async () => {
    await db.load();
    const data = db.getData();
    
    expect(data).toBeDefined();
    expect(data.entries).toBeDefined();
    expect(data.lastUpdated).toBeDefined();
  });

  test('should update entry with new data', async () => {
    await db.load();

    const newEntry: ContentEntry = {
      path: 'test.md',
      currentScores: {
        readability: 7.5,
        seoScore: 8.0,
        technicalAccuracy: 9.0,
        engagement: 7.0,
        contentDepth: 8.5
      },
      targetScores: {
        readability: 8.0,
        seoScore: 8.5,
        technicalAccuracy: 9.0,
        engagement: 8.0,
        contentDepth: 8.5
      },
      lastReviewDate: '2023-01-01T00:00:00Z',
      improvementIterations: 1,
      status: 'needs_improvement',
      reviewHistory: [],
      costAccounting: {
        reviewCosts: 0,
        improvementCosts: 0,
        generationCosts: 0,
        totalCost: 0,
        operationHistory: [],
        lastUpdated: new Date().toISOString()
      }
    };

    await db.updateEntry('test.md', () => newEntry);

    const data = db.getData();
    expect(data.entries['test.md']).toEqual(newEntry);
  });

  test('should update existing entry', async () => {
    await db.load();

    // Add initial entry
    const initialEntry: ContentEntry = {
      path: 'test.md',
      currentScores: {
        readability: 7.0,
        seoScore: 7.0,
        technicalAccuracy: 8.0,
        engagement: 6.0,
        contentDepth: 7.5
      },
      targetScores: {
        readability: 8.0,
        seoScore: 8.5,
        technicalAccuracy: 9.0,
        engagement: 8.0,
        contentDepth: 8.5
      },
      lastReviewDate: '2023-01-01T00:00:00Z',
      improvementIterations: 0,
      status: 'needs_improvement',
      reviewHistory: [],
      costAccounting: {
        reviewCosts: 0,
        improvementCosts: 0,
        generationCosts: 0,
        totalCost: 0,
        operationHistory: [],
        lastUpdated: new Date().toISOString()
      }
    };

    await db.updateEntry('test.md', () => initialEntry);

    // Update the entry
    await db.updateEntry('test.md', (entry) => {
      if (!entry) throw new Error('Entry should exist');
      return {
        ...entry,
        improvementIterations: entry.improvementIterations + 1,
        status: 'meets_targets' as const
      };
    });

    const data = db.getData();
    expect(data.entries['test.md'].improvementIterations).toBe(1);
    expect(data.entries['test.md'].status).toBe('meets_targets');
  });

  test('should persist changes after updateEntry', async () => {
    await db.load();

    const newEntry: ContentEntry = {
      path: 'test.md',
      currentScores: {
        readability: 8.0,
        seoScore: 8.0,
        technicalAccuracy: 9.0,
        engagement: 7.5,
        contentDepth: 8.0
      },
      targetScores: {
        readability: 8.0,
        seoScore: 8.5,
        technicalAccuracy: 9.0,
        engagement: 8.0,
        contentDepth: 8.5
      },
      lastReviewDate: '2023-01-01T00:00:00Z',
      improvementIterations: 0,
      status: 'meets_targets',
      reviewHistory: [],
      costAccounting: {
        reviewCosts: 0,
        improvementCosts: 0,
        generationCosts: 0,
        totalCost: 0,
        operationHistory: [],
        lastUpdated: new Date().toISOString()
      }
    };

    const testFilePath = path.resolve(path.dirname(testDbPath), 'test.md');
    await db.updateEntry(testFilePath, () => ({ ...newEntry, path: testFilePath }));

    // Create new database instance and load from file
    const db2 = new ContentDatabaseHandler(testDbPath);
    const data = await db2.load();

    expect(data.entries[testFilePath]).toEqual({ ...newEntry, path: testFilePath });
  });
});