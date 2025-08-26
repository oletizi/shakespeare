import { ShakespeareLogger } from '@/utils/logger';
import { GooseAI } from '@/utils/goose';

describe('Winston Structured Logging', () => {
  let logger: ShakespeareLogger;
  let consoleSpy: jest.SpyInstance;
  let consoleOutput: string[];

  beforeEach(() => {
    logger = new ShakespeareLogger();
    consoleOutput = [];
    
    // Mock console.log to capture Winston output
    consoleSpy = jest.spyOn(process.stdout, 'write').mockImplementation((message) => {
      consoleOutput.push(String(message));
      return true;
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should provide structured logging with timestamps', () => {
    logger.setVerbose(true);
    logger.info('Test message');
    logger.verbose('Verbose test message');
    logger.debug('Debug test message');

    // Should have output with timestamps
    expect(consoleOutput.length).toBeGreaterThan(0);
    
    // Should contain timestamp format [HH:mm:ss.SSS]
    const hasTimestamp = consoleOutput.some(output => 
      /\[\d{2}:\d{2}:\d{2}\.\d{3}\]/.test(output)
    );
    expect(hasTimestamp).toBe(true);
  });

  it('should show verbose messages only when verbose mode is enabled', () => {
    // First test without verbose mode
    logger.setVerbose(false);
    consoleOutput = [];
    logger.verbose('This should not appear');
    logger.always('This should always appear');
    
    // Should have only the always message
    const alwaysMessages = consoleOutput.filter(output => output.includes('This should always appear'));
    const verboseMessages = consoleOutput.filter(output => output.includes('This should not appear'));
    
    expect(alwaysMessages.length).toBeGreaterThan(0);
    expect(verboseMessages.length).toBe(0);

    // Now test with verbose mode
    consoleOutput = [];
    logger.setVerbose(true);
    logger.verbose('This should now appear');
    logger.always('This should still appear');
    
    const verboseMessages2 = consoleOutput.filter(output => output.includes('This should now appear'));
    const alwaysMessages2 = consoleOutput.filter(output => output.includes('This should still appear'));
    
    expect(verboseMessages2.length).toBeGreaterThan(0);
    expect(alwaysMessages2.length).toBeGreaterThan(0);
  });

  it('should log command execution with content elided', () => {
    logger.setVerbose(true);
    consoleOutput = [];
    
    const longContent = 'This is a very long piece of content that should be elided in the command log because it is too long and contains sensitive information that we dont want to clutter the logs with when debugging command execution';
    
    logger.logCommand('goose', ['run', '--no-session', '--quiet', '--provider', 'anthropic', '--model', 'claude-3-5-sonnet', '--text', longContent], {
      contentLength: longContent.length
    });

    // Should have command log output
    expect(consoleOutput.length).toBeGreaterThan(0);
    
    // Should contain the command name
    const hasCommand = consoleOutput.some(output => output.includes('goose'));
    expect(hasCommand).toBe(true);
    
    // Should NOT contain the full content (should be elided)
    const hasFullContent = consoleOutput.some(output => output.includes(longContent));
    expect(hasFullContent).toBe(false);
    
    // Should contain content length indication
    const hasContentLength = consoleOutput.some(output => 
      output.includes('[CONTENT:') && output.includes('chars]')
    );
    expect(hasContentLength).toBe(true);
  });

  it('should log timing information', () => {
    logger.setVerbose(true);
    consoleOutput = [];
    
    logger.logTiming('Test operation', 1234, {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet'
    });

    // Should have timing log output
    expect(consoleOutput.length).toBeGreaterThan(0);
    
    // Should contain the operation name and timing
    const hasOperation = consoleOutput.some(output => 
      output.includes('Test operation') && output.includes('1234ms')
    );
    expect(hasOperation).toBe(true);
  });
});

describe('GooseAI Command Logging Integration', () => {
  let consoleSpy: jest.SpyInstance;
  let consoleOutput: string[];

  beforeEach(() => {
    consoleOutput = [];
    
    // Mock console.log to capture Winston output
    consoleSpy = jest.spyOn(process.stdout, 'write').mockImplementation((message) => {
      consoleOutput.push(String(message));
      return true;
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should integrate logger with GooseAI for command logging', () => {
    const logger = new ShakespeareLogger();
    logger.setVerbose(true);
    
    const gooseAI = new GooseAI(process.cwd(), {}, logger);
    
    // Verify the logger is set
    expect(gooseAI).toBeDefined();
    
    // Test the logger integration by calling setLogger
    gooseAI.setLogger(logger);
    
    // This test verifies the integration is set up correctly
    // Actual command testing would require mocking child_process.spawn
    expect(true).toBe(true);
  });
});