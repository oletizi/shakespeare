import { QualityDimensions, ContentEntry, CostAccounting, TargetScores, ContentStatus } from '@/types/content';
import { DEFAULT_TARGET_SCORES } from '@/utils/constants';

/**
 * Factory for creating mock QualityDimensions with sensible defaults
 * When interface changes, update here once instead of in every test
 */
export function createMockQualityDimensions(overrides?: Partial<QualityDimensions>): QualityDimensions {
  return {
    readability: 7.0,
    seoScore: 7.0,
    technicalAccuracy: 7.0,
    engagement: 7.0,
    contentDepth: 7.0,
    ...overrides
  };
}

/**
 * Factory for creating target scores
 */
export function createMockTargetScores(overrides?: Partial<TargetScores>): TargetScores {
  return {
    ...DEFAULT_TARGET_SCORES,
    ...overrides
  };
}

/**
 * Factory for creating mock CostAccounting
 */
export function createMockCostAccounting(overrides?: Partial<CostAccounting>): CostAccounting {
  return {
    reviewCosts: 0,
    improvementCosts: 0,
    generationCosts: 0,
    totalCost: 0,
    operationHistory: [],
    lastUpdated: new Date().toISOString(),
    ...overrides
  };
}

/**
 * Factory for creating mock ContentEntry with all required fields
 */
export function createMockContentEntry(overrides?: Partial<ContentEntry>): ContentEntry {
  const base: ContentEntry = {
    path: 'test.md',
    currentScores: createMockQualityDimensions(),
    targetScores: createMockTargetScores(),
    lastReviewDate: new Date().toISOString(),
    improvementIterations: 0,
    status: 'needs_review' as ContentStatus,
    reviewHistory: [],
    costAccounting: createMockCostAccounting()
  };

  // Handle nested overrides properly
  if (overrides?.currentScores) {
    base.currentScores = { ...base.currentScores, ...overrides.currentScores };
  }
  if (overrides?.targetScores) {
    base.targetScores = { ...base.targetScores, ...overrides.targetScores };
  }
  if (overrides?.costAccounting) {
    base.costAccounting = { ...base.costAccounting, ...overrides.costAccounting };
  }

  return {
    ...base,
    ...overrides,
    // Ensure nested objects aren't completely replaced
    currentScores: overrides?.currentScores ? base.currentScores : base.currentScores,
    targetScores: overrides?.targetScores ? base.targetScores : base.targetScores,
    costAccounting: overrides?.costAccounting ? base.costAccounting : base.costAccounting
  };
}

/**
 * Factory for creating zero scores (unreviewed content)
 */
export function createZeroScores(): QualityDimensions {
  return {
    readability: 0,
    seoScore: 0,
    technicalAccuracy: 0,
    engagement: 0,
    contentDepth: 0
  };
}

/**
 * Factory for creating low scores (needs improvement)
 */
export function createLowScores(): QualityDimensions {
  return createMockQualityDimensions({
    readability: 4.0,
    seoScore: 4.5,
    technicalAccuracy: 5.0,
    engagement: 4.0,
    contentDepth: 4.5
  });
}

/**
 * Factory for creating high scores (meets targets)
 */
export function createHighScores(): QualityDimensions {
  return createMockQualityDimensions({
    readability: 8.5,
    seoScore: 9.0,
    technicalAccuracy: 9.5,
    engagement: 8.5,
    contentDepth: 9.0
  });
}