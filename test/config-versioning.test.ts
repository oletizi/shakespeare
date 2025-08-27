import { 
  detectConfigVersion, 
  validateConfig, 
  migrateV1ToV2, 
  normalizeConfig, 
  needsMigration,
  UnsupportedConfigVersionError,
  InvalidConfigError
} from '@/utils/config';
import { ShakespeareConfigV1, ShakespeareConfigV2 } from '@/types/interfaces';

describe('Configuration Versioning System', () => {
  describe('detectConfigVersion', () => {
    it('should detect explicit version numbers', () => {
      expect(detectConfigVersion({ version: 1 })).toBe(1);
      expect(detectConfigVersion({ version: 2 })).toBe(2);
    });

    it('should detect V1 configs by presence of models/workflows', () => {
      const v1ConfigWithModels = {
        models: { review: 'claude-3-5-sonnet' },
        verbose: true
      };
      expect(detectConfigVersion(v1ConfigWithModels)).toBe(1);

      const v1ConfigWithWorkflows = {
        workflows: { discover: { resetExisting: false } },
        verbose: true
      };
      expect(detectConfigVersion(v1ConfigWithWorkflows)).toBe(1);
    });

    it('should detect V2 configs by presence of V2-specific properties', () => {
      const v2ConfigWithCostOptimized = {
        costOptimized: true,
        verbose: true
      };
      expect(detectConfigVersion(v2ConfigWithCostOptimized)).toBe(2);

      const v2ConfigWithQualityFirst = {
        qualityFirst: true,
        verbose: true
      };
      expect(detectConfigVersion(v2ConfigWithQualityFirst)).toBe(2);
    });

    it('should default to V2 for minimal configs', () => {
      expect(detectConfigVersion({ verbose: true })).toBe(2);
      expect(detectConfigVersion({})).toBe(2);
    });
  });

  describe('validateConfig', () => {
    it('should validate V1 configs', () => {
      const validV1: ShakespeareConfigV1 = {
        version: 1,
        models: { review: 'claude-3-5-sonnet' },
        verbose: true
      };
      expect(() => validateConfig(validV1, 1)).not.toThrow();
    });

    it('should validate V2 configs', () => {
      const validV2: ShakespeareConfigV2 = {
        version: 2,
        model: 'claude-3-5-sonnet',
        verbose: true
      };
      expect(() => validateConfig(validV2, 2)).not.toThrow();
    });

    it('should reject V1 config with V2 properties', () => {
      const invalidV1 = {
        version: 1,
        models: { review: 'claude-3-5-sonnet' },
        costOptimized: true // V2 property
      };
      expect(() => validateConfig(invalidV1, 1)).toThrow(InvalidConfigError);
    });

    it('should accept V2 config with task-specific models (restored functionality)', () => {
      const validV2 = {
        version: 2,
        models: { 
          review: 'gemini-1.5-flash-8b',
          improve: 'claude-3-5-sonnet' 
        },
        providers: { 
          review: 'google',
          improve: 'anthropic' 
        }
      };
      expect(() => validateConfig(validV2, 2)).not.toThrow();
    });

    it('should reject V2 config with V1-only properties', () => {
      const invalidV2 = {
        version: 2,
        model: 'claude-3-5-sonnet',
        workflows: { discover: { resetExisting: true } } // V1-only property
      };
      expect(() => validateConfig(invalidV2, 2)).toThrow(InvalidConfigError);
    });

    it('should reject unsupported versions', () => {
      expect(() => validateConfig({}, 999)).toThrow(UnsupportedConfigVersionError);
    });

    it('should reject non-object configs', () => {
      expect(() => validateConfig(null, 2)).toThrow(InvalidConfigError);
      expect(() => validateConfig('invalid', 2)).toThrow(InvalidConfigError);
    });
  });

  describe('migrateV1ToV2', () => {
    it('should migrate basic V1 config to V2', () => {
      const v1Config: ShakespeareConfigV1 = {
        version: 1,
        verbose: true,
        logLevel: 'debug',
        contentCollection: 'astro'
      };

      const v2Config = migrateV1ToV2(v1Config);
      
      expect(v2Config.version).toBe(2);
      expect(v2Config.verbose).toBe(true);
      expect(v2Config.logLevel).toBe('debug');
      expect(v2Config.contentCollection).toBe('astro');
    });

    it('should migrate models configuration', () => {
      const v1Config: ShakespeareConfigV1 = {
        version: 1,
        models: {
          review: 'gemini-1.5-flash-8b',
          improve: 'claude-3-5-sonnet'
        }
      };

      const v2Config = migrateV1ToV2(v1Config);
      
      expect(v2Config.model).toBe('gemini-1.5-flash-8b');
      expect(v2Config.modelOptions?.model).toBe('gemini-1.5-flash-8b');
    });

    it('should migrate provider configuration', () => {
      const v1Config: ShakespeareConfigV1 = {
        version: 1,
        models: { review: 'claude-3-5-sonnet' },
        providers: { review: 'anthropic' }
      };

      const v2Config = migrateV1ToV2(v1Config);
      
      expect(v2Config.provider).toBe('anthropic');
      expect(v2Config.model).toBe('claude-3-5-sonnet');
      expect(v2Config.modelOptions?.provider).toBe('anthropic');
      expect(v2Config.modelOptions?.model).toBe('claude-3-5-sonnet');
    });
  });

  describe('normalizeConfig', () => {
    it('should normalize V1 config to V2 with migration warning', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const v1Config = {
        models: { review: 'gemini-1.5-flash-8b' },
        verbose: true,
        logLevel: 'debug'
      };

      const normalized = normalizeConfig(v1Config);
      
      expect(normalized.version).toBe(2);
      expect(normalized.model).toBe('gemini-1.5-flash-8b');
      expect(normalized.verbose).toBe(true);
      expect(normalized.logLevel).toBe('debug');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('legacy V1 configuration'));
      
      consoleSpy.mockRestore();
    });

    it('should normalize V2 config without migration', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const v2Config = {
        version: 2,
        model: 'claude-3-5-sonnet',
        verbose: true
      };

      const normalized = normalizeConfig(v2Config);
      
      expect(normalized.version).toBe(2);
      expect(normalized.model).toBe('claude-3-5-sonnet');
      expect(normalized.verbose).toBe(true);
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should handle versionless configs as V2', () => {
      const minimalConfig = {
        verbose: true,
        model: 'claude-3-5-sonnet'
      };

      const normalized = normalizeConfig(minimalConfig);
      
      expect(normalized.version).toBe(2);
      expect(normalized.model).toBe('claude-3-5-sonnet');
      expect(normalized.verbose).toBe(true);
    });

    it('should throw error for unsupported versions', () => {
      const unsupportedConfig = {
        version: 999,
        model: 'future-model'
      };

      expect(() => normalizeConfig(unsupportedConfig)).toThrow(UnsupportedConfigVersionError);
    });

    it('should throw error for invalid configs', () => {
      const invalidConfig = {
        version: 1,
        models: { review: 'claude-3-5-sonnet' },
        costOptimized: true // Invalid: V2 property in V1 config
      };

      expect(() => normalizeConfig(invalidConfig)).toThrow(InvalidConfigError);
    });
  });

  describe('needsMigration', () => {
    it('should return true for V1 configs', () => {
      expect(needsMigration({ version: 1 })).toBe(true);
      expect(needsMigration({ models: { review: 'claude-3-5-sonnet' } })).toBe(true);
    });

    it('should return false for V2 configs', () => {
      expect(needsMigration({ version: 2 })).toBe(false);
      expect(needsMigration({ costOptimized: true })).toBe(false);
      expect(needsMigration({ verbose: true })).toBe(false); // Default to V2
    });
  });
});