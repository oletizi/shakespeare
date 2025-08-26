import { describe, expect, test, beforeAll, beforeEach, jest } from '@jest/globals';
import { AIScorer } from '../src/utils/ai';
import { MockAI } from './utils/mocks';
import path from 'path';
import fs from 'fs/promises';

describe('AI Content Scoring', () => {
  const contentPath = path.join(__dirname, 'content', 'typescript-generics.md');
  let scorer: AIScorer;
  let mockAI: MockAI;
  let content: string;

  beforeAll(async () => {
    content = await fs.readFile(contentPath, 'utf-8');
  });

  beforeEach(() => {
    // Setup mock responses for each quality dimension
    const mockResponses = [
      '7.5\nGood readability with clear structure\n- Use shorter sentences\n- Add more examples',
      '8.0\nWell-structured for SEO\n- Add more keywords\n- Improve meta description',
      '9.0\nTechnically accurate content\n- Add more recent examples\n- Include edge cases',
      '7.0\nSomewhat engaging\n- Add more interactive elements\n- Include real-world scenarios',
      '8.5\nGood depth of coverage\n- Expand on advanced topics\n- Add more detailed examples'
    ];

    mockAI = new MockAI(mockResponses);
    scorer = new AIScorer({ ai: mockAI });
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
    // First, get the analysis (this will consume the first 5 mock responses)
    const analysis = await scorer.scoreContent(content);
    
    // Add mock response for improvement
    mockAI.addResponse('# Improved Understanding TypeScript Generics\n\nThis improved content has better structure and examples...\n\nSummary of changes: Added more examples, improved readability\nExpected impact: Higher engagement and readability scores');
    
    const improvedContent = await scorer.improveContent(content, analysis);
    
    // Improved content should be different from original
    expect(improvedContent).not.toBe(content);
    expect(improvedContent.length).toBeGreaterThan(0);
    expect(improvedContent).toContain('Improved Understanding TypeScript Generics');
  });

  test('should handle AI errors during scoring', async () => {
    // Create a mock AI that throws errors
    class ErrorAI extends MockAI {
      async prompt(prompt: string): Promise<string> {
        throw new Error('AI service unavailable');
      }
    }
    
    const errorAI = new ErrorAI([]);
    const errorScorer = new AIScorer({ ai: errorAI });
    const analysis = await errorScorer.scoreContent(content);
    
    // Should return default error values
    expect(analysis.scores.readability).toBe(5.0);
    expect(analysis.analysis.readability.reasoning).toBe('Error during scoring process');
    expect(analysis.analysis.readability.suggestions).toContain('Retry scoring');
  });

  test('should handle AI errors during content improvement', async () => {
    // First get a successful analysis
    const analysis = await scorer.scoreContent(content);
    
    // Create AI that fails on improvement
    class ErrorAI extends MockAI {
      async prompt(prompt: string): Promise<string> {
        throw new Error('AI service unavailable');
      }
    }
    
    const errorAI = new ErrorAI([]);
    const errorScorer = new AIScorer({ ai: errorAI });
    const improvedContent = await errorScorer.improveContent(content, analysis);
    
    // Should return original content on error
    expect(improvedContent).toBe(content);
  });

  test('should parse malformed AI responses gracefully', async () => {
    // Create AI that returns malformed responses
    const malformedAI = new MockAI([
      'invalid response format',
      'another invalid response',
      'yet another invalid response',
      'invalid response 4',
      'invalid response 5'
    ]);
    
    const malformedScorer = new AIScorer({ ai: malformedAI });
    const analysis = await malformedScorer.scoreContent(content);
    
    // Should still return valid analysis with default scores
    expect(analysis.scores).toBeDefined();
    expect(analysis.analysis).toBeDefined();
    expect(typeof analysis.scores.readability).toBe('number');
  });
});
