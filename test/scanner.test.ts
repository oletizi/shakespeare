import { describe, expect, test, beforeEach, beforeAll, afterAll } from '@jest/globals';
import { ContentScanner } from '@/utils/scanner';
import path from 'path';
import fs from 'fs/promises';

describe('ContentScanner', () => {
  const testDir = path.join(__dirname, 'test-content');
  const testSubDir = path.join(testDir, 'subdir');
  let scanner: ContentScanner;

  beforeAll(async () => {
    // Create test directory structure
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(testSubDir, { recursive: true });

    // Create test files
    await fs.writeFile(path.join(testDir, 'file1.md'), '# Test Content 1');
    await fs.writeFile(path.join(testDir, 'file2.md'), '# Test Content 2');
    await fs.writeFile(path.join(testDir, 'not-markdown.txt'), 'This is not markdown');
    await fs.writeFile(path.join(testSubDir, 'nested.md'), '# Nested Content');
    await fs.writeFile(path.join(testSubDir, 'another.md'), '# Another Nested Content');
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  beforeEach(() => {
    scanner = new ContentScanner(testDir);
  });

  test('should scan and find all markdown files recursively', async () => {
    const files = await scanner.scanContent();
    
    // Should find 4 markdown files
    expect(files).toHaveLength(4);
    
    // Should include all markdown files
    const fileNames = files.map(f => path.basename(f));
    expect(fileNames).toContain('file1.md');
    expect(fileNames).toContain('file2.md');
    expect(fileNames).toContain('nested.md');
    expect(fileNames).toContain('another.md');
    
    // Should not include non-markdown files
    expect(fileNames).not.toContain('not-markdown.txt');
  });

  test('should return full paths for found files', async () => {
    const files = await scanner.scanContent();
    
    files.forEach(file => {
      expect(path.isAbsolute(file)).toBe(true);
      expect(file.endsWith('.md')).toBe(true);
    });
  });

  test('should handle empty directory', async () => {
    const emptyDir = path.join(testDir, 'empty');
    await fs.mkdir(emptyDir, { recursive: true });
    
    const emptyScanner = new ContentScanner(emptyDir);
    const files = await emptyScanner.scanContent();
    
    expect(files).toHaveLength(0);
    
    await fs.rmdir(emptyDir);
  });

  test('should handle non-existent directory', async () => {
    const nonExistentScanner = new ContentScanner('/path/that/does/not/exist');
    
    await expect(nonExistentScanner.scanContent()).rejects.toThrow();
  });

  test('should read content of markdown file', async () => {
    const testFilePath = path.join(testDir, 'file1.md');
    const content = await scanner.readContent(testFilePath);
    
    expect(content).toBe('# Test Content 1');
  });

  test('should handle reading non-existent file', async () => {
    const nonExistentPath = path.join(testDir, 'does-not-exist.md');
    
    await expect(scanner.readContent(nonExistentPath)).rejects.toThrow();
  });

  test('should read content of nested files', async () => {
    const nestedFilePath = path.join(testSubDir, 'nested.md');
    const content = await scanner.readContent(nestedFilePath);
    
    expect(content).toBe('# Nested Content');
  });
});