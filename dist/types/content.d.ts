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
 * Target scores for quality dimensions
 */
export interface TargetScores extends QualityDimensions {
}
/**
 * Status of content review
 */
export type ContentStatus = 'needs_review' | 'in_progress' | 'meets_targets' | 'needs_improvement';
/**
 * Content review history entry
 */
export interface ReviewHistoryEntry {
    date: string;
    scores: QualityDimensions;
    improvements: string[];
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
