import { ContentDatabaseHandler } from '@/utils/database';
import { ContentEntry } from '@/types/content';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('ContentDatabase Relative Paths', () => {
  const testDir = path.join(process.cwd(), 'test-output', 'database-paths');
  const dbPath = path.join(testDir, '.shakespeare', 'content-db.json');
  const contentFile1 = path.join(testDir, 'content', 'article1.md');
  const contentFile2 = path.join(testDir, 'docs', 'nested', 'article2.md');
  
  let database: ContentDatabaseHandler;

  beforeAll(async () => {
    // Create test directory structure
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
    await fs.mkdir(path.dirname(contentFile1), { recursive: true });
    await fs.mkdir(path.dirname(contentFile2), { recursive: true });
    
    // Create test files
    await fs.writeFile(contentFile1, '# Article 1\nContent here');
    await fs.writeFile(contentFile2, '# Article 2\nMore content');
    
    database = new ContentDatabaseHandler(dbPath);
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should store paths as relative to database directory', async () => {
    // Add entries with absolute paths
    const entry1: ContentEntry = {
      path: contentFile1,
      currentScores: {
        readability: 7,
        seoScore: 6,
        technicalAccuracy: 8,
        engagement: 6,
        contentDepth: 7,
        contentIntegrity: 9.0
      },
      targetScores: {
        readability: 8,
        seoScore: 8.5,
        technicalAccuracy: 9,
        engagement: 8,
        contentDepth: 8.5,
        contentIntegrity: 9.0
      },
      lastReviewDate: new Date().toISOString(),
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

    const entry2: ContentEntry = {
      path: contentFile2,
      currentScores: {
        readability: 8,
        seoScore: 7,
        technicalAccuracy: 9,
        engagement: 8,
        contentDepth: 8,
        contentIntegrity: 9.0
      },
      targetScores: {
        readability: 8,
        seoScore: 8.5,
        technicalAccuracy: 9,
        engagement: 8,
        contentDepth: 8.5,
        contentIntegrity: 9.0
      },
      lastReviewDate: new Date().toISOString(),
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

    // Add entries using absolute paths (internal API)
    await database.updateEntry(contentFile1, () => entry1);
    await database.updateEntry(contentFile2, () => entry2);

    // Check that the saved JSON contains relative paths
    const savedContent = await fs.readFile(dbPath, 'utf-8');
    const savedData = JSON.parse(savedContent);
    
    const savedKeys = Object.keys(savedData.entries);
    expect(savedKeys).toHaveLength(2);
    
    // Paths should be relative to the database directory
    expect(savedKeys.some(key => key.includes('../content/article1.md'))).toBe(true);
    expect(savedKeys.some(key => key.includes('../docs/nested/article2.md'))).toBe(true);
    
    // Paths should not be absolute
    expect(savedKeys.every(key => !path.isAbsolute(key))).toBe(true);
    
    // Entry.path should also be relative in storage
    const entries = Object.values(savedData.entries) as ContentEntry[];
    expect(entries.every(entry => !path.isAbsolute(entry.path))).toBe(true);
  });

  it('should convert relative paths back to absolute when loading', async () => {
    // Load the database
    const loadedData = await database.load();
    
    const loadedKeys = Object.keys(loadedData.entries);
    expect(loadedKeys).toHaveLength(2);
    
    // Loaded paths should be absolute
    expect(loadedKeys.every(key => path.isAbsolute(key))).toBe(true);
    expect(loadedKeys).toContain(contentFile1);
    expect(loadedKeys).toContain(contentFile2);
    
    // Entry.path should also be absolute after loading
    const entries = Object.values(loadedData.entries);
    expect(entries.every(entry => path.isAbsolute(entry.path))).toBe(true);
    expect(entries.map(e => e.path)).toContain(contentFile1);
    expect(entries.map(e => e.path)).toContain(contentFile2);
  });

  it('should work correctly after moving the database', async () => {
    // Simulate moving the database to a different location
    const newDbDir = path.join(testDir, 'moved');
    const newDbPath = path.join(newDbDir, 'content-db.json');
    
    await fs.mkdir(newDbDir, { recursive: true });
    
    // Copy the database file
    const originalContent = await fs.readFile(dbPath, 'utf-8');
    await fs.writeFile(newDbPath, originalContent);
    
    // Create new database instance pointing to the moved location
    const movedDatabase = new ContentDatabaseHandler(newDbPath);
    const loadedData = await movedDatabase.load();
    
    // Should still be able to resolve paths correctly relative to new location
    expect(Object.keys(loadedData.entries)).toHaveLength(2);
    
    // Paths should resolve correctly from the new database location
    const expectedFile1 = path.resolve(newDbDir, '../content/article1.md');
    const expectedFile2 = path.resolve(newDbDir, '../docs/nested/article2.md');
    
    expect(Object.keys(loadedData.entries)).toContain(expectedFile1);
    expect(Object.keys(loadedData.entries)).toContain(expectedFile2);
  });

  it('should handle entries with different relative path structures', async () => {
    // Test with various path structures to ensure relative path handling is robust
    const testPaths = [
      path.join(testDir, 'file1.md'),                    // Same level as db parent
      path.join(testDir, 'sub', 'file2.md'),            // One level down
      path.join(testDir, 'deep', 'nested', 'file3.md'), // Multiple levels down
    ];

    // Create files
    for (const filePath of testPaths) {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, '# Test\nContent');
    }

    const newDb = new ContentDatabaseHandler(dbPath);
    
    // Add entries
    for (let i = 0; i < testPaths.length; i++) {
      const entry: ContentEntry = {
        path: testPaths[i],
        currentScores: { readability: 7, seoScore: 7, technicalAccuracy: 7, engagement: 7, contentDepth: 7, contentIntegrity: 9.0 },
        targetScores: { readability: 8, seoScore: 8.5, technicalAccuracy: 9, engagement: 8, contentDepth: 8.5, contentIntegrity: 9.0 },
        lastReviewDate: new Date().toISOString(),
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
      
      await newDb.updateEntry(testPaths[i], () => entry);
    }

    // Verify saved paths are all relative
    const savedContent = await fs.readFile(dbPath, 'utf-8');
    const savedData = JSON.parse(savedContent);
    
    const allRelative = Object.keys(savedData.entries).every(key => !path.isAbsolute(key));
    expect(allRelative).toBe(true);

    // Verify loading converts back to absolute paths correctly
    const reloadedData = await newDb.load();
    const allAbsolute = Object.keys(reloadedData.entries).every(key => path.isAbsolute(key));
    expect(allAbsolute).toBe(true);

    // Verify the absolute paths resolve to the original files
    for (const originalPath of testPaths) {
      expect(Object.keys(reloadedData.entries)).toContain(originalPath);
    }
  });
});