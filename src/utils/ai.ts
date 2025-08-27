import { GooseAI } from '@/utils/goose';
import { QualityDimensions } from '@/types/content';
import { IAI, IContentScorer, ScoringStrategy, EnhancedAIContentAnalysis, AIModelOptions, AIResponse, AICostInfo } from '@/types/interfaces';

export interface AIScoreResponse {
  score: number;
  reasoning: string;
  suggestions?: string[];
}

export interface AIContentAnalysis {
  scores: QualityDimensions;
  analysis: {
    [K in keyof QualityDimensions]: {
      reasoning: string;
      suggestions: string[];
    }
  };
}

/**
 * Prompts for content analysis
 */
export const ANALYSIS_PROMPTS = {
  readability: `
    Analyze the following content for readability. Consider:
    - Sentence structure and length
    - Vocabulary level and consistency
    - Paragraph organization
    - Use of transitions
    - Clear and concise explanations
    
    Score from 0-10 where:
    0-3: Difficult to read, needs major revision
    4-6: Somewhat readable but needs improvement
    7-8: Good readability
    9-10: Excellent, clear and engaging
    
    Provide:
    1. Numeric score (0-10)
    2. Brief reasoning for the score
    3. Specific suggestions for improvement
    
    Content to analyze:
    {content}
    `,

  seoScore: `
    Evaluate the following content for SEO effectiveness. Consider:
    - Keyword usage and placement
    - Meta description potential
    - Header structure and organization
    - Internal/external linking opportunities
    - Content length and depth
    
    Score from 0-10 where:
    0-3: Poor SEO optimization
    4-6: Basic SEO implementation
    7-8: Good SEO practices
    9-10: Excellent SEO optimization
    
    Provide:
    1. Numeric score (0-10)
    2. Brief reasoning for the score
    3. Specific suggestions for improvement
    
    Content to analyze:
    {content}
    `,

  technicalAccuracy: `
    Review the following content for technical accuracy. Consider:
    - Factual correctness
    - Code examples (if any)
    - Technical terminology usage
    - Up-to-date information
    - Technical depth appropriate for the topic
    
    Score from 0-10 where:
    0-3: Contains significant technical errors
    4-6: Some technical inaccuracies
    7-8: Generally accurate with minor issues
    9-10: Highly accurate and well-researched
    
    Provide:
    1. Numeric score (0-10)
    2. Brief reasoning for the score
    3. Specific suggestions for improvement
    
    Content to analyze:
    {content}
    `,

  engagement: `
    Evaluate the content's engagement level. Consider:
    - Writing style and tone
    - Use of examples and analogies
    - Reader interaction elements
    - Story-telling elements
    - Call-to-action effectiveness
    
    Score from 0-10 where:
    0-3: Dry and unengaging
    4-6: Somewhat engaging but could improve
    7-8: Good engagement level
    9-10: Highly engaging and compelling
    
    Provide:
    1. Numeric score (0-10)
    2. Brief reasoning for the score
    3. Specific suggestions for improvement
    
    Content to analyze:
    {content}
    `,

  contentDepth: `
    Analyze the content's depth and comprehensiveness. Consider:
    - Topic coverage breadth
    - Supporting evidence and examples
    - Explanation thoroughness
    - Context and background information
    - Advanced concept handling
    
    Score from 0-10 where:
    0-3: Surface level only
    4-6: Basic coverage with some depth
    7-8: Good depth with most aspects covered
    9-10: Comprehensive and thorough coverage
    
    Provide:
    1. Numeric score (0-10)
    2. Brief reasoning for the score
    3. Specific suggestions for improvement
    
    Content to analyze:
    {content}
    `
};

/**
 * Prompt for content improvement
 */
export const IMPROVEMENT_PROMPT = `
You are a content improvement specialist. Review the following content and its quality analysis.
Focus on the dimensions that scored lowest and provide specific improvements.

Current scores and analysis:
{analysis}

Original content:
{content}

Please provide:
1. Improved version of the content
2. Summary of changes made
3. Expected impact on quality scores

Make sure to maintain any technical accuracy while improving readability and engagement.
Preserve the original meaning and intent while enhancing the presentation and effectiveness.
`;

/**
 * Parse Goose response to extract score, reasoning, and suggestions
 */
function parseGooseResponse(response: string): AIScoreResponse {
  // Example response parsing - adjust based on actual Goose output format
  const lines = response.split('\n').map(l => l.trim()).filter(Boolean);
  
  let score = 7.0; // Default score
  let reasoning = '';
  const suggestions: string[] = [];
  
  for (const line of lines) {
    if (line.match(/^\d+(\.\d+)?$/)) {
      score = parseFloat(line);
    } else if (line.startsWith('- ')) {
      suggestions.push(line.slice(2));
    } else {
      reasoning = line;
    }
  }
  
  return {
    score,
    reasoning,
    suggestions
  };
}

