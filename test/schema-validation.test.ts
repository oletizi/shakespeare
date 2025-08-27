import { 
  validateConfigSchema, 
  validateConfigSchemaStrict,
  SchemaValidationError,
  SHAKESPEARE_CONFIG_SCHEMA
} from '@/utils/schema-validation';

describe('Schema Validation', () => {
  describe('Shakespeare Configuration Schema Validation', () => {
    it('should validate valid configuration', () => {
      const validConfig = {
        contentCollection: 'astro',
        verbose: true,
        logLevel: 'info',
        models: {
          review: {
            model: 'gemini-1.5-flash',
            provider: 'google'
          },
          improve: 'claude-3-5-sonnet'
        }
      };

      const result = validateConfigSchema(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should validate minimal configuration', () => {
      const minimalConfig = {
        contentCollection: 'astro'
      };

      const result = validateConfigSchema(minimalConfig);
      expect(result.valid).toBe(true);
    });

    it('should reject configuration with invalid model structure', () => {
      const invalidConfig = {
        models: {
          review: {
            // Missing required 'model' field
            provider: 'google'
          }
        }
      };

      const result = validateConfigSchema(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should validate configuration with costOptimized flag', () => {
      const costOptimizedConfig = {
        costOptimized: true,
        verbose: false
      };

      const result = validateConfigSchema(costOptimizedConfig);
      expect(result.valid).toBe(true);
    });

    it('should validate configuration with qualityFirst flag', () => {
      const qualityFirstConfig = {
        qualityFirst: true,
        verbose: true,
        logLevel: 'debug'
      };

      const result = validateConfigSchema(qualityFirstConfig);
      expect(result.valid).toBe(true);
    });

    it('should validate configuration with taskModelOptions', () => {
      const taskModelConfig = {
        taskModelOptions: {
          review: {
            provider: 'anthropic',
            model: 'claude-3-5-haiku',
            temperature: 0.5
          },
          improve: {
            provider: 'openai',
            model: 'gpt-4o',
            maxTokens: 2000
          }
        }
      };

      const result = validateConfigSchema(taskModelConfig);
      expect(result.valid).toBe(true);
    });

    it('should reject configuration with additional properties', () => {
      const invalidConfig = {
        contentCollection: 'astro',
        unknownProperty: 'should-not-exist'
      };

      const result = validateConfigSchema(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should validate configuration with content collection object', () => {
      const configWithCustomCollection = {
        contentCollection: {
          baseDir: 'content',
          include: ['**/*.md', '**/*.mdx'],
          exclude: ['**/README.md'],
          framework: 'custom'
        }
      };

      const result = validateConfigSchema(configWithCustomCollection);
      expect(result.valid).toBe(true);
    });
  });

  describe('Strict Validation', () => {
    it('should throw error for invalid configuration', () => {
      const invalidConfig = {
        models: {
          review: {
            provider: 'google'
            // Missing required 'model' field
          }
        }
      };

      expect(() => {
        validateConfigSchemaStrict(invalidConfig);
      }).toThrow(SchemaValidationError);
    });

    it('should not throw error for valid configuration', () => {
      const validConfig = {
        contentCollection: 'nextjs',
        verbose: true,
        models: {
          review: 'gpt-4o-mini',
          improve: {
            model: 'claude-3-5-sonnet',
            provider: 'anthropic'
          }
        }
      };

      expect(() => {
        validateConfigSchemaStrict(validConfig);
      }).not.toThrow();
    });
  });

  describe('Schema Object Export', () => {
    it('should export the schema object', () => {
      expect(SHAKESPEARE_CONFIG_SCHEMA).toBeDefined();
      expect(typeof SHAKESPEARE_CONFIG_SCHEMA).toBe('object');
      expect(SHAKESPEARE_CONFIG_SCHEMA.type).toBe('object');
    });
  });
});