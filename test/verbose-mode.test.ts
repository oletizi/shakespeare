import { Shakespeare } from '@/index';
import { ContentStatus } from '@/types/content';
import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

describe.skip('Verbose Mode Functionality (Legacy - replaced by winston-logging.test.ts)', () => {
  const testDir = '/tmp/shakespeare-verbose-test';
  const dbPath = join(testDir, '.shakespeare', 'content-db.json');
  
  let consoleSpy: jest.SpyInstance;
  let consoleOutput: string[];

  beforeAll(() => {
    // Create test directory structure
    mkdirSync(join(testDir, '.shakespeare'), { recursive: true });
  });

  beforeEach(() => {
    // Clean database before each test
    if (require('fs').existsSync(dbPath)) {
      require('fs').unlinkSync(dbPath);
    }
    
    // Spy on console.log to capture verbose output (Winston uses console.log)
    consoleOutput = [];
    consoleSpy = jest.spyOn(console, 'log').mockImplementation((...args) => {
      consoleOutput.push(args.join(' '));
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  afterAll(() => {
    // Clean up test directory
    require('fs').rmSync(testDir, { recursive: true, force: true });
  });

  describe('Verbose Mode Configuration', () => {
    it('should enable and disable verbose mode correctly', async () => {
      const shakespeare = new Shakespeare(testDir);
      
      // Initially disabled
      expect(shakespeare.isVerbose()).toBe(false);
      expect(shakespeare.config.verbose).toBe(false);
      
      // Enable verbose mode
      shakespeare.setVerbose(true);
      expect(shakespeare.isVerbose()).toBe(true);
      expect(shakespeare.config.verbose).toBe(true);
      
      // Disable verbose mode
      shakespeare.setVerbose(false);
      expect(shakespeare.isVerbose()).toBe(false);
      expect(shakespeare.config.verbose).toBe(false);
    });

    it('should create instance with verbose mode enabled via config', async () => {
      const shakespeare = await Shakespeare.create({
        rootDir: testDir,
        verbose: true,
        model: 'gpt-4o-mini',
        provider: 'openai'
      });
      
      expect(shakespeare.isVerbose()).toBe(true);
      expect(shakespeare.config.verbose).toBe(true);
      expect(shakespeare.config.model).toBe('gpt-4o-mini');
      expect(shakespeare.config.provider).toBe('openai');
    });
  });

  describe('Verbose Logging Levels', () => {
    it('should show always-level messages even when verbose is disabled', async () => {
      const shakespeare = new Shakespeare(testDir);
      shakespeare.setVerbose(false);
      await shakespeare.initialize();
      
      // Add test content to trigger database status messages
      await shakespeare.db.updateEntry('/test.md', () => ({
        path: '/test.md',
        currentScores: { readability: 5, seoScore: 5, technicalAccuracy: 5, engagement: 5, contentDepth: 5 },
        targetScores: { readability: 8, seoScore: 8, technicalAccuracy: 8, engagement: 8, contentDepth: 8 },
        lastReviewDate: new Date().toISOString(),
        improvementIterations: 0,
        status: 'needs_review' as ContentStatus,
        reviewHistory: []
      }));

      consoleOutput.length = 0; // Clear previous output
      await shakespeare.reviewAll();
      
      // Should show always-level messages
      const hasStartMessage = consoleOutput.some(msg => msg.includes('📊 Starting content review'));
      const hasDatabaseStatus = consoleOutput.some(msg => msg.includes('📋 Database Status'));
      const hasFoundFiles = consoleOutput.some(msg => msg.includes('📝 Found'));
      
      expect(hasStartMessage).toBe(true);
      expect(hasDatabaseStatus).toBe(true);
      expect(hasFoundFiles).toBe(true);
      
      // Should NOT show verbose-only configuration details
      const hasConfigDetails = consoleOutput.some(msg => msg.includes('🔧 Configuration Details'));
      expect(hasConfigDetails).toBe(false);
    });

    it('should show verbose-level messages when verbose is enabled', async () => {
      const shakespeare = new Shakespeare(testDir);
      shakespeare.setVerbose(true);
      await shakespeare.initialize();
      
      // Add test content
      await shakespeare.db.updateEntry('/test-verbose.md', () => ({
        path: '/test-verbose.md',
        currentScores: { readability: 6, seoScore: 6, technicalAccuracy: 6, engagement: 6, contentDepth: 6 },
        targetScores: { readability: 8, seoScore: 8, technicalAccuracy: 8, engagement: 8, contentDepth: 8 },
        lastReviewDate: new Date().toISOString(),
        improvementIterations: 0,
        status: 'needs_review' as ContentStatus,
        reviewHistory: []
      }));

      consoleOutput.length = 0;
      await shakespeare.reviewAll();
      
      // Should show verbose configuration details
      const hasConfigDetails = consoleOutput.some(msg => msg.includes('🔧 Configuration Details'));
      const hasRootDir = consoleOutput.some(msg => msg.includes('Root Directory:'));
      const hasModel = consoleOutput.some(msg => msg.includes('Model:'));
      
      expect(hasConfigDetails).toBe(true);
      expect(hasRootDir).toBe(true);
      expect(hasModel).toBe(true);
    });

    it('should include timestamps in verbose mode', async () => {
      const shakespeare = new Shakespeare(testDir);
      shakespeare.setVerbose(true);
      await shakespeare.initialize();
      
      // Add test content
      await shakespeare.db.updateEntry('/test-timestamp.md', () => ({
        path: '/test-timestamp.md',
        currentScores: { readability: 7, seoScore: 7, technicalAccuracy: 7, engagement: 7, contentDepth: 7 },
        targetScores: { readability: 8, seoScore: 8, technicalAccuracy: 8, engagement: 8, contentDepth: 8 },
        lastReviewDate: new Date().toISOString(),
        improvementIterations: 0,
        status: 'needs_review' as ContentStatus,
        reviewHistory: []
      }));

      consoleOutput.length = 0;
      await shakespeare.reviewAll();
      
      // Should have timestamped messages in format [HH:mm:ss.SSS] (Winston format)
      const timestampedMessages = consoleOutput.filter(msg => /\[\d{2}:\d{2}:\d{2}\.\d{3}\]/.test(msg));
      expect(timestampedMessages.length).toBeGreaterThan(0);
      
      // Verify timestamp format
      const timestampMatch = timestampedMessages[0].match(/\[(\d{2}:\d{2}:\d{2}\.\d{3})\]/);
      expect(timestampMatch).toBeTruthy();
    });
  });

  describe('Verbose Content Review Output', () => {
    it('should show detailed file information in verbose mode', async () => {
      const shakespeare = new Shakespeare(testDir);
      shakespeare.setVerbose(true);
      await shakespeare.initialize();
      
      // Add test content
      await shakespeare.db.updateEntry('/detailed-test.md', () => ({
        path: '/detailed-test.md',
        currentScores: { readability: 8, seoScore: 7, technicalAccuracy: 9, engagement: 6, contentDepth: 8 },
        targetScores: { readability: 8, seoScore: 8, technicalAccuracy: 8, engagement: 8, contentDepth: 8 },
        lastReviewDate: new Date().toISOString(),
        improvementIterations: 0,
        status: 'needs_review' as ContentStatus,
        reviewHistory: []
      }));

      // Mock reviewContent to simulate successful scoring
      shakespeare.reviewContent = jest.fn().mockResolvedValue(undefined);

      consoleOutput.length = 0;
      await shakespeare.reviewAll();
      
      // Should show files to review list
      const hasFilesToReview = consoleOutput.some(msg => msg.includes('📂 Files to review:'));
      expect(hasFilesToReview).toBe(true);
      
      // Should show quality scores after review
      const hasQualityScores = consoleOutput.some(msg => msg.includes('📊 Quality Scores:'));
      expect(hasQualityScores).toBe(true);
      
      // Should show individual score dimensions
      const hasReadability = consoleOutput.some(msg => msg.includes('Readability:') && msg.includes('/10'));
      const hasSEO = consoleOutput.some(msg => msg.includes('SEO Score:') && msg.includes('/10'));
      const hasTechnical = consoleOutput.some(msg => msg.includes('Technical Accuracy:') && msg.includes('/10'));
      
      expect(hasReadability).toBe(true);
      expect(hasSEO).toBe(true);
      expect(hasTechnical).toBe(true);
      
      // Should show average score
      const hasAverage = consoleOutput.some(msg => msg.includes('🎯 Average Score:') && msg.includes('/10'));
      expect(hasAverage).toBe(true);
    });

    it('should show summary statistics in verbose mode', async () => {
      const shakespeare = new Shakespeare(testDir);
      shakespeare.setVerbose(true);
      await shakespeare.initialize();
      
      // Add multiple test files
      const testFiles = ['/stats1.md', '/stats2.md'];
      for (const filePath of testFiles) {
        await shakespeare.db.updateEntry(filePath, () => ({
          path: filePath,
          currentScores: { readability: 5, seoScore: 6, technicalAccuracy: 7, engagement: 5, contentDepth: 6 },
          targetScores: { readability: 8, seoScore: 8, technicalAccuracy: 8, engagement: 8, contentDepth: 8 },
          lastReviewDate: new Date().toISOString(),
          improvementIterations: 0,
          status: 'needs_review' as ContentStatus,
          reviewHistory: []
        }));
      }

      // Mock reviewContent to simulate successful scoring
      shakespeare.reviewContent = jest.fn().mockResolvedValue(undefined);

      consoleOutput.length = 0;
      await shakespeare.reviewAll();
      
      // Should show summary statistics
      const hasSummaryStats = consoleOutput.some(msg => msg.includes('📊 Summary Statistics:'));
      expect(hasSummaryStats).toBe(true);
      
      // Should show timing information
      const hasTotalTime = consoleOutput.some(msg => msg.includes('⏱️ Total time:') && msg.includes('ms'));
      expect(hasTotalTime).toBe(true);
      
      // Should show file processing metrics
      const hasAvgTime = consoleOutput.some(msg => msg.includes('⚡ Average time per file:'));
      expect(hasAvgTime).toBe(true);
      
      // Should show success rate
      const hasSuccessRate = consoleOutput.some(msg => msg.includes('✅ Success rate:') && msg.includes('%'));
      expect(hasSuccessRate).toBe(true);
    });

    it('should show progress indicators during processing', async () => {
      const shakespeare = new Shakespeare(testDir);
      shakespeare.setVerbose(true);
      await shakespeare.initialize();
      
      // Add test content
      await shakespeare.db.updateEntry('/progress-test.md', () => ({
        path: '/progress-test.md',
        currentScores: { readability: 5, seoScore: 5, technicalAccuracy: 5, engagement: 5, contentDepth: 5 },
        targetScores: { readability: 8, seoScore: 8, technicalAccuracy: 8, engagement: 8, contentDepth: 8 },
        lastReviewDate: new Date().toISOString(),
        improvementIterations: 0,
        status: 'needs_review' as ContentStatus,
        reviewHistory: []
      }));

      // Mock reviewContent to simulate successful scoring
      shakespeare.reviewContent = jest.fn().mockResolvedValue(undefined);

      consoleOutput.length = 0;
      await shakespeare.reviewAll();
      
      // Should show progress percentage
      const hasProgress = consoleOutput.some(msg => msg.includes('📈 Progress:') && msg.includes('%'));
      expect(hasProgress).toBe(true);
      
      // Should show file processing indicator
      const hasProcessing = consoleOutput.some(msg => msg.includes('📊 Reviewing') && msg.includes('(1/1)'));
      expect(hasProcessing).toBe(true);
    });
  });

  describe('Error Handling with Verbose Mode', () => {
    it('should show detailed error information in verbose mode', async () => {
      const shakespeare = new Shakespeare(testDir);
      shakespeare.setVerbose(true);
      
      // Mock reviewContent to throw an error
      const originalReviewContent = shakespeare.reviewContent;
      shakespeare.reviewContent = jest.fn().mockRejectedValue(new Error('Test error for verbose logging'));
      
      await shakespeare.initialize();
      
      // Add test content that will fail
      await shakespeare.db.updateEntry('/error-test.md', () => ({
        path: '/error-test.md',
        currentScores: { readability: 5, seoScore: 5, technicalAccuracy: 5, engagement: 5, contentDepth: 5 },
        targetScores: { readability: 8, seoScore: 8, technicalAccuracy: 8, engagement: 8, contentDepth: 8 },
        lastReviewDate: new Date().toISOString(),
        improvementIterations: 0,
        status: 'needs_review' as ContentStatus,
        reviewHistory: []
      }));

      consoleOutput.length = 0;
      const result = await shakespeare.reviewAll();
      
      // Should show error message
      const hasError = consoleOutput.some(msg => msg.includes('❌ Failed to review'));
      expect(hasError).toBe(true);
      
      // Should show detailed error information in verbose mode
      const hasErrorDetails = consoleOutput.some(msg => msg.includes('🔍 Error details:'));
      expect(hasErrorDetails).toBe(true);
      
      // Should have failed entry in result
      expect(result.failed.length).toBe(1);
      expect(result.failed[0].error).toContain('Test error for verbose logging');
      
      // Restore original method
      shakespeare.reviewContent = originalReviewContent;
    });
  });

  describe('No Content Scenarios', () => {
    it('should handle empty database gracefully in verbose mode', async () => {
      const shakespeare = new Shakespeare(testDir);
      shakespeare.setVerbose(true);
      await shakespeare.initialize();
      
      consoleOutput.length = 0;
      const result = await shakespeare.reviewAll();
      
      // Should show no content needs review
      const hasNoContent = consoleOutput.some(msg => msg.includes('✅ No content needs review'));
      expect(hasNoContent).toBe(true);
      
      // Should still show database status
      const hasDatabaseStatus = consoleOutput.some(msg => msg.includes('📋 Database Status:'));
      expect(hasDatabaseStatus).toBe(true);
      
      // Result should be empty
      expect(result.successful.length).toBe(0);
      expect(result.failed.length).toBe(0);
      expect(result.summary.total).toBe(0);
    });
  });
});