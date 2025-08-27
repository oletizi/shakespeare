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
export declare const IMPROVEMENT_PROMPT = "\nYou are a content improvement specialist. Review the following content and its quality analysis.\nFocus on the dimensions that scored lowest and provide specific improvements.\n\nCurrent scores and analysis:\n{analysis}\n\nOriginal content:\n{content}\n\nPlease provide:\n1. Improved version of the content\n2. Summary of changes made\n3. Expected impact on quality scores\n\nMake sure to maintain any technical accuracy while improving readability and engagement.\nPreserve the original meaning and intent while enhancing the presentation and effectiveness.\n";
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
