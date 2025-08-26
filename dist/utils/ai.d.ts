import { QualityDimensions } from '@/types/content';
import { IAI, IContentScorer } from '@/types/interfaces';
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
}
/**
 * AI scoring system implementation
 */
export declare class AIScorer implements IContentScorer {
    private ai;
    constructor(options?: AIScorerOptions);
    /**
     * Score content across all quality dimensions
     */
    scoreContent(content: string): Promise<AIContentAnalysis>;
    /**
     * Score content for a specific dimension
     */
    private scoreDimension;
    /**
     * Generate improved content based on analysis
     */
    improveContent(content: string, analysis: AIContentAnalysis): Promise<string>;
}
/**
 * Factory function for creating AIScorer instances
 */
export declare function createAIScorer(options?: AIScorerOptions): AIScorer;