/**
 * Options for AIScorer constructor
 */
export interface AIScorerOptions {
  ai?: IAI;
}

/**
 * AI scoring system implementation with cost optimization
 */
export class AIScorer implements IContentScorer {
  private ai: IAI;

  constructor(options: AIScorerOptions = {}) {
    this.ai = options.ai ?? new GooseAI();
  }

  /**
   * Score content across all quality dimensions
   */
  async scoreContent(content: string): Promise<AIContentAnalysis> {
    const analysis: Partial<AIContentAnalysis> = {
      scores: {} as QualityDimensions,
      analysis: {} as AIContentAnalysis['analysis']
    };

    // Score each dimension
    for (const [dimension, promptTemplate] of Object.entries(ANALYSIS_PROMPTS)) {
      const prompt = promptTemplate.replace('{content}', content);
      const result = await this.scoreDimension(content, prompt);
      
      // Update scores and analysis
      (analysis.scores as any)[dimension] = result.score;
      (analysis.analysis as any)[dimension] = {
        reasoning: result.reasoning,
        suggestions: result.suggestions || []
      };
    }

    return analysis as AIContentAnalysis;
  }

  /**
   * Score content for a specific dimension
   */
  private async scoreDimension(content: string, prompt: string): Promise<AIScoreResponse> {
    try {
      const response = await this.ai.prompt(prompt);
      return parseGooseResponse(response);
    } catch (error) {
      console.error('Error scoring content:', error);
      return {
        score: 5.0,
        reasoning: 'Error during scoring process',
        suggestions: ['Retry scoring']
      };
    }
  }

  /**
   * Generate improved content based on analysis
   */
  async improveContent(content: string, analysis: AIContentAnalysis): Promise<string> {
    const response = await this.improveContentWithCosts(content, analysis);
    return response.content;
  }

  /**
   * Enhanced scoring with cost tracking and model selection
   */
  async scoreContentWithCosts(content: string, strategies?: ScoringStrategy[]): Promise<EnhancedAIContentAnalysis> {
    const analysis: Partial<AIContentAnalysis> = {
      scores: {} as QualityDimensions,
      analysis: {} as AIContentAnalysis['analysis']
    };
    
    const costBreakdown: Record<string, AICostInfo> = {};
    let totalCost = 0;

    // Create default strategies if none provided - optimized for cost
    const defaultStrategies: ScoringStrategy[] = strategies || [
      { dimension: 'readability', preferredModel: { provider: 'google', model: 'gemini-1.5-flash' } },
      { dimension: 'seoScore', preferredModel: { provider: 'google', model: 'gemini-1.5-flash' } },
      { dimension: 'technicalAccuracy', preferredModel: { provider: 'groq', model: 'llama-3.1-8b' } },
      { dimension: 'engagement', preferredModel: { provider: 'google', model: 'gemini-1.5-flash' } },
      { dimension: 'contentDepth', preferredModel: { provider: 'groq', model: 'llama-3.1-8b' } }
    ];

    // Score each dimension with cost tracking
    for (const strategy of defaultStrategies) {
      const promptTemplate = ANALYSIS_PROMPTS[strategy.dimension];
      const prompt = promptTemplate.replace('{content}', content);
      
      try {
        const result = await this.scoreDimensionWithCost(prompt, strategy.preferredModel);
        
        // Update scores and analysis
        (analysis.scores as any)[strategy.dimension] = result.response.score;
        (analysis.analysis as any)[strategy.dimension] = {
          reasoning: result.response.reasoning,
          suggestions: result.response.suggestions || []
        };
        
        // Track costs
        costBreakdown[strategy.dimension] = result.costInfo;
        totalCost += result.costInfo.totalCost;
        
      } catch (error) {
        console.error(`Error scoring ${strategy.dimension}:`, error);
        // Use default values on error
        (analysis.scores as any)[strategy.dimension] = 5.0;
        (analysis.analysis as any)[strategy.dimension] = {
          reasoning: 'Error during scoring process',
          suggestions: ['Retry scoring']
        };
      }
    }

    return {
      analysis: analysis as AIContentAnalysis,
      totalCost,
      costBreakdown
    };
  }

