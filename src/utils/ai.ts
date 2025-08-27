import { GooseAI } from '@/utils/goose';
import { QualityDimensions } from '@/types/content';
import { IAI, IContentScorer, ScoringStrategy, EnhancedAIContentAnalysis, AIModelOptions, AIResponse, AICostInfo } from '@/types/interfaces';
import { ShakespeareLogger } from '@/utils/logger';

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

CRITICAL INSTRUCTIONS:
1. Return ONLY the improved version of the complete content
2. Do NOT include any preamble, explanation, or commentary
3. Do NOT start with phrases like "I'll help improve..." or "Here's the improved version..."
4. Preserve ALL frontmatter (YAML between --- delimiters) EXACTLY as is
5. Preserve ALL MDX/JSX components and their syntax
6. Maintain the same file format (Markdown, MDX, etc.)
7. Start your response with the frontmatter (if present) or the first line of actual content

Focus improvements on:
- Dimensions that scored lowest in the analysis
- Maintaining technical accuracy while improving readability
- Enhancing engagement without changing the core message
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
  logger?: ShakespeareLogger;
  defaultModelOptions?: AIModelOptions;
}

/**
 * AI scoring system implementation with cost optimization
 */
export class AIScorer implements IContentScorer {
  private ai: IAI;
  private logger: ShakespeareLogger;
  private defaultModelOptions?: AIModelOptions;

  constructor(options: AIScorerOptions = {}) {
    this.ai = options.ai ?? new GooseAI();
    this.logger = options.logger ?? new ShakespeareLogger();
    this.defaultModelOptions = options.defaultModelOptions;
  }

  /**
   * Score content across all quality dimensions
   */
  /**
   * Score content across all quality dimensions
   * This is the single entry point for content scoring
   */
  async scoreContent(content: string, strategies?: ScoringStrategy[]): Promise<EnhancedAIContentAnalysis> {
    const analysis: Partial<AIContentAnalysis> = {
      scores: {} as QualityDimensions,
      analysis: {} as AIContentAnalysis['analysis']
    };
    
    const costBreakdown: Record<string, AICostInfo> = {};
    let totalCost = 0;

    // Use default strategies if none provided - respect configured model options
    const defaultModel = this.defaultModelOptions || { provider: 'google', model: 'gemini-1.5-flash' };
    
    const scoringStrategies: ScoringStrategy[] = strategies || [
      { dimension: 'readability', preferredModel: defaultModel },
      { dimension: 'seoScore', preferredModel: defaultModel },
      { dimension: 'technicalAccuracy', preferredModel: defaultModel },
      { dimension: 'engagement', preferredModel: defaultModel },
      { dimension: 'contentDepth', preferredModel: defaultModel }
    ];

    // Score each dimension with cost tracking
    for (const strategy of scoringStrategies) {
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
        this.logger.logError(`Error scoring ${strategy.dimension}`, error);
        // Fail loudly - don't hide errors with default values
        throw new Error(`Failed to score ${strategy.dimension}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      analysis: analysis as AIContentAnalysis,
      totalCost,
      costBreakdown
    };
  }

  /**
   * Score content for a specific dimension
   */
  private async scoreDimension(content: string, prompt: string): Promise<AIScoreResponse> {
    try {
      const response = await this.ai.prompt(prompt);
      return parseGooseResponse(response);
    } catch (error) {
      this.logger.logError('Error scoring content', error);
      // Fail loudly - don't hide errors with default values
      throw new Error(`Content scoring failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate improved content based on analysis
   * This is the single entry point for content improvement
   */
  async improveContent(content: string, analysis: AIContentAnalysis, options?: AIModelOptions): Promise<AIResponse> {
    const analysisStr = JSON.stringify(analysis, null, 2);
    const prompt = IMPROVEMENT_PROMPT
      .replace('{analysis}', analysisStr)
      .replace('{content}', content);

    // Always use promptWithOptions - no fallbacks
    if (!('promptWithOptions' in this.ai) || typeof this.ai.promptWithOptions !== 'function') {
      throw new Error('AI implementation must support promptWithOptions method');
    }

    const response = await (this.ai as any).promptWithOptions(prompt, options);
    
    // The AI should return the complete improved content
    // We expect the entire response to be the improved content based on our prompt
    let improvedContent = response.content.trim();
    
    // Basic validation
    if (!improvedContent || improvedContent.length === 0) {
      throw new Error('AI returned empty improved content');
    }
    
    // Check if the AI included unwanted preamble (common patterns)
    const unwantedPreambles = [
      /^I'll help.*?\n\n/i,
      /^Here's the improved.*?\n\n/i,
      /^Let me.*?\n\n/i,
      /^I've improved.*?\n\n/i,
      /^Below is.*?\n\n/i,
      /^The improved.*?\n\n/i
    ];
    
    for (const pattern of unwantedPreambles) {
      if (pattern.test(improvedContent)) {
        // Remove the preamble and everything before the actual content
        improvedContent = improvedContent.replace(pattern, '');
        break;
      }
    }
    
    // Ensure frontmatter is preserved (if original had it)
    const originalHasFrontmatter = content.trim().startsWith('---');
    const improvedHasFrontmatter = improvedContent.trim().startsWith('---');
    
    if (originalHasFrontmatter && !improvedHasFrontmatter) {
      // Extract original frontmatter
      const frontmatterEndIndex = content.indexOf('---', 3);
      if (frontmatterEndIndex !== -1) {
        const originalFrontmatter = content.substring(0, frontmatterEndIndex + 3);
        // Prepend original frontmatter if AI didn't preserve it
        improvedContent = originalFrontmatter + '\n\n' + improvedContent;
      }
    }
    
    // Final validation - should have substantial content
    if (improvedContent.length < content.length * 0.3) {
      throw new Error(`AI returned suspiciously short content (${improvedContent.length} chars vs original ${content.length} chars)`);
    }
    
    return {
      content: improvedContent,
      costInfo: response.costInfo
    };
  }

  // Remove scoreContentWithCosts - use scoreContent directly

  // Remove improveContentWithCosts - use improveContent directly

  /**
   * Batch scoring for cost optimization
   */
  async scoreContentBatch(contentList: string[], strategies?: ScoringStrategy[]): Promise<EnhancedAIContentAnalysis[]> {
    // For now, process sequentially. In the future, this could be enhanced with actual batch API calls
    const results: EnhancedAIContentAnalysis[] = [];
    
    for (const content of contentList) {
      const result = await this.scoreContent(content, strategies);
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

    const defaultModel = this.defaultModelOptions || { provider: 'google', model: 'gemini-1.5-flash' };
    
    const defaultStrategies: ScoringStrategy[] = strategies || [
      { dimension: 'readability', preferredModel: defaultModel },
      { dimension: 'seoScore', preferredModel: defaultModel },
      { dimension: 'technicalAccuracy', preferredModel: defaultModel },
      { dimension: 'engagement', preferredModel: defaultModel },
      { dimension: 'contentDepth', preferredModel: defaultModel }
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
