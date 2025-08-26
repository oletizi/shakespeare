import { GooseAI } from '@/utils/goose';
import { spawn } from 'child_process';

// Mock the spawn function to capture command arguments
jest.mock('child_process');
const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

describe('GooseAI Argument Construction', () => {
  let gooseAI: GooseAI;
  let mockProcess: any;

  beforeEach(() => {
    // Reset mock
    mockSpawn.mockClear();
    
    // Create mock process
    mockProcess = {
      stdout: {
        on: jest.fn()
      },
      stderr: {
        on: jest.fn()
      },
      on: jest.fn()
    };

    // Setup mock spawn to return our mock process
    mockSpawn.mockReturnValue(mockProcess);

    // Create GooseAI instance
    gooseAI = new GooseAI();
  });

  describe('promptWithOptions argument construction', () => {
    it('should construct basic arguments correctly without options', async () => {
      const prompt = 'Analyze this content';
      
      // Trigger the promise resolution
      setTimeout(() => {
        mockProcess.on.mock.calls.forEach(([event, callback]: any) => {
          if (event === 'close') {
            callback(0); // Simulate successful exit
          }
        });
      }, 10);

      await gooseAI.promptWithOptions(prompt).catch(() => {}); // Ignore mock errors
      
      expect(mockSpawn).toHaveBeenCalledWith(
        'goose',
        ['run', '--no-session', '--quiet', '--text', prompt],
        expect.any(Object)
      );
    });

    it('should place provider option before --text parameter', async () => {
      const prompt = 'Rate this content from 0-10';
      const options = { provider: 'google' };
      
      // Trigger the promise resolution
      setTimeout(() => {
        mockProcess.on.mock.calls.forEach(([event, callback]: any) => {
          if (event === 'close') {
            callback(0);
          }
        });
      }, 10);

      await gooseAI.promptWithOptions(prompt, options).catch(() => {});
      
      expect(mockSpawn).toHaveBeenCalledWith(
        'goose',
        ['run', '--no-session', '--quiet', '--provider', 'google', '--text', prompt],
        expect.any(Object)
      );
    });

    it('should place model option before --text parameter', async () => {
      const prompt = 'Improve this content';
      const options = { model: 'gemini-1.5-flash' };
      
      setTimeout(() => {
        mockProcess.on.mock.calls.forEach(([event, callback]: any) => {
          if (event === 'close') {
            callback(0);
          }
        });
      }, 10);

      await gooseAI.promptWithOptions(prompt, options).catch(() => {});
      
      expect(mockSpawn).toHaveBeenCalledWith(
        'goose',
        ['run', '--no-session', '--quiet', '--model', 'gemini-1.5-flash', '--text', prompt],
        expect.any(Object)
      );
    });

    it('should place both provider and model before --text parameter', async () => {
      const prompt = 'Analyze the engagement level of this content';
      const options = { 
        provider: 'anthropic', 
        model: 'claude-3-5-haiku' 
      };
      
      setTimeout(() => {
        mockProcess.on.mock.calls.forEach(([event, callback]: any) => {
          if (event === 'close') {
            callback(0);
          }
        });
      }, 10);

      await gooseAI.promptWithOptions(prompt, options).catch(() => {});
      
      const expectedArgs = [
        'run', 
        '--no-session', 
        '--quiet',
        '--provider', 
        'anthropic',
        '--model', 
        'claude-3-5-haiku',
        '--text', 
        prompt
      ];
      
      expect(mockSpawn).toHaveBeenCalledWith(
        'goose',
        expectedArgs,
        expect.any(Object)
      );
    });

    it('should always place --text as the second-to-last argument', async () => {
      const prompt = 'Long content for testing argument positioning';
      const options = { 
        provider: 'groq', 
        model: 'llama-3.1-8b'
      };
      
      setTimeout(() => {
        mockProcess.on.mock.calls.forEach(([event, callback]: any) => {
          if (event === 'close') {
            callback(0);
          }
        });
      }, 10);

      await gooseAI.promptWithOptions(prompt, options).catch(() => {});
      
      const [, args] = mockSpawn.mock.calls[0];
      const textIndex = args.indexOf('--text');
      
      // --text should be second-to-last argument
      expect(textIndex).toBe(args.length - 2);
      // The prompt should be the last argument
      expect(args[args.length - 1]).toBe(prompt);
    });

    it('should handle complex prompts with special characters', async () => {
      const prompt = 'Analyze: "How does AI impact productivity?" (with quotes & symbols!)';
      const options = { provider: 'openai', model: 'gpt-4o-mini' };
      
      setTimeout(() => {
        mockProcess.on.mock.calls.forEach(([event, callback]: any) => {
          if (event === 'close') {
            callback(0);
          }
        });
      }, 10);

      await gooseAI.promptWithOptions(prompt, options).catch(() => {});
      
      const [, args] = mockSpawn.mock.calls[0];
      
      // Verify the prompt is preserved exactly as the last argument
      expect(args[args.length - 1]).toBe(prompt);
      // Verify --text is directly before the prompt
      expect(args[args.length - 2]).toBe('--text');
    });

    it('should maintain backward compatibility with legacy prompt method', async () => {
      const prompt = 'Simple backward compatibility test';
      
      setTimeout(() => {
        mockProcess.on.mock.calls.forEach(([event, callback]: any) => {
          if (event === 'close') {
            callback(0);
          }
        });
      }, 10);

      await gooseAI.prompt(prompt).catch(() => {});
      
      // Should call promptWithOptions internally
      expect(mockSpawn).toHaveBeenCalledWith(
        'goose',
        ['run', '--no-session', '--quiet', '--text', prompt],
        expect.any(Object)
      );
    });
  });

  describe('argument construction with default options', () => {
    it('should use default options from constructor', async () => {
      const gooseWithDefaults = new GooseAI(process.cwd(), {
        provider: 'google',
        model: 'gemini-1.5-flash'
      });

      const prompt = 'Test with constructor defaults';
      
      setTimeout(() => {
        mockProcess.on.mock.calls.forEach(([event, callback]: any) => {
          if (event === 'close') {
            callback(0);
          }
        });
      }, 10);

      await gooseWithDefaults.promptWithOptions(prompt).catch(() => {});
      
      expect(mockSpawn).toHaveBeenCalledWith(
        'goose',
        [
          'run', 
          '--no-session', 
          '--quiet',
          '--provider', 
          'google',
          '--model', 
          'gemini-1.5-flash',
          '--text', 
          prompt
        ],
        expect.any(Object)
      );
    });

    it('should override default options with provided options', async () => {
      const gooseWithDefaults = new GooseAI(process.cwd(), {
        provider: 'google',
        model: 'gemini-1.5-flash'
      });

      const prompt = 'Test option override';
      const options = { model: 'claude-3-5-haiku' }; // Override model only
      
      setTimeout(() => {
        mockProcess.on.mock.calls.forEach(([event, callback]: any) => {
          if (event === 'close') {
            callback(0);
          }
        });
      }, 10);

      await gooseWithDefaults.promptWithOptions(prompt, options).catch(() => {});
      
      expect(mockSpawn).toHaveBeenCalledWith(
        'goose',
        [
          'run', 
          '--no-session', 
          '--quiet',
          '--provider', 
          'google', // From defaults
          '--model', 
          'claude-3-5-haiku', // Overridden
          '--text', 
          prompt
        ],
        expect.any(Object)
      );
    });
  });
});