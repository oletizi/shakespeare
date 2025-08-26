import { ContentScanner } from '@/utils/scanner';
import { CONTENT_COLLECTIONS, ContentCollectionConfig } from '@/types/interfaces';
import { Shakespeare, ShakespeareFactory } from '@/index';
import { MockContentScorer } from './utils/mocks';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Content Collections Configuration', () => {
  const testDir = path.join(process.cwd(), 'test-output', 'content-collections');
  
  beforeAll(async () => {
    // Create test directory structure
    await fs.mkdir(testDir, { recursive: true });
    
    // Create Astro-style content structure
    const astroContentDir = path.join(testDir, 'src/content');
    await fs.mkdir(path.join(astroContentDir, 'blog'), { recursive: true });
    await fs.mkdir(path.join(astroContentDir, 'docs'), { recursive: true });
    
    // Create Next.js-style content structure
    const nextContentDir = path.join(testDir, 'content');
    await fs.mkdir(path.join(nextContentDir, 'posts'), { recursive: true });
    
    // Create test files
    await fs.writeFile(path.join(astroContentDir, 'blog/post1.mdx'), '# Blog Post 1\nContent here');
    await fs.writeFile(path.join(astroContentDir, 'blog/post2.md'), '# Blog Post 2\nContent here');
    await fs.writeFile(path.join(astroContentDir, 'docs/guide.mdx'), '# Guide\nDocumentation content');
    await fs.writeFile(path.join(astroContentDir, 'index.md'), '# Index\nShould be excluded');
    
    await fs.writeFile(path.join(nextContentDir, 'posts/article.mdx'), '# Article\nContent here');
    await fs.writeFile(path.join(nextContentDir, 'README.md'), '# README\nShould be excluded');
  });

  afterAll(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('ContentScanner with Content Collections', () => {
    it('should scan Astro content collections by default', async () => {
      const scanner = new ContentScanner(testDir);
      const files = await scanner.scanContent();
      
      expect(files).toHaveLength(3);
      expect(files.some(f => f.includes('post1.mdx'))).toBe(true);
      expect(files.some(f => f.includes('post2.md'))).toBe(true);
      expect(files.some(f => f.includes('guide.mdx'))).toBe(true);
      expect(files.some(f => f.includes('index.md'))).toBe(false); // Should be excluded
    });

    it('should scan Next.js content collections', async () => {
      const scanner = new ContentScanner(testDir, 'nextjs');
      const files = await scanner.scanContent();
      
      expect(files).toHaveLength(1);
      expect(files.some(f => f.includes('article.mdx'))).toBe(true);
      expect(files.some(f => f.includes('README.md'))).toBe(false); // Should be excluded
    });

    it('should use custom content collection configuration', async () => {
      const customConfig: ContentCollectionConfig = {
        baseDir: 'src/content',
        include: ['**/*.mdx'],
        exclude: ['**/index.*'],
        framework: 'custom'
      };
      
      const scanner = new ContentScanner(testDir, customConfig);
      const files = await scanner.scanContent();
      
      expect(files).toHaveLength(2);
      expect(files.some(f => f.includes('post1.mdx'))).toBe(true);
      expect(files.some(f => f.includes('guide.mdx'))).toBe(true);
      expect(files.some(f => f.includes('post2.md'))).toBe(false); // Only MDX files
      expect(files.some(f => f.includes('index.md'))).toBe(false); // Excluded
    });

    it('should throw error for non-existent content directory', async () => {
      const customConfig: ContentCollectionConfig = {
        baseDir: 'nonexistent',
        include: ['**/*.md'],
        framework: 'custom'
      };
      
      const scanner = new ContentScanner(testDir, customConfig);
      
      await expect(scanner.scanContent()).rejects.toThrow('Content directory not found');
    });
  });

  describe('Shakespeare Factory Functions', () => {
    it('should create Shakespeare instance for Astro', async () => {
      const mockScorer = new MockContentScorer();
      const shakespeare = ShakespeareFactory.forAstro(testDir, undefined, { ai: mockScorer });
      
      // Should be able to scan content
      await shakespeare.updateContentIndex();
      
      const worst = await shakespeare.getWorstScoringContent();
      expect(worst).toBeTruthy(); // Should find content
      expect(worst).toContain('.md'); // Should be a markdown file
    });

    it('should create Shakespeare instance for Next.js', async () => {
      const mockScorer = new MockContentScorer();
      const shakespeare = ShakespeareFactory.forNextJS(testDir, undefined, { ai: mockScorer });
      
      // Should be able to scan content
      await shakespeare.updateContentIndex();
      
      const worst = await shakespeare.getWorstScoringContent();
      expect(worst).toBeTruthy(); // Should find content
    });

    it('should create Shakespeare instance with custom config', async () => {
      const customConfig: ContentCollectionConfig = {
        baseDir: 'src/content/blog',
        include: ['**/*.mdx'],
        framework: 'custom'
      };
      
      const mockScorer = new MockContentScorer();
      const shakespeare = ShakespeareFactory.forCustom(customConfig, testDir, undefined, { ai: mockScorer });
      
      await shakespeare.updateContentIndex();
      
      const worst = await shakespeare.getWorstScoringContent();
      expect(worst).toBeTruthy();
      expect(worst).toContain('post1.mdx'); // Should find only MDX in blog
    });
  });

  describe('Content Collection Constants', () => {
    it('should provide predefined configurations', () => {
      expect(CONTENT_COLLECTIONS.astro.baseDir).toBe('src/content');
      expect(CONTENT_COLLECTIONS.astro.include).toContain('**/*.mdx');
      expect(CONTENT_COLLECTIONS.astro.include).toContain('**/*.md');
      expect(CONTENT_COLLECTIONS.astro.exclude).toContain('**/index.md');
      
      expect(CONTENT_COLLECTIONS.nextjs.baseDir).toBe('content');
      expect(CONTENT_COLLECTIONS.gatsby.baseDir).toBe('content');
    });

    it('should create custom configuration function', () => {
      const custom = CONTENT_COLLECTIONS.custom('my-content', ['**/*.mdx'], ['**/draft.*']);
      
      expect(custom.baseDir).toBe('my-content');
      expect(custom.include).toEqual(['**/*.mdx']);
      expect(custom.exclude).toEqual(['**/draft.*']);
      expect(custom.framework).toBe('custom');
    });
  });
});