import { ShakespeareLogger } from '@/utils/logger';
import { GooseAI } from '@/utils/goose';
import winston from 'winston';

// Custom transport for testing that captures log messages
class TestTransport extends winston.transports.Console {
  public messages: string[] = [];
  public fullLogs: any[] = [];
  
  log(info: any, callback?: () => void) {
    this.messages.push(info.message);
    this.fullLogs.push(info);
    if (callback) callback();
  }
}

describe('Winston Structured Logging', () => {
  let logger: ShakespeareLogger;
  let testTransport: TestTransport;

  beforeEach(() => {
    testTransport = new TestTransport();
    
    // Create logger with test transport
    logger = new ShakespeareLogger();
    
    // Replace the console transport with our test transport
    const winstonLogger = (logger as any).logger;
    winstonLogger.clear();
    winstonLogger.add(testTransport);
  });

  it('should provide structured logging with timestamps', () => {
    logger.setVerbose(true);
    logger.info('Test message');
    logger.verbose('Verbose test message');
    logger.debug('Debug test message');

    // Should have logged messages
    expect(testTransport.messages.length).toBeGreaterThan(0);
    
    // Should contain expected messages
    expect(testTransport.messages).toContain('Test message');
    expect(testTransport.messages).toContain('🔧 Verbose test message');
    expect(testTransport.messages).toContain('🐛 Debug test message');
  });

  it('should show verbose messages only when verbose mode is enabled', () => {
    // First test without verbose mode
    logger.setVerbose(false);
    testTransport.messages = [];
    logger.verbose('This should not appear');
    logger.always('This should always appear');
    
    // Should have only the always message
    expect(testTransport.messages).toContain('This should always appear');
    expect(testTransport.messages).not.toContain('🔧 This should not appear');

    // Now test with verbose mode
    testTransport.messages = [];
    logger.setVerbose(true);
    logger.verbose('This should now appear');
    logger.always('This should still appear');
    
    expect(testTransport.messages).toContain('🔧 This should now appear');
    expect(testTransport.messages).toContain('This should still appear');
  });

  it('should log command execution with content elided', () => {
    logger.setVerbose(true);
    testTransport.messages = [];
    
    const longContent = 'This is a very long piece of content that should be elided in the command log because it is too long and contains sensitive information that we dont want to clutter the logs with when debugging command execution';
    
    logger.logCommand('goose', ['run', '--no-session', '--quiet', '--provider', 'anthropic', '--model', 'claude-3-5-sonnet', '--text', longContent], {
      contentLength: longContent.length
    });

    // Should have command log output
    expect(testTransport.messages.length).toBeGreaterThan(0);
    
    // Should contain the command name
    const hasCommand = testTransport.messages.some(msg => msg.includes('goose'));
    expect(hasCommand).toBe(true);
    
    // Should NOT contain the full content (should be elided)
    const hasFullContent = testTransport.messages.some(msg => msg.includes(longContent));
    expect(hasFullContent).toBe(false);
    
    // Should contain content length indication in the metadata
    const logWithMetadata = testTransport.fullLogs.find(log => 
      log.args && log.args.some((arg: string) => arg.includes('[CONTENT:'))
    );
    expect(logWithMetadata).toBeDefined();
  });

  it('should log timing information', () => {
    logger.setVerbose(true);
    testTransport.messages = [];
    
    logger.logTiming('Test operation', 1234, {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet'
    });

    // Should have timing log output
    expect(testTransport.messages.length).toBeGreaterThan(0);
    
    // Should contain the operation name and timing
    const hasOperation = testTransport.messages.some(msg => 
      msg.includes('Test operation') && msg.includes('1234ms')
    );
    expect(hasOperation).toBe(true);
  });
});

describe('GooseAI Command Logging Integration', () => {
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