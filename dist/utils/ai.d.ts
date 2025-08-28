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
export declare const IMPROVEMENT_PROMPT = "\nTASK: Improve the provided content based on the quality analysis while maintaining its full length and comprehensive coverage.\n\nANALYSIS AND CONTENT:\n{analysis}\n\nORIGINAL CONTENT TO IMPROVE:\n{content}\n\nMANDATORY OUTPUT REQUIREMENTS - VIOLATION WILL RESULT IN REJECTION:\n\n1. LENGTH REQUIREMENT: Your output must be 80-120% the length of the original content\n   - Original length: Approximately {contentLength} characters  \n   - Required output: 80-120% of original length\n   - DO NOT TRUNCATE, SUMMARIZE, OR CONDENSE\n   - INCLUDE ALL SECTIONS, EXAMPLES, AND DETAILS\n\n2. COMPLETE CONTENT REQUIREMENT: \n   - Provide the ENTIRE improved content, not partial content\n   - DO NOT use \"[Continue with remaining sections...]\" or similar\n   - Every section, code block, and example must be included in full\n   - If you cannot complete the full content, do not attempt the task\n\n3. NO COMMENTARY: \n   - Start immediately with the frontmatter or first content line\n   - NO preamble like \"I'll analyze...\" or \"Here's the improved...\"  \n   - NO explanatory text before or after the content\n   - ONLY provide the complete improved content\n\n4. STRUCTURE PRESERVATION:\n   - Preserve ALL frontmatter EXACTLY (YAML between --- delimiters)\n   - Maintain all code blocks, examples, and technical details\n   - Keep the same document structure and format\n   - Preserve all MDX/JSX components\n\nIMPROVEMENT GUIDELINES:\nFocus on the lowest-scoring dimensions from the analysis:\n- Enhance readability without removing content depth\n- Improve technical accuracy of code examples and explanations  \n- Increase engagement through better examples and clearer language\n- Optimize for SEO with better headers and keyword usage\n- Expand content depth where analysis suggests gaps\n\nCRITICAL: This is not a content creation task. You are improving existing comprehensive content. Every section, example, and detail from the original must be present in your improved version, enhanced but not removed.\n\nBegin your response immediately with the content (frontmatter first if present):\n";
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
    private chunker;
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
    improveContentWithModels(content: string, analysis: AIContentAnalysis, modelOptions: AIModelOptions[], filePath?: string): Promise<AIResponse>;
    /**
     * Resume an interrupted chunk improvement
     */
    resumeChunkedImprovement(executionId: string): Promise<AIResponse>;
    /**
     * Get default model options for a task
     */
    private getDefaultModelOptions;
    /**
     * Improve large content using chunking approach
     */
    private improveContentWithChunking;
    /**
     * Improve content without chunking (original method renamed)
     */
    private improveSingleContent;
    /**
     * Validate improved content length
     */
    private validateImprovedContentLength;
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
     * Load chunk progress from disk
     */
    private loadChunkProgress;
    /**
     * Save chunk progress to disk
     */
    private saveChunkProgress;
    /**
     * Get progress directory path
     */
    private getProgressDir;
    /**
     * Clean up old progress files
     */
    private cleanupOldProgress;
    /**
     * Score a specific dimension with cost tracking
     */
    private scoreDimensionWithCost;
}
/**
 * Factory function for creating AIScorer instances
 */
export declare function createAIScorer(options?: AIScorerOptions): AIScorer;
