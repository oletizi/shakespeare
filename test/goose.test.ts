import { describe, expect, test, jest } from '@jest/globals';
import { GooseAI } from '../src/utils/goose';
import { spawn } from 'child_process';

// Mock child_process.spawn
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

describe('GooseAI', () => {
  let goose: GooseAI;
  
  beforeEach(() => {
    goose = new GooseAI();
    (spawn as jest.Mock).mockClear();
  });

  test('should send prompt to Goose CLI', async () => {
    const mockProcess = {
      stdin: {
        write: jest.fn(),
        end: jest.fn()
      },
      stdout: {
        on: jest.fn()
      },
      stderr: {
        on: jest.fn()
      },
      on: jest.fn()
    };

    (spawn as jest.Mock).mockReturnValue(mockProcess);

    // Setup mock response
    mockProcess.stdout.on.mockImplementation((event, callback) => {
      if (event === 'data') {
        callback(Buffer.from('Mock response'));
      }
    });

    mockProcess.on.mockImplementation((event, callback) => {
      if (event === 'close') {
        callback(0);
      }
    });

    const response = await goose.prompt('Test prompt');
    
    expect(spawn).toHaveBeenCalledWith('goose', [], expect.any(Object));
    expect(mockProcess.stdin.write).toHaveBeenCalledWith('Test prompt');
    expect(response).toBe('Mock response');
  });

  test('should handle Goose CLI errors', async () => {
    const mockProcess = {
      stdin: {
        write: jest.fn(),
        end: jest.fn()
      },
      stdout: {
        on: jest.fn()
      },
      stderr: {
        on: jest.fn()
      },
      on: jest.fn()
    };

    (spawn as jest.Mock).mockReturnValue(mockProcess);

    // Setup mock error
    mockProcess.stderr.on.mockImplementation((event, callback) => {
      if (event === 'data') {
        callback(Buffer.from('Mock error'));
      }
    });

    mockProcess.on.mockImplementation((event, callback) => {
      if (event === 'close') {
        callback(1);
      }
    });

    await expect(goose.prompt('Test prompt')).rejects.toThrow('Goose failed');
  });
});
