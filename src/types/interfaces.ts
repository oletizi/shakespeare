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
export const CONTENT_COLLECTIONS = {
  astro: {
    baseDir: 'src/content',
    include: ['**/*.mdx', '**/*.md'],
    exclude: ['**/index.md', '**/README.md'],
    framework: 'astro' as const
  },
  nextjs: {
    baseDir: 'content',
    include: ['**/*.mdx', '**/*.md'],
    exclude: ['**/README.md'],
    framework: 'nextjs' as const
  },
  gatsby: {
    baseDir: 'content',
    include: ['**/*.mdx', '**/*.md'],
    exclude: ['**/README.md'],
    framework: 'gatsby' as const
  },
  custom: (baseDir: string, include: string[] = ['**/*.md'], exclude: string[] = []) => ({
    baseDir,
    include,
    exclude,
    framework: 'custom' as const
  })
} as const;

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
  readdir(path: string, options?: { withFileTypes?: boolean }): Promise<any[]>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
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
  addOperationCost(entryPath: string, operation: 'review' | 'improve' | 'generate', costInfo: AICostInfo, qualityBefore?: number, qualityAfter?: number): Promise<void>;
  getCostSummary(specificPath?: string): {
    totalCosts: { review: number; improvement: number; generation: number; total: number };
    costsByContent: Record<string, any>;
    averageCostPerQualityPoint: number;
    totalOperations: number;
  };
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
  /** Consolidated cost information for tracking (backward compatibility) */
  costInfo?: AICostInfo;
}

/**
 * Interface for AI content scoring with cost optimization
 */
export interface IContentScorer {
  /** Core methods - single implementation path */
  scoreContent(content: string, strategies?: ScoringStrategy[]): Promise<EnhancedAIContentAnalysis>;
  improveContent(content: string, analysis: AIContentAnalysis, options?: AIModelOptions): Promise<AIResponse>;
  
  /** Array-based model fallback method for content improvement */
  improveContentWithModels(content: string, analysis: AIContentAnalysis, modelOptions: AIModelOptions[]): Promise<AIResponse>;
  
  /** Batch operations for cost optimization */
  scoreContentBatch(contentList: string[], strategies?: ScoringStrategy[]): Promise<EnhancedAIContentAnalysis[]>;
  
  /** Cost estimation for operations */
  estimateScoringCost(content: string, strategies?: ScoringStrategy[]): Promise<number>;
  estimateImprovementCost(content: string, analysis: AIContentAnalysis, options?: AIModelOptions): Promise<number>;
}

/**
 * Shakespeare configuration
 */
export interface ShakespeareConfig {
  /** Use cost-optimized models (cheap, fast) */
  costOptimized?: boolean;
  /** Use quality-first models (expensive, best results) */
  qualityFirst?: boolean;
  /** Override specific model for all operations */
  model?: string;
  /** Override specific provider for all operations */
  provider?: string;
  /** Custom model options for all operations */
  modelOptions?: AIModelOptions;
  /** Task-specific model configuration - can be single model or array for fallback */
  models?: {
    /** Model(s) for content review/scoring operations - tries in order on runtime errors */
    review?: {
      model: string;
      provider?: string;
    } | string | Array<{
      model: string;
      provider?: string;
    } | string>;
    /** Model(s) for content improvement operations - tries in order on runtime errors */
    improve?: {
      model: string;
      provider?: string;
    } | string | Array<{
      model: string;
      provider?: string;
    } | string>;
    /** Model(s) for content generation operations - tries in order on runtime errors */
    generate?: {
      model: string;
      provider?: string;
    } | string | Array<{
      model: string;
      provider?: string;
    } | string>;
  };
  /** Task-specific model options configuration */
  taskModelOptions?: {
    /** Model options for review operations */
    review?: AIModelOptions;
    /** Model options for improve operations */
    improve?: AIModelOptions;
    /** Model options for generate operations */
    generate?: AIModelOptions;
  };
  /** Enable verbose progress reporting */
  verbose?: boolean;
  /** Log level for structured logging */
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
  /** Database path override (relative to config file location) */
  dbPath?: string;
  /** Content collection override */
  contentCollection?: ContentCollectionConfig | keyof typeof CONTENT_COLLECTIONS;
}

/**
 * Content chunk for processing large documents
 */
export interface ContentChunk {
  /** Unique identifier for the chunk */
  id: string;
  /** Content of this chunk */
  content: string;
  /** Starting line number in original content */
  startLine: number;
  /** Ending line number in original content */
  endLine: number;
  /** Headers present in this chunk */
  headers: string[];
  /** Whether this chunk should preserve frontmatter */
  preserveFrontmatter: boolean;
  /** Character count of this chunk */
  characterCount: number;
  /** Whether this is the first chunk */
  isFirst: boolean;
  /** Whether this is the last chunk */
  isLast: boolean;
}

/**
 * Configuration for content chunking
 */
export interface ChunkingConfig {
  /** Maximum characters per chunk */
  maxChunkSize: number;
  /** Minimum characters per chunk */
  minChunkSize: number;
  /** Whether to split on markdown headers */
  splitOnHeaders: boolean;
  /** Header levels to split on (1 = H1, 2 = H2, etc.) */
  headerLevels: number[];
  /** Overlap between chunks for context */
  overlapLines: number;
}

/**
 * Result of chunk processing
 */
export interface ChunkProcessingResult {
  /** The improved chunk */
  chunk: ContentChunk;
  /** Whether the processing succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Processing metadata */
  metadata: {
    originalLength: number;
    improvedLength: number;
    lengthRatio: number;
    processingTime: number;
  };
}