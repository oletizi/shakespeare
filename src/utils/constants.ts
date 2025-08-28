import { QualityDimensions } from '../types/content';

/**
 * Default target scores for content quality
 */
export const DEFAULT_TARGET_SCORES: QualityDimensions = {
  readability: 8.0,
  seoScore: 8.5,
  technicalAccuracy: 9.0,
  engagement: 8.0,
  contentDepth: 8.5,
  contentIntegrity: 9.0  // High target for content integrity - critical for production readiness
};

/**
 * Configuration for content improvement
 */
export const IMPROVEMENT_CONFIG = {
  maxIterations: 3,
  minScoreImprovement: 0.5,
  scoreThreshold: 7.0
};
