import { AIScorer } from '@/utils/ai';
import { GooseAI } from '@/utils/goose';
import { AIContentAnalysis } from '@/utils/ai';

describe('Provider Auto-Addition Bug Fix', () => {
  it('should respect user-configured provider defaults instead of forcing anthropic', async () => {
    // Create GooseAI with custom provider (not anthropic)
    const mockGooseAI = {
      defaultOptions: { provider: 'google', model: 'gemini-1.5-flash' },
      prompt: jest.fn().mockResolvedValue('Improved content'),
      promptWithOptions: jest.fn().mockResolvedValue({
        content: 'Improved content',
        costInfo: {
          provider: 'google',
          model: 'gemini-1.5-flash',
          inputTokens: 100,
          outputTokens: 50,
          totalCost: 0.01,
          timestamp: new Date().toISOString()
        }
      }),
      estimateCost: jest.fn().mockResolvedValue(0.01)
    };

    const aiScorer = new AIScorer({ ai: mockGooseAI as any });

    const mockAnalysis: AIContentAnalysis = {
      scores: {
        readability: 6.0,
        seoScore: 5.0,
        technicalAccuracy: 7.0,
        engagement: 6.5,
        contentDepth: 5.5
      },
      analysis: {
        readability: { reasoning: 'Test', suggestions: [] },
        seoScore: { reasoning: 'Test', suggestions: [] },
        technicalAccuracy: { reasoning: 'Test', suggestions: [] },
        engagement: { reasoning: 'Test', suggestions: [] },
        contentDepth: { reasoning: 'Test', suggestions: [] }
      }
    };

    // Test improvement without forcing any specific options
    await aiScorer.improveContent('Test content', mockAnalysis);

    // Verify that no provider/model options were forced (should be undefined)
    expect(mockGooseAI.promptWithOptions).toHaveBeenCalledWith(
      expect.any(String), // the prompt
      undefined // no forced options
    );
  });

  it('should pass through user-provided options without modification', async () => {
    const mockGooseAI = {
      defaultOptions: {},
      promptWithOptions: jest.fn().mockResolvedValue({
        content: 'Improved content',
        costInfo: {
          provider: 'deepinfra',
          model: 'deepseek-chat',
          inputTokens: 100,
          outputTokens: 50,
          totalCost: 0.005,
          timestamp: new Date().toISOString()
        }
      })
    };

    const aiScorer = new AIScorer({ ai: mockGooseAI as any });

    const mockAnalysis: AIContentAnalysis = {
      scores: {
        readability: 6.0,
        seoScore: 5.0,
        technicalAccuracy: 7.0,
        engagement: 6.5,
        contentDepth: 5.5
      },
      analysis: {
        readability: { reasoning: 'Test', suggestions: [] },
        seoScore: { reasoning: 'Test', suggestions: [] },
        technicalAccuracy: { reasoning: 'Test', suggestions: [] },
        engagement: { reasoning: 'Test', suggestions: [] },
        contentDepth: { reasoning: 'Test', suggestions: [] }
      }
    };

    // Test with explicit user options
    const userOptions = { provider: 'deepinfra', model: 'deepseek-chat' };
    await aiScorer.improveContent('Test content', mockAnalysis, userOptions);

    // Verify that the exact user options were passed through
    expect(mockGooseAI.promptWithOptions).toHaveBeenCalledWith(
      expect.any(String), // the prompt
      userOptions // exact user options passed through
    );
  });

  it('should not force defaults in cost estimation either', async () => {
    const mockGooseAI = {
      defaultOptions: { provider: 'groq', model: 'llama-3.1-8b' },
      estimateCost: jest.fn().mockResolvedValue(0.002)
    };

    const aiScorer = new AIScorer({ ai: mockGooseAI as any });

    const mockAnalysis: AIContentAnalysis = {
      scores: {
        readability: 6.0,
        seoScore: 5.0,
        technicalAccuracy: 7.0,
        engagement: 6.5,
        contentDepth: 5.5
      },
      analysis: {
        readability: { reasoning: 'Test', suggestions: [] },
        seoScore: { reasoning: 'Test', suggestions: [] },
        technicalAccuracy: { reasoning: 'Test', suggestions: [] },
        engagement: { reasoning: 'Test', suggestions: [] },
        contentDepth: { reasoning: 'Test', suggestions: [] }
      }
    };

    // Test cost estimation without forcing options
    await aiScorer.estimateImprovementCost('Test content', mockAnalysis);

    // Verify no forced options in cost estimation
    expect(mockGooseAI.estimateCost).toHaveBeenCalledWith(
      expect.any(String), // the prompt
      undefined // no forced options
    );
  });
});