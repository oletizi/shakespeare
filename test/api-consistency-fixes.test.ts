import { Shakespeare } from '@/index';
import { ContentStatus } from '@/types/content';
import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

describe('API Consistency Fixes - v1.3.0 Bug Reports', () => {
  const testDir = '/tmp/shakespeare-api-fixes-test';
  const dbPath = join(testDir, '.shakespeare', 'content-db.json');

  beforeAll(() => {
    // Create test directory structure
    mkdirSync(join(testDir, '.shakespeare'), { recursive: true });
  });

  beforeEach(() => {
    // Clean database before each test
    if (require('fs').existsSync(dbPath)) {
      require('fs').unlinkSync(dbPath);
    }
  });

  afterAll(() => {
    // Clean up test directory
    require('fs').rmSync(testDir, { recursive: true, force: true });
  });

  describe('Bug Fix 1: getContentNeedingReview() API Inconsistency', () => {
    it('should provide backward compatibility with file paths', async () => {
      const shakespeare = new Shakespeare(testDir);
      await shakespeare.initialize();

      // Add some test content
      await shakespeare.db.updateEntry('/test1.md', () => ({
        path: '/test1.md',
        currentScores: { readability: 5, seoScore: 5, technicalAccuracy: 5, engagement: 5, contentDepth: 5 },
        targetScores: { readability: 8, seoScore: 8, technicalAccuracy: 8, engagement: 8, contentDepth: 8 },
        lastReviewDate: new Date().toISOString(),
        improvementIterations: 0,
        status: 'needs_review' as ContentStatus,
        reviewHistory: []
      }));

      const needingReview = shakespeare.getContentNeedingReview();
      
      expect(Array.isArray(needingReview)).toBe(true);
      expect(needingReview.length).toBe(1);
      expect(typeof needingReview[0]).toBe('string');
      expect(needingReview[0]).toBe('/test1.md');
    });

    it('should provide new API with full content objects', async () => {
      const shakespeare = new Shakespeare(testDir);
      await shakespeare.initialize();

      // Add some test content
      const testEntry = {
        path: '/test2.md',
        currentScores: { readability: 6, seoScore: 6, technicalAccuracy: 6, engagement: 6, contentDepth: 6 },
        targetScores: { readability: 8, seoScore: 8, technicalAccuracy: 8, engagement: 8, contentDepth: 8 },
        lastReviewDate: new Date().toISOString(),
        improvementIterations: 0,
        status: 'needs_review' as ContentStatus,
        reviewHistory: []
      };

      await shakespeare.db.updateEntry('/test2.md', () => testEntry);

      const needingReviewDetails = shakespeare.getContentNeedingReviewDetails();
      
      expect(Array.isArray(needingReviewDetails)).toBe(true);
      expect(needingReviewDetails.length).toBe(1);
      expect(needingReviewDetails[0]).toHaveProperty('path');
      expect(needingReviewDetails[0]).toHaveProperty('currentScores');
      expect(needingReviewDetails[0]).toHaveProperty('status');
      expect(needingReviewDetails[0].path).toBe('/test2.md');
      expect(needingReviewDetails[0].status).toBe('needs_review');
    });

    it('should provide getContentByStatus for flexible filtering', async () => {
      const shakespeare = new Shakespeare(testDir);
      await shakespeare.initialize();

      // Add content with different statuses
      await shakespeare.db.updateEntry('/needs-review.md', () => ({
        path: '/needs-review.md',
        currentScores: { readability: 5, seoScore: 5, technicalAccuracy: 5, engagement: 5, contentDepth: 5 },
        targetScores: { readability: 8, seoScore: 8, technicalAccuracy: 8, engagement: 8, contentDepth: 8 },
        lastReviewDate: new Date().toISOString(),
        improvementIterations: 0,
        status: 'needs_review' as ContentStatus,
        reviewHistory: []
      }));

      await shakespeare.db.updateEntry('/needs-improvement.md', () => ({
        path: '/needs-improvement.md',
        currentScores: { readability: 7, seoScore: 7, technicalAccuracy: 7, engagement: 7, contentDepth: 7 },
        targetScores: { readability: 8, seoScore: 8, technicalAccuracy: 8, engagement: 8, contentDepth: 8 },
        lastReviewDate: new Date().toISOString(),
        improvementIterations: 0,
        status: 'needs_improvement' as ContentStatus,
        reviewHistory: []
      }));

      const needsReview = shakespeare.getContentByStatus('needs_review');
      const needsImprovement = shakespeare.getContentByStatus('needs_improvement');
      const meetsTargets = shakespeare.getContentByStatus('meets_targets');
      
      expect(needsReview.length).toBe(1);
      expect(needsImprovement.length).toBe(1);
      expect(meetsTargets.length).toBe(0);
      expect(needsReview[0].status).toBe('needs_review');
      expect(needsImprovement[0].status).toBe('needs_improvement');
    });
  });

  describe('Bug Fix 2: Configuration Object Not Accessible', () => {
    it('should expose configuration object on Shakespeare instance', async () => {
      const config = {
        verbose: true,
        contentCollection: 'astro' as const,
        model: 'gpt-4o-mini',
        provider: 'openai'
      };

      const shakespeare = await Shakespeare.create(testDir, config);
      
      expect(shakespeare.config).toBeDefined();
      expect(shakespeare.config.verbose).toBe(true);
      expect(shakespeare.config.contentCollection).toBe('astro');
      expect(shakespeare.config.model).toBe('gpt-4o-mini');
      expect(shakespeare.config.provider).toBe('openai');
    });

    it('should expose model options on Shakespeare instance', async () => {
      const modelOptions = {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet'
      };

      const shakespeare = await Shakespeare.create(testDir, {
        modelOptions
      });
      
      expect(shakespeare.modelOptions).toBeDefined();
      expect(shakespeare.modelOptions).toEqual(modelOptions);
      expect(shakespeare.getModelOptions()).toEqual(modelOptions);
    });

    it('should load and expose configuration from database', async () => {
      // Create database with workflow configuration
      const workflowConfig = {
        contentCollection: 'nextjs',
        verbose: true,
        models: {
          review: 'gemini-1.5-flash'
        },
        providers: {
          review: 'google'
        }
      };

      const dbData = {
        lastUpdated: new Date().toISOString(),
        entries: {},
        config: workflowConfig
      };

      writeFileSync(dbPath, JSON.stringify(dbData, null, 2));

      // Change to test directory
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const shakespeare = await Shakespeare.fromConfig();
        
        expect(shakespeare.config).toBeDefined();
        expect(shakespeare.config.contentCollection).toBe('nextjs');
        expect(shakespeare.config.verbose).toBe(true);
        expect(shakespeare.config.model).toBe('gemini-1.5-flash');
        expect(shakespeare.config.provider).toBe('google');
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('Bug Fix 3: Verbose and Model Settings Not Reflected', () => {
    it('should properly reflect verbose settings in instance', async () => {
      const shakespeare = await Shakespeare.create(testDir, {
        verbose: true
      });
      
      expect(shakespeare.isVerbose()).toBe(true);
      expect(shakespeare.config.verbose).toBe(true);
    });

    it('should allow changing verbose setting and reflect in config', async () => {
      const shakespeare = await Shakespeare.create(testDir, {
        verbose: false
      });
      
      expect(shakespeare.isVerbose()).toBe(false);
      expect(shakespeare.config.verbose).toBe(false);
      
      shakespeare.setVerbose(true);
      
      expect(shakespeare.isVerbose()).toBe(true);
      expect(shakespeare.config.verbose).toBe(true);
    });

    it('should reflect model settings from configuration files', async () => {
      // Create external config file
      const externalConfigPath = join(testDir, 'shakespeare.config.json');
      const externalConfig = {
        model: 'claude-3-5-haiku',
        provider: 'anthropic',
        verbose: true,
        contentCollection: 'gatsby'
      };
      
      writeFileSync(externalConfigPath, JSON.stringify(externalConfig, null, 2));

      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const shakespeare = await Shakespeare.fromConfig();
        
        expect(shakespeare.config.model).toBe('claude-3-5-haiku');
        expect(shakespeare.config.provider).toBe('anthropic');
        expect(shakespeare.config.verbose).toBe(true);
        expect(shakespeare.config.contentCollection).toBe('gatsby');
        expect(shakespeare.isVerbose()).toBe(true);
        expect(shakespeare.getModelOptions()).toEqual({
          provider: 'anthropic',
          model: 'claude-3-5-haiku'
        });
      } finally {
        process.chdir(originalCwd);
        require('fs').unlinkSync(externalConfigPath);
      }
    });

    it('should provide access to current model configuration', async () => {
      const modelOptions = {
        provider: 'groq',
        model: 'llama-3.1-8b'
      };

      const shakespeare = await Shakespeare.create(testDir, {
        modelOptions,
        verbose: true
      });
      
      expect(shakespeare.getModelOptions()).toEqual(modelOptions);
      expect(shakespeare.modelOptions).toEqual(modelOptions);
      expect(shakespeare.config.modelOptions).toEqual(modelOptions);
    });
  });
});