import { QualityDimensions } from '@/types/content';
import { IAI, IContentScorer, ScoringStrategy, EnhancedAIContentAnalysis, AIModelOptions, AIResponse } from '@/types/interfaces';
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
        };
    };
}
/**
 * Prompts for content analysis
 */
export declare const ANALYSIS_PROMPTS: {
    readability: string;
    seoScore: string;
    technicalAccuracy: string;
    engagement: string;
    contentDepth: string;
};
/**
 * Prompt for content improvement
 */
export declare const IMPROVEMENT_PROMPT = "\nYou are a content improvement specialist. Review the following content and its quality analysis.\nFocus on the dimensions that scored lowest and provide specific improvements.\n\nCurrent scores and analysis:\n{analysis}\n\nOriginal content:\n{content}\n\nCRITICAL INSTRUCTIONS:\n1. Return ONLY the improved version of the complete content\n2. Do NOT include any preamble, explanation, or commentary\n3. Do NOT start with phrases like \"I'll help improve...\" or \"Here's the improved version...\"\n4. Preserve ALL frontmatter (YAML between --- delimiters) EXACTLY as is\n5. Preserve ALL MDX/JSX components and their syntax\n6. Maintain the same file format (Markdown, MDX, etc.)\n7. Start your response with the frontmatter (if present) or the first line of actual content\n\nFocus improvements on:\n- Dimensions that scored lowest in the analysis\n- Maintaining technical accuracy while improving readability\n- Enhancing engagement without changing the core message\nPreserve the original meaning and intent while enhancing the presentation and effectiveness.\n";
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
export declare class AIScorer implements IContentScorer {
    private ai;
    private logger;
    private defaultModelOptions?;
    constructor(options?: AIScorerOptions);
    /**
     * Score content across all quality dimensions
     */
    /**
     * Score content across all quality dimensions
     * This is the single entry point for content scoring
     */
    scoreContent(content: string, strategies?: ScoringStrategy[]): Promise<EnhancedAIContentAnalysis>;
    /**
     * Score content for a specific dimension
     */
    private scoreDimension;
    /**
     * Generate improved content based on analysis
     * This is the single entry point for content improvement
     */
    improveContent(content: string, analysis: AIContentAnalysis, options?: AIModelOptions): Promise<AIResponse>;
    improveContentWithModels(content: string, analysis: AIContentAnalysis, modelOptions: AIModelOptions[]): Promise<AIResponse>;
    private processAIResponse;
    /**
     * Batch scoring for cost optimization
     */
    scoreContentBatch(contentList: string[], strategies?: ScoringStrategy[]): Promise<EnhancedAIContentAnalysis[]>;
    /**
     * Estimate cost for scoring operation
     */
    estimateScoringCost(content: string, strategies?: ScoringStrategy[]): Promise<number>;
    /**
     * Estimate cost for improvement operation
     */
    estimateImprovementCost(content: string, analysis: AIContentAnalysis, options?: AIModelOptions): Promise<number>;
    /**
     * Score a specific dimension with cost tracking
     */
    private scoreDimensionWithCost;
}
/**
 * Factory function for creating AIScorer instances
 */
export declare function createAIScorer(options?: AIScorerOptions): AIScorer;
