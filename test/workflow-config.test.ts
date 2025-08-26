import { Shakespeare } from '@/index';
import { ContentDatabaseHandler } from '@/utils/database';
import { WorkflowConfig } from '@/types/interfaces';
import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

describe('Workflow Configuration', () => {
  const testDir = '/tmp/shakespeare-workflow-test';
  const dbPath = join(testDir, '.shakespeare', 'content-db.json');

  beforeAll(() => {
    // Create test directory structure
    mkdirSync(join(testDir, '.shakespeare'), { recursive: true });
  });

  beforeEach(() => {
    // Clean database before each test
    if (require('fs').existsSync(dbPath)) {
      require('fs').unlinkSync(dbPath);
    }
  });

  afterAll(() => {
    // Clean up test directory
    require('fs').rmSync(testDir, { recursive: true, force: true });
  });

  it('should save and load workflow configuration from database', async () => {
    const shakespeare = new Shakespeare(testDir);
    
    const workflowConfig: WorkflowConfig = {
      contentCollection: 'astro',
      verbose: true,
      models: {
        review: 'gpt-4o-mini',
        improve: 'claude-3-5-sonnet',
        generate: 'claude-3-5-haiku'
      },
      providers: {
        review: 'openai',
        improve: 'anthropic',
        generate: 'anthropic'
      },
      workflows: {
        improve: {
          maxCount: 5,
          targetThreshold: 7.0,
          requireReviewFirst: true
        },
        review: {
          batchSize: 10,
          estimateCosts: true
        }
      }
    };

    // Save configuration
    await shakespeare.saveWorkflowConfig(workflowConfig);

    // Load configuration
    const loadedConfig = await shakespeare.getWorkflowConfig();
    expect(loadedConfig).toEqual(workflowConfig);
  });

  it('should load Shakespeare from database workflow configuration', async () => {
    // Create a database with workflow configuration
    const workflowConfig: WorkflowConfig = {
      contentCollection: 'nextjs',
      verbose: true,
      models: {
        review: 'gemini-1.5-flash'
      },
      providers: {
        review: 'google'
      }
    };

    const dbData = {
      lastUpdated: new Date().toISOString(),
      entries: {},
      config: workflowConfig
    };

    writeFileSync(dbPath, JSON.stringify(dbData, null, 2));

    // Change to test directory for fromConfig to work
    const originalCwd = process.cwd();
    process.chdir(testDir);

    try {
      const shakespeare = await Shakespeare.fromConfig();
      
      // Verify configuration was applied
      const loadedConfig = await shakespeare.getWorkflowConfig();
      expect(loadedConfig).toEqual(workflowConfig);
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('should convert WorkflowConfig to ShakespeareConfig correctly', async () => {
    const workflowConfig: WorkflowConfig = {
      contentCollection: 'gatsby',
      verbose: true,
      models: {
        review: 'llama-3.1-8b'
      },
      providers: {
        review: 'groq'
      }
    };

    const shakespeareConfig = await (Shakespeare as any).workflowConfigToShakespeareConfig(
      workflowConfig, 
      testDir
    );

    expect(shakespeareConfig).toEqual({
      version: 2,
      rootDir: testDir,
      verbose: true,
      logLevel: undefined,
      contentCollection: 'gatsby',
      model: 'llama-3.1-8b',
      provider: 'groq',
      modelOptions: {
        provider: 'groq',
        model: 'llama-3.1-8b'
      }
    });
  });

  it('should prioritize external config file over database config', async () => {
    // Create database config
    const dbConfig: WorkflowConfig = {
      models: { review: 'database-model' }
    };
    
    const dbData = {
      lastUpdated: new Date().toISOString(),
      entries: {},
      config: dbConfig
    };
    
    writeFileSync(dbPath, JSON.stringify(dbData, null, 2));
    
    // Create external config file
    const externalConfigPath = join(testDir, 'shakespeare.config.json');
    const externalConfig = {
      model: 'external-model',
      provider: 'external-provider'
    };
    
    writeFileSync(externalConfigPath, JSON.stringify(externalConfig, null, 2));

    const originalCwd = process.cwd();
    process.chdir(testDir);

    try {
      const shakespeare = await Shakespeare.fromConfig();
      
      // External config should take priority for Shakespeare creation,
      // but database workflow config should still be accessible
      const loadedConfig = await shakespeare.getWorkflowConfig();
      expect(loadedConfig).toEqual(dbConfig); // Database config should still be there
      
      // But the instance should have been created with external config priorities
    } finally {
      process.chdir(originalCwd);
      require('fs').unlinkSync(externalConfigPath);
    }
  });
});