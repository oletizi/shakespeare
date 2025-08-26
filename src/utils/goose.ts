import { spawn } from 'child_process';
import { IAI, AIModelOptions, AIResponse, AICostInfo } from '@/types/interfaces';

/**
 * Cost per token (in USD) for different providers/models
 * These are approximate costs and should be updated based on current pricing
 */
const MODEL_COSTS = {
  // OpenAI pricing (per 1M tokens)
  'openai/gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'openai/gpt-4o': { input: 0.005, output: 0.015 },
  
  // Anthropic pricing (per 1M tokens)  
  'anthropic/claude-3-5-haiku': { input: 0.0008, output: 0.004 },
  'anthropic/claude-3-5-sonnet': { input: 0.003, output: 0.015 },
  
  // Google pricing (per 1M tokens)
  'google/gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
  'google/gemini-1.5-pro': { input: 0.00125, output: 0.005 },
  
  // Groq pricing (per 1M tokens) - very fast inference
  'groq/llama-3.1-70b': { input: 0.00059, output: 0.00079 },
  'groq/llama-3.1-8b': { input: 0.00005, output: 0.00008 },
  
  // DeepInfra pricing (per 1M tokens) - cost effective
  'deepinfra/llama-3.1-70b': { input: 0.00052, output: 0.00075 },
  'deepinfra/deepseek-chat': { input: 0.00014, output: 0.00028 }
} as const;

/**
 * Default models for cost optimization by task type
 */
const DEFAULT_MODELS_BY_TASK = {
  // Light tasks - use cheapest models
  scoring: { provider: 'google', model: 'gemini-1.5-flash' },
  analysis: { provider: 'groq', model: 'llama-3.1-8b' },
  // Medium tasks - balance cost and quality
  improvement: { provider: 'anthropic', model: 'claude-3-5-haiku' },
  // Heavy tasks - use best models
  generation: { provider: 'anthropic', model: 'claude-3-5-sonnet' }
} as const;

/**
 * Enhanced Goose AI interaction handler with multi-model support and cost tracking
 */
export class GooseAI implements IAI {
  private gooseCommand: string;
  private cwd: string;
  private defaultOptions: AIModelOptions;

  constructor(cwd: string = process.cwd(), defaultOptions: AIModelOptions = {}) {
    this.gooseCommand = 'goose'; // Assumes goose is in PATH
    this.cwd = cwd;
    this.defaultOptions = defaultOptions;
  }

  /**
   * Send a prompt to Goose and get the response using headless mode (backward compatibility)
   */
  async prompt(prompt: string): Promise<string> {
    const response = await this.promptWithOptions(prompt);
    return response.content;
  }

  /**
   * Enhanced prompt method with model selection and cost tracking
   */
  async promptWithOptions(prompt: string, options?: AIModelOptions): Promise<AIResponse> {
    const startTime = Date.now();
    const finalOptions = { ...this.defaultOptions, ...options };
    
    // Build goose command arguments with provider and model selection
    const args = ['run', '--no-session', '--quiet'];
    
    if (finalOptions.provider) {
      args.push('--provider', finalOptions.provider);
    }
    
    if (finalOptions.model) {
      args.push('--model', finalOptions.model);
    }
    
    // Always add --text and prompt at the end
    args.push('--text', prompt);

    return new Promise((resolve, reject) => {
      const goose = spawn(this.gooseCommand, args, {
        cwd: this.cwd,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let error = '';

      goose.stdout.on('data', (data) => {
        output += data.toString();
      });

      goose.stderr.on('data', (data) => {
        error += data.toString();
      });

      goose.on('close', (code) => {
        if (code !== 0) {
          // Enhanced error reporting with more diagnostic info
          const errorMsg = [
            `Goose failed with exit code ${code}`,
            error ? `STDERR: ${error}` : 'STDERR: (empty)',
            output ? `STDOUT: ${output.substring(0, 200)}...` : 'STDOUT: (empty)',
            `Command: ${this.gooseCommand} ${args.join(' ')}`,
            `Prompt length: ${prompt.length} chars`
          ].join('\n');
          reject(new Error(errorMsg));
        } else {
          const content = output.trim();
          const costInfo = this.calculateCostInfo(
            prompt, 
            content, 
            finalOptions,
            startTime
          );
          
          resolve({
            content,
            costInfo
          });
        }
      });
    });
  }

  /**
   * Estimate cost before making a request
   */
  async estimateCost(prompt: string, options?: AIModelOptions): Promise<number> {
    const finalOptions = { ...this.defaultOptions, ...options };
    const inputTokens = this.estimateTokens(prompt);
    const outputTokens = Math.min(inputTokens * 2, 4000); // Estimate output as 2x input, capped
    
    return this.calculateCostFromTokens(inputTokens, outputTokens, finalOptions);
  }

  /**
   * Calculate cost information for a completed operation
   */
  private calculateCostInfo(
    prompt: string, 
    response: string, 
    options: AIModelOptions,
    startTime: number
  ): AICostInfo {
    const inputTokens = this.estimateTokens(prompt);
    const outputTokens = this.estimateTokens(response);
    const totalCost = this.calculateCostFromTokens(inputTokens, outputTokens, options);
    
    return {
      provider: options.provider || 'default',
      model: options.model || 'default',
      inputTokens,
      outputTokens,
      totalCost,
      timestamp: new Date(startTime).toISOString()
    };
  }

  /**
   * Calculate cost from token counts and model options
   */
  private calculateCostFromTokens(
    inputTokens: number, 
    outputTokens: number, 
    options: AIModelOptions
  ): number {
    const modelKey = `${options.provider || 'openai'}/${options.model || 'gpt-4o-mini'}`;
    const pricing = MODEL_COSTS[modelKey as keyof typeof MODEL_COSTS];
    
    if (!pricing) {
      // Default to GPT-4o-mini pricing if model not found
      const defaultPricing = MODEL_COSTS['openai/gpt-4o-mini'];
      return (inputTokens * defaultPricing.input + outputTokens * defaultPricing.output) / 1000000;
    }
    
    return (inputTokens * pricing.input + outputTokens * pricing.output) / 1000000;
  }

  /**
   * Estimate token count for text (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough approximation: 4 characters per token on average
    return Math.ceil(text.length / 4);
  }

  /**
   * Get optimal model for a specific task type
   */
  getOptimalModelForTask(taskType: keyof typeof DEFAULT_MODELS_BY_TASK): AIModelOptions {
    return DEFAULT_MODELS_BY_TASK[taskType];
  }
}
