import { describe, expect, test, beforeAll, beforeEach, afterEach } from '@jest/globals';
import { Shakespeare } from '../src';
import { MockContentScanner, MockDatabase, MockContentScorer } from './utils/mocks';
import path from 'path';
import fs from 'fs/promises';

describe('Shakespeare Content Analysis', () => {
  const contentDir = path.join(__dirname, 'content');
  const dbPath = path.join(__dirname, '.shakespeare-test', 'content-db.json');
  let shakespeare: Shakespeare;
  let mockScanner: MockContentScanner;
  let mockDatabase: MockDatabase;
  let mockScorer: MockContentScorer;

  beforeAll(async () => {
    // Ensure test directories exist
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
  });

  beforeEach(() => {
    // Setup mock dependencies
    const testFilePath = path.join(contentDir, 'typescript-generics.md');
    const testContent = '# Test Content\nThis is test markdown content.';

    mockScanner = new MockContentScanner([testFilePath]);
    mockScanner.setFileContent(testFilePath, testContent);

    mockDatabase = new MockDatabase();
    mockScorer = new MockContentScorer();

    // Create Shakespeare instance with mocked dependencies
    shakespeare = new Shakespeare(contentDir, dbPath, {
      scanner: mockScanner,
      database: mockDatabase,
      ai: mockScorer
    });
  });

  afterEach(async () => {
    // Clean up test database
    try {
      await fs.unlink(dbPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });

  test('should initialize successfully', async () => {
    await expect(shakespeare.initialize()).resolves.not.toThrow();
  });

  test('should find and analyze new content', async () => {
    await shakespeare.initialize();
    await shakespeare.updateContentIndex();

    const dbData = mockDatabase.getData();

    // Check if TypeScript generics article was found and analyzed
    const genericsMdPath = path.join(contentDir, 'typescript-generics.md');
    expect(dbData.entries[genericsMdPath]).toBeDefined();
    
    const entry = dbData.entries[genericsMdPath];
    expect(entry.currentScores).toBeDefined();
    expect(entry.targetScores).toBeDefined();
    expect(entry.status).toBeDefined();
    expect(entry.reviewHistory).toHaveLength(1);
  });

  test('should identify worst scoring content', async () => {
    await shakespeare.initialize();
    await shakespeare.updateContentIndex();

    const worstContent = shakespeare.getWorstScoringContent();
    expect(worstContent).toBeDefined();
  });

  test('should improve content successfully', async () => {
    await shakespeare.initialize();
    await shakespeare.updateContentIndex();

    const contentPath = path.join(contentDir, 'typescript-generics.md');
    await shakespeare.improveContent(contentPath);

    const dbData = mockDatabase.getData();
    const entry = dbData.entries[contentPath];

    expect(entry.improvementIterations).toBe(1);
    expect(entry.reviewHistory).toHaveLength(2);
  });

  test('should handle improving non-existent content', async () => {
    await shakespeare.initialize();
    
    const nonExistentPath = path.join(contentDir, 'does-not-exist.md');
    
    await expect(shakespeare.improveContent(nonExistentPath)).rejects.toThrow('No content found at path');
  });

  test('should determine status correctly based on scores', async () => {
    await shakespeare.initialize();
    
    // Add content with high scores (should be 'meets_targets')
    const highScoreMock = new MockContentScorer({
      scores: {
        readability: 9.0,
        seoScore: 9.0,
        technicalAccuracy: 9.0,
        engagement: 9.0,
        contentDepth: 9.0
      },
      analysis: {
        readability: { reasoning: 'Excellent', suggestions: [] },
        seoScore: { reasoning: 'Excellent', suggestions: [] },
        technicalAccuracy: { reasoning: 'Excellent', suggestions: [] },
        engagement: { reasoning: 'Excellent', suggestions: [] },
        contentDepth: { reasoning: 'Excellent', suggestions: [] }
      }
    });

    const highScoreShakespeare = new Shakespeare(contentDir, dbPath, {
      scanner: mockScanner,
      database: mockDatabase,
      ai: highScoreMock
    });

    await highScoreShakespeare.initialize();
    await highScoreShakespeare.updateContentIndex();

    const dbData = mockDatabase.getData();
    const testFilePath = path.join(contentDir, 'typescript-generics.md');
    const entry = dbData.entries[testFilePath];

    expect(entry.status).toBe('meets_targets');
  });

  test('should determine needs_review status for very low scores', async () => {
    // Clear previous data
    mockDatabase.clear();

    const lowScoreMock = new MockContentScorer({
      scores: {
        readability: 3.0,
        seoScore: 3.0,
        technicalAccuracy: 3.0,
        engagement: 3.0,
        contentDepth: 3.0
      },
      analysis: {
        readability: { reasoning: 'Poor', suggestions: [] },
        seoScore: { reasoning: 'Poor', suggestions: [] },
        technicalAccuracy: { reasoning: 'Poor', suggestions: [] },
        engagement: { reasoning: 'Poor', suggestions: [] },
        contentDepth: { reasoning: 'Poor', suggestions: [] }
      }
    });

    const lowScoreShakespeare = new Shakespeare(contentDir, dbPath, {
      scanner: mockScanner,
      database: mockDatabase,
      ai: lowScoreMock
    });

    await lowScoreShakespeare.initialize();
    await lowScoreShakespeare.updateContentIndex();

    const dbData = mockDatabase.getData();
    const testFilePath = path.join(contentDir, 'typescript-generics.md');
    const entry = dbData.entries[testFilePath];

    expect(entry.status).toBe('needs_review');
  });

  test('should return null when no worst scoring content exists', async () => {
    await shakespeare.initialize();
    
    // Add content that meets targets
    const perfectScoreMock = new MockContentScorer({
      scores: {
        readability: 10.0,
        seoScore: 10.0,
        technicalAccuracy: 10.0,
        engagement: 10.0,
        contentDepth: 10.0
      },
      analysis: {
        readability: { reasoning: 'Perfect', suggestions: [] },
        seoScore: { reasoning: 'Perfect', suggestions: [] },
        technicalAccuracy: { reasoning: 'Perfect', suggestions: [] },
        engagement: { reasoning: 'Perfect', suggestions: [] },
        contentDepth: { reasoning: 'Perfect', suggestions: [] }
      }
    });

    const perfectShakespeare = new Shakespeare(contentDir, dbPath, {
      scanner: mockScanner,
      database: mockDatabase,
      ai: perfectScoreMock
    });

    await perfectShakespeare.initialize();
    await perfectShakespeare.updateContentIndex();

    const worstContent = perfectShakespeare.getWorstScoringContent();
    expect(worstContent).toBeNull();
  });

  test('should skip entries that already exist during updateContentIndex', async () => {
    await shakespeare.initialize();
    
    // Add content initially
    await shakespeare.updateContentIndex();
    const dbDataAfterFirst = mockDatabase.getData();
    const initialEntryCount = Object.keys(dbDataAfterFirst.entries).length;
    
    // Run again - should not duplicate entries
    await shakespeare.updateContentIndex();
    const dbDataAfterSecond = mockDatabase.getData();
    const finalEntryCount = Object.keys(dbDataAfterSecond.entries).length;
    
    expect(finalEntryCount).toBe(initialEntryCount);
  });
});
