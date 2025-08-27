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
    Analyze the following content for readability. Consider sentence structure, vocabulary level, paragraph organization, transitions, and clarity.
    
    You MUST respond in this exact format:
    
    SCORE: [number from 0-10]
    REASONING: [2-3 sentences explaining the score]
    SUGGESTIONS:
    - [Specific actionable suggestion 1]
    - [Specific actionable suggestion 2]
    - [Specific actionable suggestion 3]
    
    Score meanings:
    0-3: Difficult to read, needs major revision
    4-6: Somewhat readable but needs improvement  
    7-8: Good readability with minor issues
    9-10: Excellent, clear and engaging
    
    Content to analyze:
    {content}
    `,

  seoScore: `
    Evaluate the following content for SEO effectiveness. Consider keyword usage, header structure, content length, and search intent alignment.
    
    You MUST respond in this exact format:
    
    SCORE: [number from 0-10]
    REASONING: [2-3 sentences explaining the score]
    SUGGESTIONS:
    - [Specific actionable suggestion 1]
    - [Specific actionable suggestion 2]
    - [Specific actionable suggestion 3]
    
    Score meanings:
    0-3: Poor SEO optimization, needs major improvements
    4-6: Basic SEO with significant room for improvement
    7-8: Good SEO optimization with minor gaps
    9-10: Excellent SEO optimization
    
    Content to analyze:
    {content}
    `,

  technicalAccuracy: `
    Review the following content for technical accuracy. Consider factual correctness, code examples, terminology usage, and up-to-date information.
    
    You MUST respond in this exact format:
    
    SCORE: [number from 0-10]
    REASONING: [2-3 sentences explaining the score]
    SUGGESTIONS:
    - [Specific actionable suggestion 1]
    - [Specific actionable suggestion 2]
    - [Specific actionable suggestion 3]
    
    Score meanings:
    0-3: Contains significant technical errors
    4-6: Some technical inaccuracies need fixing
    7-8: Generally accurate with minor issues
    9-10: Highly accurate and well-researched
    
    Content to analyze:
    {content}
    `,

  engagement: `
    Evaluate the content's engagement level. Consider writing style, examples, reader interaction elements, and storytelling.
    
    You MUST respond in this exact format:
    
    SCORE: [number from 0-10]
    REASONING: [2-3 sentences explaining the score]
    SUGGESTIONS:
    - [Specific actionable suggestion 1]
    - [Specific actionable suggestion 2]
    - [Specific actionable suggestion 3]
    
    Score meanings:
    0-3: Dry and unengaging, needs major improvements
    4-6: Somewhat engaging but significant room for improvement
    7-8: Good engagement level with minor enhancements needed
    9-10: Highly engaging and compelling
    
    Content to analyze:
    {content}
    `,

  contentDepth: `
    Analyze the content's depth and comprehensiveness. Consider topic coverage, supporting evidence, explanation thoroughness, and advanced concepts.
    
    You MUST respond in this exact format:
    
    SCORE: [number from 0-10]
    REASONING: [2-3 sentences explaining the score]
    SUGGESTIONS:
    - [Specific actionable suggestion 1]
    - [Specific actionable suggestion 2]
    - [Specific actionable suggestion 3]
    
    Score meanings:
    0-3: Surface level only, needs significant depth
    4-6: Basic coverage with some depth, needs expansion
    7-8: Good depth with most aspects covered
    9-10: Comprehensive and thorough coverage
    
    Content to analyze:
    {content}
    `
};

/**
 * Prompt for content improvement
 */
export const IMPROVEMENT_PROMPT = `
You are a content improvement specialist. Review the following content and its quality analysis.
Your goal is to ENHANCE the existing content while preserving its comprehensive depth and structure.

Current scores and analysis:
{analysis}

Original content:
{content}

CRITICAL LENGTH AND STRUCTURE PRESERVATION:
- MAINTAIN the original content length and depth - your improved version should be similar in length to the original
- PRESERVE all valuable information, examples, code blocks, and technical details
- DO NOT condense, summarize, or remove comprehensive coverage
- ENHANCE clarity and presentation while keeping all substantive content
- If the original is comprehensive and detailed, your improvement should be equally comprehensive

CRITICAL OUTPUT INSTRUCTIONS:
1. Return ONLY the improved version of the complete content
2. Do NOT include any preamble, explanation, or commentary
3. Do NOT start with phrases like "I'll help improve..." or "Here's the improved version..."
4. Preserve ALL frontmatter (YAML between --- delimiters) EXACTLY as is
5. Preserve ALL MDX/JSX components and their syntax
6. Maintain the same file format (Markdown, MDX, etc.)
7. Start your response with the frontmatter (if present) or the first line of actual content

