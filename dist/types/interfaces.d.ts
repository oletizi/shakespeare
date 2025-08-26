import { ContentDatabase, ContentEntry } from './content';
import { AIContentAnalysis } from '../utils/ai';
/**
 * Content collection configuration for different frameworks
 */
export interface ContentCollectionConfig {
    /** Base directory to scan for content */
    baseDir: string;
    /** File patterns to include (glob patterns) */
    include: readonly string[];
    /** File patterns to exclude (glob patterns) */
    exclude?: readonly string[];
    /** Framework-specific settings */
    framework?: 'astro' | 'nextjs' | 'gatsby' | 'custom';
}
/**
 * Predefined content collection configurations
 */
export declare const CONTENT_COLLECTIONS: {
    readonly astro: {
        readonly baseDir: "src/content";
        readonly include: readonly ["**/*.mdx", "**/*.md"];
        readonly exclude: readonly ["**/index.md", "**/README.md"];
        readonly framework: "astro";
    };
    readonly nextjs: {
        readonly baseDir: "content";
        readonly include: readonly ["**/*.mdx", "**/*.md"];
        readonly exclude: readonly ["**/README.md"];
        readonly framework: "nextjs";
    };
    readonly gatsby: {
        readonly baseDir: "content";
        readonly include: readonly ["**/*.mdx", "**/*.md"];
        readonly exclude: readonly ["**/README.md"];
        readonly framework: "gatsby";
    };
    readonly custom: (baseDir: string, include?: string[], exclude?: string[]) => {
        baseDir: string;
        include: string[];
        exclude: string[];
        framework: "custom";
    };
};
/**
 * AI model configuration options
 */
export interface AIModelOptions {
    /** Provider name (e.g., 'openai', 'anthropic', 'google') */
    provider?: string;
    /** Specific model name (e.g., 'gpt-4o-mini', 'claude-3-5-haiku') */
    model?: string;
    /** Temperature for response generation */
    temperature?: number;
    /** Maximum tokens for response */
    maxTokens?: number;
    /** Custom configuration for specific providers */
    providerConfig?: Record<string, any>;
}
/**
 * Cost tracking information for AI operations
 */
export interface AICostInfo {
    /** Provider used for the operation */
    provider: string;
    /** Model used for the operation */
    model: string;
    /** Input tokens consumed */
    inputTokens: number;
    /** Output tokens generated */
    outputTokens: number;
    /** Total cost in USD */
    totalCost: number;
    /** Timestamp of the operation */
    timestamp: string;
}
/**
 * Response from AI operations including cost tracking
 */
export interface AIResponse {
    /** The generated text response */
    content: string;
    /** Cost and usage information */
    costInfo: AICostInfo;
}
/**
 * Interface for AI interaction with multi-model and cost tracking support
 */
export interface IAI {
    /** Original method for backward compatibility */
    prompt(prompt: string): Promise<string>;
    /** Enhanced method with model selection and cost tracking */
    promptWithOptions(prompt: string, options?: AIModelOptions): Promise<AIResponse>;
    /** Estimate cost before making a request */
    estimateCost(prompt: string, options?: AIModelOptions): Promise<number>;
}
/**
 * Interface for file system operations
 */
export interface IFileSystem {
    readFile(path: string, encoding?: BufferEncoding): Promise<string>;
    writeFile(path: string, data: string, encoding?: BufferEncoding): Promise<void>;
    readdir(path: string, options?: {
        withFileTypes?: boolean;
    }): Promise<any[]>;
    mkdir(path: string, options?: {
        recursive?: boolean;
    }): Promise<void>;
}
/**
 * Interface for content scanning
 */
export interface IContentScanner {
    scanContent(): Promise<string[]>;
    readContent(filePath: string): Promise<string>;
}
/**
 * Interface for database operations
 */
export interface IContentDatabase {
    load(): Promise<ContentDatabase>;
    save(): Promise<void>;
    getData(): ContentDatabase;
    updateEntry(entryPath: string, updateFn: (entry: ContentEntry | undefined) => ContentEntry): Promise<void>;
}
/**
 * Scoring strategy configuration
 */
export interface ScoringStrategy {
    /** Quality dimension being scored */
    dimension: 'readability' | 'seoScore' | 'technicalAccuracy' | 'engagement' | 'contentDepth';
    /** Preferred model for this dimension (optional - uses default if not specified) */
    preferredModel?: AIModelOptions;
    /** Cost budget for this scoring operation */
    maxCostUSD?: number;
}
/**
 * Enhanced content analysis including cost information
 */
