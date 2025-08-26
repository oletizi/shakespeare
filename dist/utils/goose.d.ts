import { IAI, AIModelOptions, AIResponse } from '@/types/interfaces';
/**
 * Default models for cost optimization by task type
 */
declare const DEFAULT_MODELS_BY_TASK: {
    readonly scoring: {
        readonly provider: "google";
        readonly model: "gemini-1.5-flash";
    };
    readonly analysis: {
        readonly provider: "groq";
        readonly model: "llama-3.1-8b";
    };
    readonly improvement: {
        readonly provider: "anthropic";
        readonly model: "claude-3-5-haiku";
    };
    readonly generation: {
        readonly provider: "anthropic";
        readonly model: "claude-3-5-sonnet";
    };
};
/**
 * Enhanced Goose AI interaction handler with multi-model support and cost tracking
 */
export declare class GooseAI implements IAI {
    private gooseCommand;
    private cwd;
    private defaultOptions;
    constructor(cwd?: string, defaultOptions?: AIModelOptions);
    /**
     * Send a prompt to Goose and get the response using headless mode (backward compatibility)
     */
    prompt(prompt: string): Promise<string>;
    /**
     * Enhanced prompt method with model selection and cost tracking
     */
    promptWithOptions(prompt: string, options?: AIModelOptions): Promise<AIResponse>;
    /**
     * Estimate cost before making a request
     */
    estimateCost(prompt: string, options?: AIModelOptions): Promise<number>;
    /**
     * Calculate cost information for a completed operation
     */
    private calculateCostInfo;
    /**
     * Calculate cost from token counts and model options
     */
    private calculateCostFromTokens;
    /**
     * Estimate token count for text (rough approximation)
     */
    private estimateTokens;
    /**
     * Get optimal model for a specific task type
     */
    getOptimalModelForTask(taskType: keyof typeof DEFAULT_MODELS_BY_TASK): AIModelOptions;
}
export {};