  /**
   * Enhanced content improvement with cost tracking
   */
  async improveContentWithCosts(content: string, analysis: AIContentAnalysis, options?: AIModelOptions): Promise<AIResponse> {
    const analysisStr = JSON.stringify(analysis, null, 2);
    const prompt = IMPROVEMENT_PROMPT
      .replace('{analysis}', analysisStr)
      .replace('{content}', content);

    // Use provided options or let GooseAI use its configured defaults
    // Don't force any provider/model defaults here - respect user configuration
    const finalOptions = options;

    try {
      if ('promptWithOptions' in this.ai && typeof this.ai.promptWithOptions === 'function') {
        const response = await (this.ai as any).promptWithOptions(prompt, finalOptions);
        // Extract the improved content from the response
        const sections = response.content.split('\n\n');
        return {
          content: sections[0] || content,
          costInfo: response.costInfo
        };
      } else {
        // Fallback for IAI implementations without cost tracking
        const responseText = await this.ai.prompt(prompt);
        const sections = responseText.split('\n\n');
        return {
          content: sections[0] || content,
          costInfo: {
            provider: finalOptions?.provider || 'unknown',
            model: finalOptions?.model || 'unknown',
            inputTokens: Math.ceil(prompt.length / 4),
            outputTokens: Math.ceil(responseText.length / 4),
            totalCost: 0, // Cannot calculate without enhanced AI
            timestamp: new Date().toISOString()
          }
        };
      }
    } catch (error) {
      console.error('Error improving content:', error);
      return {
        content,
        costInfo: {
          provider: finalOptions?.provider || 'unknown',
          model: finalOptions?.model || 'unknown',
          inputTokens: 0,
          outputTokens: 0,
          totalCost: 0,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Batch scoring for cost optimization
   */
  async scoreContentBatch(contentList: string[], strategies?: ScoringStrategy[]): Promise<EnhancedAIContentAnalysis[]> {
    // For now, process sequentially. In the future, this could be enhanced with actual batch API calls
    const results: EnhancedAIContentAnalysis[] = [];
    
    for (const content of contentList) {
      const result = await this.scoreContentWithCosts(content, strategies);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Estimate cost for scoring operation
   */
  async estimateScoringCost(content: string, strategies?: ScoringStrategy[]): Promise<number> {
    if (!('estimateCost' in this.ai) || typeof this.ai.estimateCost !== 'function') {
      return 0; // Cannot estimate without enhanced AI
    }

    const defaultStrategies: ScoringStrategy[] = strategies || [
      { dimension: 'readability', preferredModel: { provider: 'google', model: 'gemini-1.5-flash' } },
      { dimension: 'seoScore', preferredModel: { provider: 'google', model: 'gemini-1.5-flash' } },
      { dimension: 'technicalAccuracy', preferredModel: { provider: 'groq', model: 'llama-3.1-8b' } },
      { dimension: 'engagement', preferredModel: { provider: 'google', model: 'gemini-1.5-flash' } },
      { dimension: 'contentDepth', preferredModel: { provider: 'groq', model: 'llama-3.1-8b' } }
    ];

    let totalEstimatedCost = 0;
    
    for (const strategy of defaultStrategies) {
      const promptTemplate = ANALYSIS_PROMPTS[strategy.dimension];
      const prompt = promptTemplate.replace('{content}', content);
      const cost = await (this.ai as any).estimateCost(prompt, strategy.preferredModel);
      totalEstimatedCost += cost;
    }
    
    return totalEstimatedCost;
  }

  /**
   * Estimate cost for improvement operation
   */
  async estimateImprovementCost(content: string, analysis: AIContentAnalysis, options?: AIModelOptions): Promise<number> {
    if (!('estimateCost' in this.ai) || typeof this.ai.estimateCost !== 'function') {
      return 0; // Cannot estimate without enhanced AI
    }

    const analysisStr = JSON.stringify(analysis, null, 2);
    const prompt = IMPROVEMENT_PROMPT
      .replace('{analysis}', analysisStr)
      .replace('{content}', content);

    // Use provided options or let GooseAI use its configured defaults  
    return await (this.ai as any).estimateCost(prompt, options);
  }

  /**
   * Score a specific dimension with cost tracking
   */
  private async scoreDimensionWithCost(prompt: string, modelOptions?: AIModelOptions): Promise<{
    response: AIScoreResponse;
    costInfo: AICostInfo;
  }> {
    if ('promptWithOptions' in this.ai && typeof this.ai.promptWithOptions === 'function') {
      const response = await (this.ai as any).promptWithOptions(prompt, modelOptions);
      return {
        response: parseGooseResponse(response.content),
        costInfo: response.costInfo
      };
    } else {
      // Fallback for basic IAI implementations
      const responseText = await this.ai.prompt(prompt);
      return {
        response: parseGooseResponse(responseText),
        costInfo: {
          provider: modelOptions?.provider || 'unknown',
          model: modelOptions?.model || 'unknown',
          inputTokens: Math.ceil(prompt.length / 4),
          outputTokens: Math.ceil(responseText.length / 4),
          totalCost: 0,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}

/**
 * Factory function for creating AIScorer instances
 */
export function createAIScorer(options?: AIScorerOptions): AIScorer {
  return new AIScorer(options);
}
