import { describe, expect, test, jest } from '@jest/globals';
import { AIScorer } from '../src/utils/ai';
import path from 'path';
import fs from 'fs/promises';

describe('AI Content Scoring', () => {
  const contentPath = path.join(__dirname, 'content', 'typescript-generics.md');
  let scorer: AIScorer;
  let content: string;

  beforeAll(async () => {
    content = await fs.readFile(contentPath, 'utf-8');
  });

  beforeEach(() => {
    scorer = new AIScorer();
  });

  test('should score content across all dimensions', async () => {
    const analysis = await scorer.scoreContent(content);
    
    // Check all dimensions are scored
    expect(analysis.scores).toHaveProperty('readability');
    expect(analysis.scores).toHaveProperty('seoScore');
    expect(analysis.scores).toHaveProperty('technicalAccuracy');
    expect(analysis.scores).toHaveProperty('engagement');
    expect(analysis.scores).toHaveProperty('contentDepth');

    // Check score ranges
    Object.values(analysis.scores).forEach(score => {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(10);
    });
  });

  test('should provide analysis with reasoning and suggestions', async () => {
    const analysis = await scorer.scoreContent(content);
    
    // Check analysis structure
    Object.values(analysis.analysis).forEach(dimension => {
      expect(dimension).toHaveProperty('reasoning');
      expect(dimension).toHaveProperty('suggestions');
      expect(Array.isArray(dimension.suggestions)).toBe(true);
    });
  });

  test('should improve content', async () => {
    const analysis = await scorer.scoreContent(content);
    const improvedContent = await scorer.improveContent(content, analysis);
    
    // Improved content should be different from original
    expect(improvedContent).not.toBe(content);
    expect(improvedContent.length).toBeGreaterThan(0);
  });
});