export interface EnhancedAIContentAnalysis {
    /** The analysis results */
    analysis: AIContentAnalysis;
    /** Total cost for all scoring operations */
    totalCost: number;
    /** Cost breakdown per dimension */
    costBreakdown: Record<string, AICostInfo>;
}
/**
 * Interface for AI content scoring with cost optimization
 */
export interface IContentScorer {
    /** Original methods for backward compatibility */
    scoreContent(content: string): Promise<AIContentAnalysis>;
    improveContent(content: string, analysis: AIContentAnalysis): Promise<string>;
    /** Enhanced methods with cost tracking and model selection */
    scoreContentWithCosts(content: string, strategies?: ScoringStrategy[]): Promise<EnhancedAIContentAnalysis>;
    improveContentWithCosts(content: string, analysis: AIContentAnalysis, options?: AIModelOptions): Promise<AIResponse>;
    /** Batch operations for cost optimization */
    scoreContentBatch(contentList: string[], strategies?: ScoringStrategy[]): Promise<EnhancedAIContentAnalysis[]>;
    /** Cost estimation for operations */
    estimateScoringCost(content: string, strategies?: ScoringStrategy[]): Promise<number>;
    estimateImprovementCost(content: string, analysis: AIContentAnalysis, options?: AIModelOptions): Promise<number>;
}
/**
 * Workflow-specific configuration stored in content-db.json
 */
/**
 * Version 1 configuration (legacy WorkflowConfig format)
 * @deprecated Use ShakespeareConfigV2 instead
 */
export interface ShakespeareConfigV1 {
    version?: 1;
    /** Content collection type (auto-detected if not specified) */
    contentCollection?: keyof typeof CONTENT_COLLECTIONS | 'custom';
    /** Enable verbose logging */
    verbose?: boolean;
    /** Log level for structured logging */
    logLevel?: 'error' | 'warn' | 'info' | 'debug';
    /** Model configuration for different workflow types */
    models?: {
        /** Model for content review/scoring operations */
        review?: string;
        /** Model for content improvement operations */
        improve?: string;
        /** Model for content generation operations */
        generate?: string;
    };
    /** Provider configuration for different workflow types */
    providers?: {
        /** Provider for content review/scoring operations */
        review?: string;
        /** Provider for content improvement operations */
        improve?: string;
        /** Provider for content generation operations */
        generate?: string;
    };
    /** Workflow-specific settings */
    workflows?: {
        discover?: {
            /** Whether to reset existing entries when discovering */
            resetExisting?: boolean;
            /** Whether to automatically initialize database */
            autoInit?: boolean;
        };
        review?: {
            /** Batch size for review operations */
            batchSize?: number;
            /** Whether to estimate costs before running */
            estimateCosts?: boolean;
            /** Whether to retry failed operations */
            retryFailures?: boolean;
        };
        improve?: {
            /** Maximum number of items to improve */
            maxCount?: number;
            /** Whether to require review before improvement */
            requireReviewFirst?: boolean;
            /** Minimum score threshold to trigger improvement */
            targetThreshold?: number;
        };
        complete?: {
            /** Number of items to improve in complete workflow */
            improveCount?: number;
            /** Whether to run discovery as part of complete workflow */
            runDiscovery?: boolean;
        };
    };
}
/**
 * Version 2 configuration (current ShakespeareConfig format)
 * This is the preferred configuration format
 */
export interface ShakespeareConfigV2 {
    version?: 2;
    /** Use cost-optimized models (cheap, fast) */
    costOptimized?: boolean;
    /** Use quality-first models (expensive, best results) */
    qualityFirst?: boolean;
    /** Override specific model */
    model?: string;
    /** Override specific provider */
    provider?: string;
    /** Custom model options */
    modelOptions?: AIModelOptions;
    /** Enable verbose progress reporting */
    verbose?: boolean;
    /** Log level for structured logging */
    logLevel?: 'error' | 'warn' | 'info' | 'debug';
    /** Project root directory */
    rootDir?: string;
    /** Database path override */
    dbPath?: string;
    /** Content collection override */
    contentCollection?: ContentCollectionConfig | keyof typeof CONTENT_COLLECTIONS;
}
/**
 * Union type for all supported configuration versions
 */
export type ShakespeareConfig = ShakespeareConfigV1 | ShakespeareConfigV2;
/**
 * Legacy aliases for backward compatibility
 * @deprecated Use ShakespeareConfigV1 or ShakespeareConfigV2 instead
 */
export type WorkflowConfig = ShakespeareConfigV1;
