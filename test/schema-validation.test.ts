import { 
  validateConfigSchema, 
  validateConfigSchemaStrict,
  SchemaValidationError,
  SHAKESPEARE_CONFIG_V1_SCHEMA,
  SHAKESPEARE_CONFIG_V2_SCHEMA
} from '@/utils/schema-validation';

describe('Schema Validation', () => {
  describe('V1 Schema Validation', () => {
    it('should validate valid V1 config', () => {
      const validV1Config = {
        version: 1,
        contentCollection: 'astro',
        verbose: true,
        logLevel: 'debug',
        models: {
          review: 'gemini-1.5-flash-8b',
          improve: 'claude-3-5-sonnet'
        },
        providers: {
          review: 'google',
          improve: 'anthropic'
        },
        workflows: {
          discover: {
            resetExisting: false,
            autoInit: true
          },
          review: {
            batchSize: 5,
            estimateCosts: true
          }
        }
      };

      const result = validateConfigSchema(validV1Config);
      expect(result.valid).toBe(true);
      expect(result.detectedVersion).toBe(1);
      expect(result.errors).toBeUndefined();
    });

    it('should reject V1 config with V2-only properties', () => {
      const invalidV1Config = {
        version: 1,
        models: { review: 'claude-3-5-sonnet' },
        costOptimized: true // V2-only property
      };

      const result = validateConfigSchema(invalidV1Config);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.some(e => e.message.includes('costOptimized'))).toBe(true);
    });

    it('should validate minimal V1 config', () => {
      const minimalV1Config = {
        version: 1
      };

      const result = validateConfigSchema(minimalV1Config);
      expect(result.valid).toBe(true);
      expect(result.detectedVersion).toBe(1);
    });
  });

  describe('V2 Schema Validation', () => {
    it('should validate valid V2 config with task-specific models', () => {
      const validV2Config = {
        version: 2,
        contentCollection: 'astro',
        verbose: true,
        logLevel: 'debug',
        models: {
          review: 'gemini-1.5-flash-8b',
          improve: 'claude-3-5-sonnet',
          generate: 'claude-3-5-sonnet'
        },
        providers: {
          review: 'google',
          improve: 'anthropic',
          generate: 'anthropic'
        }
      };

      const result = validateConfigSchema(validV2Config);
      expect(result.valid).toBe(true);
      expect(result.detectedVersion).toBe(2);
      expect(result.errors).toBeUndefined();
    });

    it('should validate V2 config with cost optimization', () => {
      const costOptimizedConfig = {
        version: 2,
        costOptimized: true,
        contentCollection: 'nextjs',
        verbose: false
      };

      const result = validateConfigSchema(costOptimizedConfig);
      expect(result.valid).toBe(true);
      expect(result.detectedVersion).toBe(2);
    });

    it('should validate V2 config with quality-first', () => {
      const qualityFirstConfig = {
        version: 2,
        qualityFirst: true,
        contentCollection: 'gatsby',
        logLevel: 'info'
      };

      const result = validateConfigSchema(qualityFirstConfig);
      expect(result.valid).toBe(true);
      expect(result.detectedVersion).toBe(2);
    });

    it('should reject V2 config with workflows (V1-only)', () => {
      const invalidV2Config = {
        version: 2,
        models: { review: 'claude-3-5-sonnet' },
        workflows: { // V1-only property
          discover: { resetExisting: true }
        }
      };

      const result = validateConfigSchema(invalidV2Config);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.some(e => e.message.includes('workflows'))).toBe(true);
    });

    it('should validate V2 config with taskModelOptions', () => {
      const advancedV2Config = {
        version: 2,
        taskModelOptions: {
          review: {
            provider: 'google',
            model: 'gemini-1.5-flash',
            temperature: 0.7,
            maxTokens: 4000
          },
          improve: {
            provider: 'anthropic', 
            model: 'claude-3-5-sonnet',
            temperature: 0.3
          }
        }
      };

      const result = validateConfigSchema(advancedV2Config);
      expect(result.valid).toBe(true);
      expect(result.detectedVersion).toBe(2);
    });
  });

  describe('Version Detection', () => {
    it('should detect V1 from workflows property', () => {
      const configWithWorkflows = {
        workflows: {
          discover: { resetExisting: true }
        }
      };

      const result = validateConfigSchema(configWithWorkflows);
      expect(result.detectedVersion).toBe(1);
    });

    it('should detect V2 as default for minimal configs', () => {
      const minimalConfig = {
        contentCollection: 'astro'
      };

      const result = validateConfigSchema(minimalConfig);
      expect(result.detectedVersion).toBe(2);
    });

    it('should respect explicit version', () => {
      const explicitV1 = {
        version: 1,
        costOptimized: true // This will cause validation error but version detection should work
      };

      const result = validateConfigSchema(explicitV1);
      expect(result.detectedVersion).toBe(1);
    });
  });

  describe('Strict Validation', () => {
    it('should throw SchemaValidationError for invalid config', () => {
      const invalidConfig = {
        version: 2,
        workflows: { discover: { resetExisting: true } } // Invalid for V2
      };

      expect(() => {
        validateConfigSchemaStrict(invalidConfig);
      }).toThrow(SchemaValidationError);
    });

    it('should not throw for valid config', () => {
      const validConfig = {
        version: 2,
        costOptimized: true
      };

      expect(() => {
        validateConfigSchemaStrict(validConfig);
      }).not.toThrow();
    });
  });

  describe('Error Messages', () => {
    it('should provide helpful error messages for invalid properties', () => {
      const invalidConfig = {
        version: 2,
        logLevel: 'invalid-level'
      };

      const result = validateConfigSchema(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.some(e => 
        e.message.includes('error, warn, info, debug')
      )).toBe(true);
    });

    it('should catch additional properties', () => {
      const configWithExtra = {
        version: 2,
        invalidProperty: 'not allowed'
      };

      const result = validateConfigSchema(configWithExtra);
      expect(result.valid).toBe(false);
      expect(result.errors!.some(e => 
        e.message.includes('Additional property not allowed')
      )).toBe(true);
    });
  });
});