import { Shakespeare, ShakespeareFactory } from '@/index';
import { GooseAI } from '@/utils/goose';
import { AIScorer } from '@/utils/ai';

describe('Shakespeare Model Options Configuration', () => {
  describe('constructor with defaultModelOptions', () => {
    it('should create GooseAI with specified model options', () => {
      const modelOptions = {
        provider: 'google',
        model: 'gemini-1.5-flash'
      };

      const shakespeare = new Shakespeare(process.cwd(), undefined, {
        defaultModelOptions: modelOptions
      });

      // Access the private ai property to verify configuration
      const ai = (shakespeare as any).ai;
      expect(ai).toBeInstanceOf(AIScorer);
      
      // The AIScorer should contain a GooseAI with the specified options
      const gooseAI = (ai as any).ai;
      expect(gooseAI).toBeInstanceOf(GooseAI);
      expect((gooseAI as any).defaultOptions).toEqual(modelOptions);
    });

    it('should use default AIScorer when no model options provided', () => {
      const shakespeare = new Shakespeare();
      
      const ai = (shakespeare as any).ai;
      expect(ai).toBeInstanceOf(AIScorer);
      
      // Should have default GooseAI without specific options
      const gooseAI = (ai as any).ai;
      expect(gooseAI).toBeInstanceOf(GooseAI);
      expect((gooseAI as any).defaultOptions).toEqual({});
    });

    it('should accept custom AI scorer and ignore model options', () => {
      const customAI = new AIScorer();
      const modelOptions = {
        provider: 'anthropic',
        model: 'claude-3-5-haiku'
      };

      const shakespeare = new Shakespeare(process.cwd(), undefined, {
        ai: customAI,
        defaultModelOptions: modelOptions // Should be ignored
      });

      const ai = (shakespeare as any).ai;
      expect(ai).toBe(customAI);
    });
  });

  describe('ShakespeareFactory.withCostOptimization', () => {
    it('should create Shakespeare with cost-optimized model configuration', () => {
      const modelOptions = {
        provider: 'groq',
        model: 'llama-3.1-8b'
      };

      const shakespeare = ShakespeareFactory.withCostOptimization(modelOptions);
      
      const ai = (shakespeare as any).ai;
      expect(ai).toBeInstanceOf(AIScorer);
      
      const gooseAI = (ai as any).ai;
      expect(gooseAI).toBeInstanceOf(GooseAI);
      expect((gooseAI as any).defaultOptions).toEqual(modelOptions);
    });

    it('should combine with other options', () => {
      const modelOptions = {
        provider: 'anthropic',
        model: 'claude-3-5-haiku'
      };

      const shakespeare = ShakespeareFactory.withCostOptimization(
        modelOptions,
        '/test/path',
        '/test/db.json',
        { contentCollection: 'astro' }
      );

      // Verify the model options are applied
      const ai = (shakespeare as any).ai;
      const gooseAI = (ai as any).ai;
      expect((gooseAI as any).defaultOptions).toEqual(modelOptions);
    });
  });

  describe('aiOptions configuration', () => {
    it('should accept aiOptions for custom AIScorer configuration', () => {
      const customGooseAI = new GooseAI(process.cwd(), {
        provider: 'deepinfra',
        model: 'deepseek-chat'
      });

      const shakespeare = new Shakespeare(process.cwd(), undefined, {
        aiOptions: { ai: customGooseAI }
      });

      const ai = (shakespeare as any).ai;
      expect(ai).toBeInstanceOf(AIScorer);
      
      const gooseAI = (ai as any).ai;
      expect(gooseAI).toBe(customGooseAI);
    });

    it('should prioritize aiOptions over defaultModelOptions', () => {
      const customGooseAI = new GooseAI(process.cwd(), {
        provider: 'custom',
        model: 'test-model'
      });

      const shakespeare = new Shakespeare(process.cwd(), undefined, {
        aiOptions: { ai: customGooseAI },
        defaultModelOptions: { provider: 'ignored', model: 'ignored' }
      });

      const ai = (shakespeare as any).ai;
      const gooseAI = (ai as any).ai;
      expect(gooseAI).toBe(customGooseAI);
    });
  });

  describe('backward compatibility', () => {
    it('should work with legacy constructor patterns', () => {
      // Old pattern - no options
      const shakespeare1 = new Shakespeare();
      expect((shakespeare1 as any).ai).toBeInstanceOf(AIScorer);

      // Old pattern - with paths only  
      const shakespeare2 = new Shakespeare('/test/path', '/test/db.json');
      expect((shakespeare2 as any).ai).toBeInstanceOf(AIScorer);

      // All should work without errors
      expect(() => shakespeare1).not.toThrow();
      expect(() => shakespeare2).not.toThrow();
    });

    it('should maintain existing factory function behavior', () => {
      const shakespeare1 = ShakespeareFactory.forAstro();
      const shakespeare2 = ShakespeareFactory.forNextJS();
      const shakespeare3 = ShakespeareFactory.forGatsby();

      // All should create AIScorer instances
      expect((shakespeare1 as any).ai).toBeInstanceOf(AIScorer);
      expect((shakespeare2 as any).ai).toBeInstanceOf(AIScorer);
      expect((shakespeare3 as any).ai).toBeInstanceOf(AIScorer);
    });
  });
});