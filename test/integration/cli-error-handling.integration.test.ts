import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import { spawn, SpawnOptionsWithoutStdio } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

describe('CLI Error Handling Integration Tests', () => {
  jest.setTimeout(30000); // 30 second timeout for process spawning

  const projectRoot = path.join(__dirname, '..', '..');
  const testDir = path.join(projectRoot, 'test-output', 'cli-error-handling');
  const cliPath = path.join(projectRoot, 'dist', 'cli.js');
  
  beforeAll(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
    
    // Ensure CLI is built
    const cliExists = await fs.access(cliPath).then(() => true).catch(() => false);
    expect(cliExists).toBe(true);
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await fs.rmdir(testDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  /**
   * Helper function to spawn CLI process and capture output
   */
  function spawnCLI(args: string[], options?: SpawnOptionsWithoutStdio): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> {
    return new Promise((resolve) => {
      const child = spawn(process.execPath, [cliPath, ...args], {
        cwd: testDir,
        stdio: 'pipe',
        ...options
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (exitCode) => {
        resolve({
          stdout,
          stderr,
          exitCode: exitCode || 0
        });
      });

      child.on('error', (error) => {
        resolve({
          stdout,
          stderr: stderr + error.message,
          exitCode: 1
        });
      });
    });
  }

  describe('Error Message Format', () => {
    test('should display concise error message for invalid commands', async () => {
      const result = await spawnCLI(['invalid-command']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('❌ Unknown command: invalid-command');
      expect(result.stdout).toContain('Run "npx shakespeare help" for usage information.');
      expect(result.stdout).toContain('🎭 Shakespeare CLI'); // Header goes to stdout
      
      // Combined output should NOT contain stack trace elements
      const allOutput = result.stdout + result.stderr;
      expect(allOutput).not.toContain(' at ');
      expect(allOutput).not.toContain('Error:');
      expect(allOutput).not.toContain('node_modules');
      expect(allOutput).not.toContain('dist/cli.js:');
      
      // Should be concise (less than 8 lines total)
      const allLines = allOutput.trim().split('\n').filter(line => line.trim());
      expect(allLines.length).toBeLessThanOrEqual(8);
    });

    test('should display concise error message for invalid config templates', async () => {
      const result = await spawnCLI(['config', 'init', 'invalid-template']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('❌ Unknown template: invalid-template');
      expect(result.stdout).toContain('Run "npx shakespeare config templates" to see available templates.');
      expect(result.stdout).toContain('🎭 Shakespeare CLI'); // Header goes to stdout
      
      // Combined output should NOT contain stack trace elements
      const allOutput = result.stdout + result.stderr;
      expect(allOutput).not.toContain(' at ');
      expect(allOutput).not.toContain('Error:');
      expect(allOutput).not.toContain('node_modules');
      expect(allOutput).not.toContain('dist/cli.js:');
      
      // Should be concise
      const allLines = allOutput.trim().split('\n').filter(line => line.trim());
      expect(allLines.length).toBeLessThanOrEqual(8);
    });

    test('should display concise error message for invalid batch subcommands', async () => {
      const result = await spawnCLI(['batch', 'invalid-subcommand']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('❌ Unknown batch subcommand: invalid-subcommand');
      expect(result.stdout).toContain('Run "npx shakespeare batch help" for usage information.');
      expect(result.stdout).toContain('🎭 Shakespeare CLI'); // Header goes to stdout
      
      // Combined output should NOT contain stack trace elements
      const allOutput = result.stdout + result.stderr;
      expect(allOutput).not.toContain(' at ');
      expect(allOutput).not.toContain('Error:');
      expect(allOutput).not.toContain('node_modules');
      expect(allOutput).not.toContain('dist/cli.js:');
    });
  });

  describe('Configuration Error Handling', () => {
    test('should handle invalid configuration gracefully', async () => {
      // Create invalid configuration file
      const configPath = path.join(testDir, 'shakespeare.config.json');
      await fs.writeFile(configPath, '{ invalid json content }');
      
      const result = await spawnCLI(['status']);
      
      // Should fail gracefully without stack trace
      if (result.exitCode !== 0) {
        expect(result.stderr).not.toContain('at ');
        expect(result.stderr).not.toContain('node_modules');
        expect(result.stderr).not.toContain('SyntaxError');
        expect(result.stderr).toMatch(/❌/);
      }
      
      // Clean up
      await fs.unlink(configPath).catch(() => {});
    });
  });

  describe('File System Error Handling', () => {
    test('should handle missing content directory gracefully', async () => {
      // Create a config that points to non-existent directory
      const configPath = path.join(testDir, '.shakespeare', 'config.json');
      await fs.mkdir(path.dirname(configPath), { recursive: true });
      await fs.writeFile(configPath, JSON.stringify({
        contentCollection: {
          baseDir: '/nonexistent/directory',
          patterns: ['**/*.md']
        }
      }));
      
      const result = await spawnCLI(['discover']);
      
      // Should handle gracefully
      if (result.exitCode !== 0) {
        expect(result.stderr).not.toContain('at ');
        expect(result.stderr).not.toContain('node_modules');
        expect(result.stderr).toMatch(/❌/);
      }
      
      // Clean up
      await fs.rmdir(path.dirname(configPath), { recursive: true }).catch(() => {});
    });
  });

  describe('Stack Trace Prevention', () => {
    test('should never leak JavaScript stack traces to console output', async () => {
      // Test multiple error scenarios to ensure no stack traces leak
      const testCases = [
        ['invalid-command'],
        ['config', 'init', 'nonexistent-template'],
        ['batch', 'invalid-operation'],
        ['improve', '/nonexistent/file.md']
      ];
      
      for (const args of testCases) {
        const result = await spawnCLI(args);
        
        // Combined output should never contain stack trace patterns
        const allOutput = result.stdout + result.stderr;
        
        // Check for common stack trace patterns
        expect(allOutput).not.toContain('    at ');
        expect(allOutput).not.toMatch(/^\s+at\s+/m);
        expect(allOutput).not.toContain('node_modules/');
        expect(allOutput).not.toContain('/dist/cli.js:');
        expect(allOutput).not.toContain('Object.<anonymous>');
        expect(allOutput).not.toContain('Function.Module');
        expect(allOutput).not.toContain('Module._compile');
        expect(allOutput).not.toContain('internal/modules');
        
        // Should only contain user-friendly error messages
        if (result.exitCode !== 0) {
          expect(allOutput).toMatch(/❌/);
        }
      }
    });

    test('should maintain clean error output under various error conditions', async () => {
      // Create scenarios that might trigger different error paths
      const scenarios = [
        {
          name: 'missing argument',
          args: ['batch'],
          expectError: true
        },
        {
          name: 'help command',
          args: ['help'],
          expectError: false
        },
        {
          name: 'valid config command',
          args: ['config', 'templates'],
          expectError: false
        }
      ];
      
      for (const scenario of scenarios) {
        const result = await spawnCLI(scenario.args);
        
        // Verify output is clean regardless of success/failure
        const allOutput = result.stdout + result.stderr;
        
        // Should never contain internal error details
        expect(allOutput).not.toContain('TypeError');
        expect(allOutput).not.toContain('ReferenceError');
        expect(allOutput).not.toContain('SyntaxError');
        expect(allOutput).not.toContain('UnhandledPromiseRejectionWarning');
        
        // Error messages should be user-facing only
        if (scenario.expectError && result.exitCode !== 0) {
          const errorLines = result.stderr.trim().split('\n');
          expect(errorLines.some(line => line.includes('❌'))).toBe(true);
        }
      }
    });
  });

  describe('Error Log Integration', () => {
    test('should handle error logging directory structure correctly', async () => {
      // Create a scenario that would create .shakespeare directory
      await fs.writeFile(path.join(testDir, 'test.md'), '# Test Content');
      
      // Run a command that creates the .shakespeare directory structure
      await spawnCLI(['discover']);
      
      // Verify the .shakespeare directory was created (this shows logging infrastructure works)
      const shakespeareDir = path.join(testDir, '.shakespeare');
      const dirExists = await fs.access(shakespeareDir).then(() => true).catch(() => false);
      
      // If any errors occurred, they should be properly logged without stack traces in console
      expect(dirExists).toBe(true);
    });
  });
});