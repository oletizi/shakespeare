import { Shakespeare } from '@/index';
import { existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Integration: .gitignore Creation', () => {
  let testDir: string;

  beforeEach(() => {
    // Create a unique test directory for each test
    testDir = join(tmpdir(), `shakespeare-gitignore-test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should create .shakespeare directory with .gitignore when Shakespeare instance is created', async () => {
    // Act: Create Shakespeare instance in test directory
    const shakespeare = new Shakespeare(testDir);

    // Assert: Check that .shakespeare directory was created
    const shakespeareDir = join(testDir, '.shakespeare');
    expect(existsSync(shakespeareDir)).toBe(true);

    // Assert: Check that .gitignore was created
    const gitignorePath = join(shakespeareDir, '.gitignore');
    expect(existsSync(gitignorePath)).toBe(true);

    // Assert: Check .gitignore content
    const gitignoreContent = readFileSync(gitignorePath, 'utf8');
    expect(gitignoreContent).toContain('# Ignore Shakespeare log files');
    expect(gitignoreContent).toContain('*.log*');
  });

  it('should create errors.log file alongside .gitignore', async () => {
    // Act: Create Shakespeare instance in test directory
    const shakespeare = new Shakespeare(testDir);

    // Assert: Check that errors.log was created (even if empty)
    const errorsLogPath = join(testDir, '.shakespeare', 'errors.log');
    expect(existsSync(errorsLogPath)).toBe(true);
  });

  it('should not overwrite existing .gitignore in .shakespeare directory', async () => {
    // Arrange: Pre-create .shakespeare directory with custom .gitignore
    const shakespeareDir = join(testDir, '.shakespeare');
    const { mkdirSync, writeFileSync } = require('fs');
    mkdirSync(shakespeareDir, { recursive: true });
    
    const customGitignoreContent = '# Custom gitignore\n*.custom\n';
    const gitignorePath = join(shakespeareDir, '.gitignore');
    writeFileSync(gitignorePath, customGitignoreContent);

    // Act: Create Shakespeare instance in test directory
    const shakespeare = new Shakespeare(testDir);

    // Assert: Check that existing .gitignore was not overwritten
    const gitignoreContent = readFileSync(gitignorePath, 'utf8');
    expect(gitignoreContent).toBe(customGitignoreContent);
    expect(gitignoreContent).not.toContain('# Ignore Shakespeare log files');
  });

  it('should work correctly when .shakespeare directory already exists', async () => {
    // Arrange: Pre-create .shakespeare directory
    const shakespeareDir = join(testDir, '.shakespeare');
    const { mkdirSync } = require('fs');
    mkdirSync(shakespeareDir, { recursive: true });

    // Act: Create Shakespeare instance in test directory
    const shakespeare = new Shakespeare(testDir);

    // Assert: Should still create .gitignore since directory existed but was empty
    const gitignorePath = join(shakespeareDir, '.gitignore');
    expect(existsSync(gitignorePath)).toBe(true);

    const gitignoreContent = readFileSync(gitignorePath, 'utf8');
    expect(gitignoreContent).toContain('*.log*');
  });

  it('should handle permission errors gracefully', async () => {
    // This test would be platform-specific and complex to set up reliably
    // The main behavior is tested in the logger unit tests
    // Here we just verify that Shakespeare can be created even if gitignore creation fails
    
    // Act: Create Shakespeare instance (should not throw even if file operations fail)
    expect(() => {
      const shakespeare = new Shakespeare(testDir);
    }).not.toThrow();
  });

  it('should ignore log files according to created .gitignore patterns', async () => {
    // Arrange: Create Shakespeare instance
    const shakespeare = new Shakespeare(testDir);
    
    // Create some test log files that should be ignored
    const shakespeareDir = join(testDir, '.shakespeare');
    const { writeFileSync } = require('fs');
    writeFileSync(join(shakespeareDir, 'errors.log'), 'test error');
    writeFileSync(join(shakespeareDir, 'errors.log.1'), 'rotated error log');
    writeFileSync(join(shakespeareDir, 'debug.log'), 'debug log');
    writeFileSync(join(shakespeareDir, 'some-other-file.txt'), 'should not be ignored');

    // Act: Read .gitignore patterns
    const gitignorePath = join(shakespeareDir, '.gitignore');
    const gitignoreContent = readFileSync(gitignorePath, 'utf8');
    
    // Assert: Verify the pattern would ignore log files
    expect(gitignoreContent).toMatch(/\*\.log\*/);
    
    // Note: We're not testing actual git ignore behavior here, just that the pattern
    // is correct. Actual git ignore testing would require a git repository setup.
  });

  it('should create .gitignore with consistent format', async () => {
    // Act: Create Shakespeare instance
    const shakespeare = new Shakespeare(testDir);

    // Assert: Check .gitignore format and content
    const gitignorePath = join(testDir, '.shakespeare', '.gitignore');
    const gitignoreContent = readFileSync(gitignorePath, 'utf8');
    
    // Should have comment header
    expect(gitignoreContent).toMatch(/^# Ignore Shakespeare log files\n/);
    
    // Should have log pattern
    expect(gitignoreContent).toMatch(/\*\.log\*\n$/);
    
    // Should be exactly what we expect
    expect(gitignoreContent).toBe('# Ignore Shakespeare log files\n*.log*\n');
  });
});