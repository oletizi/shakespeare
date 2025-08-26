import { QualityDimensions } from '../types/content';
/**
 * Default target scores for content quality
 */
export declare const DEFAULT_TARGET_SCORES: QualityDimensions;
/**
 * Configuration for content improvement
 */
export declare const IMPROVEMENT_CONFIG: {
    maxIterations: number;
    minScoreImprovement: number;
    scoreThreshold: number;
};
