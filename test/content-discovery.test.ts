import { describe, expect, test, beforeEach, afterEach } from '@jest/globals';
import { Shakespeare } from '@/index';
import { MockAI, MockContentScanner, MockDatabase, MockContentScorer } from './utils/mocks';
import { ContentEntry } from '@/types/content';
import path from 'path';

describe('Content Discovery', () => {
  let shakespeare: Shakespeare;
  let mockScanner: MockContentScanner;
  let mockDatabase: MockDatabase;
  let mockScorer: MockContentScorer;

  const contentDir = '/test/content';
  const dbPath = '/test/.shakespeare/content-db.json';

  beforeEach(() => {
    // Set up mocks
    mockScanner = new MockContentScanner([
      path.join(contentDir, 'article1.md'),
      path.join(contentDir, 'article2.md'),
      path.join(contentDir, 'nested/article3.md')
    ]);
    
    mockScanner.setFileContent(path.join(contentDir, 'article1.md'), '# Article 1\nContent here');
    mockScanner.setFileContent(path.join(contentDir, 'article2.md'), '# Article 2\nMore content');
    mockScanner.setFileContent(path.join(contentDir, 'nested/article3.md'), '# Nested Article\nNested content');

    mockDatabase = new MockDatabase();
    mockScorer = new MockContentScorer();

    shakespeare = new Shakespeare(contentDir, dbPath, {
      scanner: mockScanner,
      database: mockDatabase,
      ai: mockScorer
    });
  });

  afterEach(() => {
    mockDatabase.clear();
  });

  test('should discover content without scoring', async () => {
    await shakespeare.initialize();
    
    const newFiles = await shakespeare.discoverContent();
    
    expect(newFiles).toHaveLength(3);
    expect(newFiles).toContain(path.join(contentDir, 'article1.md'));
    expect(newFiles).toContain(path.join(contentDir, 'article2.md'));
    expect(newFiles).toContain(path.join(contentDir, 'nested/article3.md'));
    
    const dbData = mockDatabase.getData();
    expect(Object.keys(dbData.entries)).toHaveLength(3);
    
    // All entries should have zero scores and 'needs_review' status
    Object.values(dbData.entries).forEach(entry => {
      const contentEntry = entry as ContentEntry;
      expect(contentEntry.status).toBe('needs_review');
      expect(contentEntry.currentScores.readability).toBe(0);
      expect(contentEntry.currentScores.seoScore).toBe(0);
      expect(contentEntry.currentScores.technicalAccuracy).toBe(0);
      expect(contentEntry.currentScores.engagement).toBe(0);
      expect(contentEntry.currentScores.contentDepth).toBe(0);
      expect(contentEntry.reviewHistory).toHaveLength(0);
    });
  });

  test('should not duplicate entries on subsequent discoveries', async () => {
    await shakespeare.initialize();
    
    const firstRun = await shakespeare.discoverContent();
    expect(firstRun).toHaveLength(3);
    
    const secondRun = await shakespeare.discoverContent();
    expect(secondRun).toHaveLength(0); // No new files
    
    const dbData = mockDatabase.getData();
    expect(Object.keys(dbData.entries)).toHaveLength(3); // Still just 3 entries
  });

  test('should identify content needing review', async () => {
    await shakespeare.initialize();
    await shakespeare.discoverContent();
    
    const needingReview = shakespeare.getContentNeedingReview();
    
    expect(needingReview).toHaveLength(3);
    expect(needingReview).toContain(path.join(contentDir, 'article1.md'));
  });

  test('should review individual content files', async () => {
    await shakespeare.initialize();
    await shakespeare.discoverContent();
    
    // Set up mock scorer with predefined scores
    const highScoreConfig = {
      scores: {
        readability: 8.0,
        seoScore: 8.5,
        technicalAccuracy: 9.0,
        engagement: 8.5,
        contentDepth: 8.0
      },
      analysis: {
        readability: { reasoning: 'Good content', suggestions: [] },
        seoScore: { reasoning: 'Decent SEO', suggestions: [] },
        technicalAccuracy: { reasoning: 'Technically sound', suggestions: [] },
        engagement: { reasoning: 'Engaging', suggestions: [] },
        contentDepth: { reasoning: 'Good depth', suggestions: [] }
      }
    };
    
    // Create new Shakespeare instance with configured scorer
    const scorerForReview = new MockContentScorer(highScoreConfig);
    const shakespeareForReview = new Shakespeare(contentDir, dbPath, {
      scanner: mockScanner,
      database: mockDatabase,
      ai: scorerForReview
    });
    await shakespeareForReview.initialize();
    
    const targetPath = path.join(contentDir, 'article1.md');
    await shakespeareForReview.reviewContent(targetPath);
    
    const dbData = mockDatabase.getData();
    const entry = dbData.entries[targetPath] as ContentEntry;
    
    expect(entry.status).toBe('needs_improvement'); // Average 8.4 < 8.5
    expect(entry.currentScores.readability).toBe(8.0);
    expect(entry.reviewHistory).toHaveLength(1);
    
    // Other content should still need review
    const stillNeedingReview = shakespeareForReview.getContentNeedingReview();
    expect(stillNeedingReview).toHaveLength(2);
    expect(stillNeedingReview).not.toContain(targetPath);
  });

  test('should exclude unreviewed content from worst scoring', async () => {
    // Clear database to start fresh
    mockDatabase.clear();
    
    await shakespeare.initialize();
    await shakespeare.discoverContent();
    
    // Before any reviews, should return null (no reviewed content to compare)
    const worstBeforeReview = shakespeare.getWorstScoringContent();
    expect(worstBeforeReview).toBeNull();
    
    // Set up mock scorer with low scores (but > 7.0 average to get 'needs_improvement' not 'needs_review')
    const lowScoreConfig = {
      scores: {
        readability: 7.2,
        seoScore: 7.0,
        technicalAccuracy: 7.5,
        engagement: 7.0,
        contentDepth: 7.3
      },
      analysis: {
        readability: { reasoning: 'Poor readability', suggestions: [] },
        seoScore: { reasoning: 'Poor SEO', suggestions: [] },
        technicalAccuracy: { reasoning: 'OK technically', suggestions: [] },
        engagement: { reasoning: 'Not engaging', suggestions: [] },
        contentDepth: { reasoning: 'Shallow', suggestions: [] }
      }
    };
    
    const lowScorer = new MockContentScorer(lowScoreConfig);
    const shakespeareForLowScore = new Shakespeare(contentDir, dbPath, {
      scanner: mockScanner,
      database: mockDatabase,
      ai: lowScorer
    });
    await shakespeareForLowScore.initialize();
    
    const reviewedPath = path.join(contentDir, 'article1.md');
    await shakespeareForLowScore.reviewContent(reviewedPath);
    
    // Now should return the reviewed file as worst
    const worstAfterReview = shakespeareForLowScore.getWorstScoringContent();
    expect(worstAfterReview).toBe(reviewedPath);
    
    // Unreviewed content should not be considered
    const needingReview = shakespeareForLowScore.getContentNeedingReview();
    expect(needingReview).toHaveLength(2);
  });

  test('should throw error when reviewing non-existent content', async () => {
    await shakespeare.initialize();
    
    await expect(shakespeare.reviewContent('/nonexistent/file.md'))
      .rejects.toThrow('Content not found');
  });

  test('should throw error when reviewing already reviewed content', async () => {
    await shakespeare.initialize();
    await shakespeare.discoverContent();
    
    const scoreConfig = {
      scores: {
        readability: 8.0,
        seoScore: 7.5,
        technicalAccuracy: 9.0,
        engagement: 8.5,
        contentDepth: 8.0
      },
      analysis: {
        readability: { reasoning: 'Good content', suggestions: [] },
        seoScore: { reasoning: 'Decent SEO', suggestions: [] },
        technicalAccuracy: { reasoning: 'Technically sound', suggestions: [] },
        engagement: { reasoning: 'Engaging', suggestions: [] },
        contentDepth: { reasoning: 'Good depth', suggestions: [] }
      }
    };
    
    const scorer = new MockContentScorer(scoreConfig);
    const shakespeareForDoubleReview = new Shakespeare(contentDir, dbPath, {
      scanner: mockScanner,
      database: mockDatabase,
      ai: scorer
    });
    await shakespeareForDoubleReview.initialize();
    
    const targetPath = path.join(contentDir, 'article1.md');
    await shakespeareForDoubleReview.reviewContent(targetPath);
    
    // Try to review again
    await expect(shakespeareForDoubleReview.reviewContent(targetPath))
      .rejects.toThrow('Content has already been reviewed');
  });
});