/**
 * Quality dimensions for content scoring
 */
export interface QualityDimensions {
    readability: number;
    seoScore: number;
    technicalAccuracy: number;
    engagement: number;
    contentDepth: number;
}
/**
 * Content integrity violation types
 * These are critical issues that MUST be fixed before content is acceptable
 */
export declare enum ContentIntegrityViolationType {
    TRUNCATION_MESSAGE = "truncation_message",
    AI_COMMENTARY = "ai_commentary",
    META_DISCUSSION = "meta_discussion",
    UNCLOSED_CODE_BLOCK = "unclosed_code_block",
    INCOMPLETE_SECTION = "incomplete_section",
    TODO_PLACEHOLDER = "todo_placeholder",
    EXAMPLE_PLACEHOLDER = "example_placeholder",
    INSERT_PLACEHOLDER = "insert_placeholder",
    BROKEN_MARKDOWN = "broken_markdown",
    MALFORMED_FRONTMATTER = "malformed_frontmatter"
}
/**
 * Content integrity violation details
 */
export interface ContentIntegrityViolation {
    type: ContentIntegrityViolationType;
    message: string;
    lineNumber?: number;
    snippet?: string;
}
/**
 * Content integrity validation result
 */
export interface ContentIntegrityResult {
    isValid: boolean;
    violations: ContentIntegrityViolation[];
}
/**
 * Target scores for quality dimensions
 */
export interface TargetScores extends QualityDimensions {
}
/**
 * Status of content review
 */
export type ContentStatus = 'needs_review' | 'in_progress' | 'meets_targets' | 'needs_improvement';
/**
 * Cost information for a specific operation
 */
export interface OperationCostInfo {
    /** Operation type (review, improve, generate) */
    operation: 'review' | 'improve' | 'generate';
    /** Cost for this specific operation */
    cost: number;
    /** Provider used */
    provider: string;
    /** Model used */
    model: string;
    /** Input tokens consumed */
    inputTokens: number;
    /** Output tokens consumed */
    outputTokens: number;
    /** Timestamp of operation */
    timestamp: string;
}
/**
 * Cumulative cost tracking for different phases
 */
export interface CostAccounting {
    /** Total cost for review operations */
    reviewCosts: number;
    /** Total cost for improvement operations */
    improvementCosts: number;
    /** Total cost for generation operations */
    generationCosts: number;
    /** Total accumulated cost for this content */
    totalCost: number;
    /** Detailed history of all operations and their costs */
    operationHistory: OperationCostInfo[];
    /** Last updated timestamp */
    lastUpdated: string;
}
/**
 * Quality improvement metrics for ROI analysis
 */
export interface QualityImprovementMetrics {
    /** Overall quality score before improvement */
    scoreBefore: number;
    /** Overall quality score after improvement */
    scoreAfter: number;
    /** Quality improvement delta */
    qualityDelta: number;
    /** Cost per quality point improvement */
    costPerQualityPoint: number;
    /** Improvement iteration number */
    iterationNumber: number;
}
/**
 * Content review history entry
 */
export interface ReviewHistoryEntry {
    date: string;
    scores: QualityDimensions;
    improvements: string[];
    /** Cost information for this review */
    costInfo?: OperationCostInfo;
    /** Quality improvement metrics if this was an improvement operation */
    improvementMetrics?: QualityImprovementMetrics;
}
/**
 * Content tracking entry
 */
export interface ContentEntry {
    path: string;
    currentScores: QualityDimensions;
    targetScores: TargetScores;
    lastReviewDate: string;
    improvementIterations: number;
    status: ContentStatus;
    reviewHistory: ReviewHistoryEntry[];
    /** Cost accounting for all operations on this content */
    costAccounting: CostAccounting;
}
/**
 * Content database structure
 */
export interface ContentDatabase {
    lastUpdated: string;
    entries: Record<string, ContentEntry>;
    /** Optional workflow configuration stored in database */
    config?: import('./interfaces').ShakespeareConfig;
}
