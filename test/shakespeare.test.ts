import { describe, expect, test, jest } from '@jest/globals';
import { Shakespeare } from '../src';
import path from 'path';
import fs from 'fs/promises';

describe('Shakespeare Content Analysis', () => {
  const contentDir = path.join(__dirname, 'content');
  const dbPath = path.join(__dirname, '.shakespeare-test', 'content-db.json');
  let shakespeare: Shakespeare;

  beforeAll(async () => {
    // Ensure test directories exist
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
  });

  beforeEach(() => {
    shakespeare = new Shakespeare(contentDir, dbPath);
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

    const db = await fs.readFile(dbPath, 'utf-8');
    const dbContent = JSON.parse(db);

    // Check if TypeScript generics article was found and analyzed
    const genericsMdPath = path.join(contentDir, 'typescript-generics.md');
    expect(dbContent.entries[genericsMdPath]).toBeDefined();
    
    const entry = dbContent.entries[genericsMdPath];
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

    const db = await fs.readFile(dbPath, 'utf-8');
    const dbContent = JSON.parse(db);
    const entry = dbContent.entries[contentPath];

    expect(entry.improvementIterations).toBe(1);
    expect(entry.reviewHistory).toHaveLength(2);
  });
});