IMPROVEMENT FOCUS:
- Target dimensions that scored lowest in the analysis
- Improve readability through better organization, clearer explanations, and smoother transitions
- Enhance engagement with better examples, more compelling language, and improved structure
- Fix technical accuracy issues while maintaining comprehensive coverage
- Improve SEO through better headers, keyword usage, and content organization
- Deepen content where suggestions indicate gaps, but preserve existing depth

Remember: You are IMPROVING comprehensive content, not rewriting or condensing it. The enhanced version should maintain the original's value while being more effective and engaging.
`;

/**
 * Parse Goose response to extract score, reasoning, and suggestions
 * Handles the structured format: SCORE: X, REASONING: Y, SUGGESTIONS: - item1, - item2
 */
function parseGooseResponse(response: string): AIScoreResponse {
  let score = 7.0; // Default score
  let reasoning = 'Analysis completed';
  const suggestions: string[] = [];
  
  try {
    const lines = response.split('\n').map(l => l.trim()).filter(Boolean);
    let inSuggestions = false;
    
    for (const line of lines) {
      // Look for structured format first
      if (line.startsWith('SCORE:')) {
        const scoreMatch = line.match(/SCORE:\s*(\d+(?:\.\d+)?)/);
        if (scoreMatch) {
          score = parseFloat(scoreMatch[1]);
        }
      } else if (line.startsWith('REASONING:')) {
        reasoning = line.replace(/^REASONING:\s*/, '').trim();
      } else if (line === 'SUGGESTIONS:') {
        inSuggestions = true;
      } else if (inSuggestions && line.startsWith('- ')) {
        suggestions.push(line.slice(2).trim());
      } else if (inSuggestions && !line.startsWith('- ') && line.length > 0) {
        // Stop collecting suggestions if we hit non-bullet text
        inSuggestions = false;
      }
      
      // Fallback: if no structured format, try old parsing
      if (!line.startsWith('SCORE:') && !line.startsWith('REASONING:') && !line.startsWith('SUGGESTIONS:')) {
        // Look for standalone number (old format)
        if (line.match(/^\d+(\.\d+)?$/)) {
          score = parseFloat(line);
        } else if (line.startsWith('- ') && suggestions.length === 0) {
          // Only collect old-format suggestions if we haven't found structured ones
          suggestions.push(line.slice(2).trim());
        } else if (reasoning === 'Analysis completed' && line.length > 20) {
          // Use longer lines as reasoning if we haven't found structured reasoning
          reasoning = line;
        }
      }
    }
    
    // Ensure we have at least some suggestions even if parsing partially failed
    if (suggestions.length === 0) {
      suggestions.push('Review content structure and clarity');
      suggestions.push('Consider adding more specific examples');
      suggestions.push('Enhance explanation depth where needed');
    }
    
  } catch (error) {
    console.warn('Error parsing AI response, using defaults:', error);
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
    if (options) {
      return this.improveContentWithModels(content, analysis, [options]);
    } else {
      // Pass undefined to let the AI use its defaultOptions
      return this.improveContentWithModels(content, analysis, [undefined as any]);
    }
  }

  async improveContentWithModels(content: string, analysis: AIContentAnalysis, modelOptions: AIModelOptions[]): Promise<AIResponse> {
    if (!modelOptions || modelOptions.length === 0) {
      throw new Error('At least one model option must be provided');
    }
    
    // Generate unique execution ID for tracking
    const executionId = `improve-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    // Write detailed execution logs to file only
    this.logger.info(`[${executionId}] Starting content improvement at ${timestamp}`, {
      executionId,
      originalContentLength: content.length,
      timestamp,
      operation: 'improve_content_start'
    });
    
    const analysisStr = JSON.stringify(analysis, null, 2);
    const prompt = IMPROVEMENT_PROMPT
      .replace('{analysis}', analysisStr)
      .replace('{content}', content);
    
    this.logger.info(`[${executionId}] Full improvement request`, {
      executionId,
      promptLength: prompt.length,
      fullPrompt: prompt,
      originalContent: content,
      operation: 'improve_content_full_request',
      originalContentLength: content.length
    });

    // Always use promptWithOptions - no fallbacks
    if (!('promptWithOptions' in this.ai) || typeof this.ai.promptWithOptions !== 'function') {
      throw new Error('AI implementation must support promptWithOptions method');
    }

    // Try each model in order until one succeeds
    let lastError: Error | undefined;
    for (let i = 0; i < modelOptions.length; i++) {
      const currentModel = modelOptions[i];
      const isFirstModel = i === 0;
      const hasMoreModels = i < modelOptions.length - 1;
      
      try {
        this.logger.info(`[${executionId}] Sending AI request${isFirstModel ? '' : ` (fallback ${i})`}`, {
          executionId,
          options: currentModel,
          modelIndex: i,
          totalModels: modelOptions.length,
          operation: isFirstModel ? 'improve_content_ai_request' : 'improve_content_fallback_request'
        });
        
        const response = await (this.ai as any).promptWithOptions(prompt, currentModel);
        
        this.logger.info(`[${executionId}] Received AI response${isFirstModel ? '' : ` (fallback succeeded)`}`, {
          executionId,
          responseLength: response.content.length,
          fullResponse: response.content,
          modelIndex: i,
          operation: isFirstModel ? 'improve_content_ai_response' : 'improve_content_fallback_success'
        });
        
        if (!isFirstModel) {
          console.warn(`✅ Fallback successful! Used ${currentModel.provider}/${currentModel.model}\n`);
        }
        
        // Success! Process and return the response
        return this.processAIResponse(response, executionId, content);
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if this is a runtime error that should trigger fallback
        const errorMessage = lastError.message;
        const isRuntimeError = errorMessage.startsWith('USAGE_CAP:') || errorMessage.startsWith('RUNTIME_ERROR:');
        
        this.logger.error(`[${executionId}] Model ${i + 1}/${modelOptions.length} failed`, {
          executionId,
          modelIndex: i,
          model: currentModel,
          error: errorMessage.substring(0, 200),
          isRuntimeError,
          operation: isFirstModel ? 'improve_content_primary_failed' : 'improve_content_fallback_failed'
        });
        
        if (hasMoreModels && isRuntimeError) {
          // Show user-friendly fallback message
          const errorType = errorMessage.startsWith('USAGE_CAP:') ? 'Usage Limit' : 'Runtime Error';
          const friendlyMessage = errorMessage.startsWith('USAGE_CAP:') ? 
            errorMessage.replace('USAGE_CAP: ', '') : 
            errorMessage.replace('RUNTIME_ERROR: ', '');
          
          if (isFirstModel) {
            console.warn(`\n⚠️  Primary AI model failed: ${errorType}`);
            console.warn(`   ${friendlyMessage}`);
          } else {
            console.warn(`⚠️  Fallback ${i} failed: ${errorType}`);
          }
          console.warn(`   Attempting fallback to ${modelOptions[i + 1].provider}/${modelOptions[i + 1].model}...\n`);
          
          // Continue to next model
          continue;
        } else if (!isRuntimeError || !hasMoreModels) {
          // Either not a runtime error (don't fallback) or no more models to try
          break;
        }
      }
    }
    
    // All models failed
    throw new Error(`All ${modelOptions.length} model(s) failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  private processAIResponse(response: AIResponse, executionId: string, originalContent: string): AIResponse {
    
    // Log the full response content for debugging
    this.logger.debug(`[${executionId}] Full AI response content`, {
      executionId,
      fullResponse: response.content,
      responseLength: response.content.length,
      operation: 'improve_content_full_response'
    });
    
    // The AI should return the complete improved content
    // We expect the entire response to be the improved content based on our prompt
    let improvedContent = response.content.trim();
    
    this.logger.debug(`[${executionId}] Processing AI response`, {
      executionId,
      trimmedLength: improvedContent.length,
      operation: 'improve_content_processing'
    });
    
    // Basic validation
    if (!improvedContent || improvedContent.length === 0) {
      this.logger.error(`[${executionId}] AI returned empty content`, {
        executionId,
        operation: 'improve_content_empty_error'
      });
      throw new Error('AI returned empty improved content');
    }
    
    // Check for goose error responses and classify them
    const hasGooseError = /Interrupted before the model replied/i.test(improvedContent) ||
                          /error: The error above was an exception we were not able to handle/i.test(improvedContent);
    
    if (hasGooseError) {
      // Extract the actual error details from the response
      const errorResponse = improvedContent;
      
      // Classify the error type based on actual goose error patterns
      const isUsageCapError = /usage limits|quota|limit exceeded|rate limit/i.test(errorResponse) ||
                             /You have reached your specified API usage limits/i.test(errorResponse) ||
                             /regain access on \d{4}-\d{2}-\d{2}/i.test(errorResponse) ||
                             /invalid_request_error.*usage/i.test(errorResponse);
      
      const isAuthError = /authentication|unauthorized|invalid.*key|api.*key.*invalid/i.test(errorResponse) &&
                         !isUsageCapError; // Usage cap errors often mention auth but aren't auth issues
      
      const isServerError = /500|502|503|504|timeout|server.*error|internal.*error/i.test(errorResponse) ||
                           /network.*error|connection.*error/i.test(errorResponse) ||
                           /Failed to parse response/i.test(errorResponse);
      
      const isRuntimeError = isUsageCapError || isServerError;
      
      this.logger.error(`[${executionId}] Goose returned error instead of AI response`, {
        executionId,
        errorResponse: errorResponse.substring(0, 1000),
        errorType: isUsageCapError ? 'usage_cap' : isAuthError ? 'authentication' : isServerError ? 'server_error' : 'unknown',
        isRuntimeError,
        operation: 'improve_content_goose_error'
      });
      
      if (isUsageCapError) {
        // Extract usage cap details for better user messaging
        const usageLimitMatch = errorResponse.match(/You have reached your specified API usage limits\. You will regain access on (\d{4}-\d{2}-\d{2})/);
        if (usageLimitMatch) {
          throw new Error(`USAGE_CAP: API usage limit reached. Access will be restored on ${usageLimitMatch[1]}`);
        } else {
          throw new Error(`USAGE_CAP: ${errorResponse.split('\n')[0]}`);
        }
      } else if (isRuntimeError) {
        throw new Error(`RUNTIME_ERROR: ${errorResponse.split('\n')[0]}`);
      } else {
        throw new Error(`AI provider failed: ${errorResponse.split('\n')[0]}`);
      }
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
    
    let preambleRemoved = false;
    for (const pattern of unwantedPreambles) {
      if (pattern.test(improvedContent)) {
        const beforeLength = improvedContent.length;
        // Remove the preamble and everything before the actual content
        improvedContent = improvedContent.replace(pattern, '');
        const afterLength = improvedContent.length;
        
        this.logger.info(`[${executionId}] Removed preamble`, {
          executionId,
          patternMatched: pattern.toString(),
          charsRemoved: beforeLength - afterLength,
          operation: 'improve_content_preamble_removed'
        });
        preambleRemoved = true;
        break;
      }
    }
    
    if (!preambleRemoved) {
      this.logger.debug(`[${executionId}] No preamble detected`, {
        executionId,
        operation: 'improve_content_no_preamble'
      });
    }
    
    // Ensure frontmatter is preserved (if original had it)
    const originalHasFrontmatter = originalContent.trim().startsWith('---');
    const improvedHasFrontmatter = improvedContent.trim().startsWith('---');
    
    if (originalHasFrontmatter && !improvedHasFrontmatter) {
      // Extract original frontmatter
      const frontmatterEndIndex = originalContent.indexOf('---', 3);
      if (frontmatterEndIndex !== -1) {
        const originalFrontmatter = originalContent.substring(0, frontmatterEndIndex + 3);
        // Prepend original frontmatter if AI didn't preserve it
        improvedContent = originalFrontmatter + '\n\n' + improvedContent;
        
        this.logger.info(`[${executionId}] Restored missing frontmatter`, {
          executionId,
          frontmatterLength: originalFrontmatter.length,
          operation: 'improve_content_frontmatter_restored'
        });
      }
    }
    
    // Final validation and detailed logging
    const finalLength = improvedContent.length;
    const originalLength = originalContent.length;
    const lengthRatio = finalLength / originalLength;
    
    this.logger.info(`[${executionId}] Content improvement completed`, {
      executionId,
      originalLength,
      finalLength,
      lengthRatio,
      finalContent: improvedContent,
      operation: 'improve_content_completed'
    });
    
    // Implement tiered length validation
    if (finalLength < originalLength * 0.7) {
      this.logger.error(`[${executionId}] Content too short - likely parsing error or excessive condensation`, {
        executionId,
        originalLength,
        finalLength,
        lengthRatio,
        operation: 'improve_content_validation_error'
      });
      throw new Error(`AI returned suspiciously short content (${finalLength} chars vs original ${originalLength} chars). Content should be 70-120% of original length.`);
    } else if (finalLength < originalLength * 0.85) {
      this.logger.warn(`[${executionId}] Content shorter than expected but acceptable`, {
        executionId,
        originalLength,
        finalLength,
        lengthRatio,
        operation: 'improve_content_validation_warning'
      });
      console.warn(`⚠️  Improved content is shorter than expected (${Math.round(lengthRatio * 100)}% of original). This may indicate over-condensation.`);
    } else if (finalLength > originalLength * 1.2) {
      this.logger.warn(`[${executionId}] Content longer than expected`, {
        executionId,
        originalLength,
        finalLength,
        lengthRatio,
        operation: 'improve_content_validation_info'
      });
      console.log(`ℹ️  Improved content is longer than original (${Math.round(lengthRatio * 100)}% of original). This may indicate good expansion of ideas.`);
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
