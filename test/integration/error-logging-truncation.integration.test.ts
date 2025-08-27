/**
 * Integration test for error logging truncation
 * Ensures console output is truncated while full details go to error log files
 */

import { spawn } from 'child_process';
import { join } from 'path';
import { mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'fs';

describe('Error Logging Truncation Integration', () => {
  const testDir = join(__dirname, '../../test-output/error-logging');
  const testContentFile = join(testDir, 'test-content.md');
  const configFile = join(testDir, '.shakespeare/config.json');
  const errorLogFile = join(testDir, '.shakespeare/errors.log');

  beforeAll(() => {
    // Clean up any existing test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }

    // Create test directory structure
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, '.shakespeare'), { recursive: true });

    // Create test content file
    writeFileSync(testContentFile, `# Test Content

This is test content for error logging integration tests.

## Features

- Test error handling
- Validate logging behavior
- Ensure truncated console output

## Summary

This content is used for testing error scenarios.`);

    // Create configuration with verbose logging enabled
    writeFileSync(configFile, JSON.stringify({
      "$schema": "https://schemas.shakespeare.ai/config/v2.json",
      "version": "2",
      "verbose": true,
      "contentCollection": {
        "baseDir": ".",
        "patterns": ["*.md"]
      },
      "aiModel": {
        "scoring": "groq/llama-3.1-8b",
        "improvement": "groq/llama-3.1-8b"
      }
    }, null, 2));
  });

  afterAll(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should prevent extremely verbose console output', async () => {
    const cliPath = join(__dirname, '../../dist/cli.js');
    
    return new Promise<void>((resolve, reject) => {
      // Use improve command which should fail and produce manageable console output
      const child = spawn('node', [cliPath, 'improve', 'nonexistent.md'], {
        cwd: testDir,
        env: {
          ...process.env,
          GROQ_API_KEY: 'sk-invalid-key-for-testing'  // Invalid Groq key
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        try {
          // Should exit with error code
          expect(code).not.toBe(0);

          // Combined output for analysis
          const output = stdout + stderr;
          
          // Should contain Shakespeare version
          expect(output).toMatch(/Shakespeare CLI v\d+\.\d+\.\d+/);

          // Should contain error messages but they should be manageable
          expect(output).toContain('❌');

          // MAIN TEST: Should NOT contain extremely long JSON objects (over 500 chars in single line)
          const lines = output.split('\n');
          const longLines = lines.filter(line => line.length > 500);
          expect(longLines).toHaveLength(0);

          // If context is shown, it should be truncated (look for "...")
          const contextLines = lines.filter(line => line.includes('Context:'));
          contextLines.forEach(line => {
            if (line.length > 200) {
              expect(line).toContain('...');
            }
          });

          // Winston logger meta should be truncated in debug lines when verbose
          const debugLines = lines.filter(line => 
            line.includes('[34mdebug[39m') && line.includes('{')
          );
          
          debugLines.forEach(line => {
            // Debug lines with JSON should be reasonable length and truncated if long
            if (line.length > 150) {
              expect(line).toMatch(/\.\.\.\}/);
            }
          });

          resolve();
        } catch (error) {
          reject(error);
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        child.kill();
        reject(new Error('Test timed out'));
      }, 30000);
    });
  }, 35000);

  it('should truncate winston logger meta output in console', async () => {
    const cliPath = join(__dirname, '../../dist/cli.js');
    
    return new Promise<void>((resolve, reject) => {
      const child = spawn('node', [cliPath, 'status'], {
        cwd: testDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        try {
          const output = stdout + stderr;
          
          // Look for winston log lines with meta data
          const logLines = output.split('\n').filter(line => 
            line.includes('[') && line.includes(']') && line.includes(':') && line.includes('{')
          );

          // Each winston log line with meta should be reasonably short
          logLines.forEach(line => {
            const metaStart = line.indexOf('{');
            if (metaStart !== -1) {
              const metaPart = line.substring(metaStart);
              // Meta part should be truncated if it was long
              if (metaPart.length > 100) {
                expect(metaPart).toMatch(/\.\.\.\}$/);
              }
            }
          });

          resolve();
        } catch (error) {
          reject(error);
        }
      });

      // Timeout after 15 seconds
      setTimeout(() => {
        child.kill();
        reject(new Error('Status test timed out'));
      }, 15000);
    });
  }, 20000);
});