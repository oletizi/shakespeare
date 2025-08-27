// src/utils/scanner.ts
import fs from "fs/promises";
import path from "path";

// src/types/interfaces.ts
var CONTENT_COLLECTIONS = {
  astro: {
    baseDir: "src/content",
    include: ["**/*.mdx", "**/*.md"],
    exclude: ["**/index.md", "**/README.md"],
    framework: "astro"
  },
  nextjs: {
    baseDir: "content",
    include: ["**/*.mdx", "**/*.md"],
    exclude: ["**/README.md"],
    framework: "nextjs"
  },
  gatsby: {
    baseDir: "content",
    include: ["**/*.mdx", "**/*.md"],
    exclude: ["**/README.md"],
    framework: "gatsby"
  },
  custom: (baseDir, include = ["**/*.md"], exclude = []) => ({
    baseDir,
    include,
    exclude,
    framework: "custom"
  })
};

// src/utils/scanner.ts
var ContentScanner = class {
  config;
  rootDir;
  constructor(rootDir = process.cwd(), config) {
    this.rootDir = rootDir;
    if (typeof config === "string") {
      this.config = CONTENT_COLLECTIONS[config];
    } else if (config) {
      this.config = config;
    } else {
      this.config = CONTENT_COLLECTIONS.astro;
    }
  }
  /**
   * Scan for content files based on configuration
   */
  async scanContent() {
    const contentDir = path.resolve(this.rootDir, this.config.baseDir);
    try {
      await fs.access(contentDir);
    } catch {
      throw new Error(`Content directory not found: ${contentDir}. Make sure the directory exists or configure a different baseDir.`);
    }
    const contentFiles = [];
    const scan = async (dir, relativePath = "") => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativeFilePath = path.join(relativePath, entry.name);
        if (entry.isDirectory()) {
          await scan(fullPath, relativeFilePath);
        } else if (entry.isFile()) {
          const shouldInclude = this.matchesPatterns(relativeFilePath, this.config.include);
          const shouldExclude = this.config.exclude && this.matchesPatterns(relativeFilePath, this.config.exclude);
          if (shouldInclude && !shouldExclude) {
            contentFiles.push(fullPath);
          }
        }
      }
    };
    await scan(contentDir);
    return contentFiles.sort();
  }
  /**
   * Check if a file path matches any of the given glob-like patterns
   */
  matchesPatterns(filePath, patterns) {
    return patterns.some((pattern) => this.matchesPattern(filePath, pattern));
  }
  /**
   * Simple glob pattern matching (supports ** and * wildcards)
   */
  matchesPattern(filePath, pattern) {
    const normalizedPath = filePath.replace(/\\/g, "/");
    const normalizedPattern = pattern.replace(/\\/g, "/");
    let regexPattern = normalizedPattern.replace(/\./g, "\\.").replace(/\*\*\//g, "___DOUBLESTARSLASH___").replace(/\*\*/g, "___DOUBLESTAR___").replace(/\*/g, "[^/]*").replace(/___DOUBLESTARSLASH___/g, "(?:.*/)?").replace(/___DOUBLESTAR___/g, "(?:.*/)?");
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(normalizedPath);
  }
  /**
   * Read content of a markdown file
   */
  async readContent(filePath) {
    return fs.readFile(filePath, "utf-8");
  }
};

// src/utils/database.ts
import fs2 from "fs/promises";
import path2 from "path";
var ContentDatabaseHandler = class {
  dbPath;
  dbDir;
  data = {
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
    entries: {}
  };
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.dbDir = path2.dirname(dbPath);
  }
  /**
   * Convert absolute path to relative path from database directory
   */
  toRelativePath(absolutePath) {
    return path2.relative(this.dbDir, absolutePath);
  }
  /**
   * Convert relative path to absolute path from database directory
   */
  toAbsolutePath(relativePath) {
    return path2.resolve(this.dbDir, relativePath);
  }
  /**
   * Load the database from disk
   */
  async load() {
    try {
      const content = await fs2.readFile(this.dbPath, "utf-8");
      this.data = JSON.parse(content);
      const normalizedEntries = {};
      for (const [relativePath, entry] of Object.entries(this.data.entries)) {
        const absolutePath = this.toAbsolutePath(relativePath);
        normalizedEntries[absolutePath] = {
          ...entry,
          path: absolutePath
          // Ensure entry.path is also absolute
        };
      }
      this.data.entries = normalizedEntries;
      return this.data;
    } catch (error) {
      if (error.code === "ENOENT") {
        await this.save();
        return this.data;
      }
      throw error;
    }
  }
  /**
   * Save the database to disk
   */
  async save() {
    this.data.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    try {
      await fs2.mkdir(this.dbDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create database directory ${this.dbDir}: ${error instanceof Error ? error.message : String(error)}`);
    }
    const storageData = {
      ...this.data,
      entries: {}
    };
    for (const [absolutePath, entry] of Object.entries(this.data.entries)) {
      const relativePath = this.toRelativePath(absolutePath);
      storageData.entries[relativePath] = {
        ...entry,
        path: relativePath
        // Store relative path in entry.path as well
      };
    }
    await fs2.writeFile(this.dbPath, JSON.stringify(storageData, null, 2));
  }
  /**
   * Get the current database state
   */
  getData() {
    return this.data;
  }
  /**
   * Update an entry in the database
   */
  async updateEntry(entryPath, updateFn) {
    this.data.entries[entryPath] = updateFn(this.data.entries[entryPath]);
    await this.save();
  }
};

// src/utils/constants.ts
var DEFAULT_TARGET_SCORES = {
  readability: 8,
  seoScore: 8.5,
  technicalAccuracy: 9,
  engagement: 8,
  contentDepth: 8.5
};

// src/utils/goose.ts
import { spawn } from "child_process";

// src/utils/logger.ts
import winston from "winston";
import { join } from "path";
import { mkdirSync, existsSync, writeFileSync } from "fs";
var MAX_CONSOLE_ERROR_LENGTH = 200;
function formatErrorForConsole(error, operation, context) {
  let errorMessage;
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === "string") {
    errorMessage = error;
  } else {
    errorMessage = `Unexpected error type: ${typeof error}`;
  }
  if (operation) {
    errorMessage = `${operation}: ${errorMessage}`;
  }
  if (context) {
    const contextStr = JSON.stringify(context);
    const maxContextLength = MAX_CONSOLE_ERROR_LENGTH - errorMessage.length - 20;
    if (maxContextLength > 20) {
      const truncatedContext = contextStr.length > maxContextLength ? contextStr.substring(0, maxContextLength) + "..." : contextStr;
      errorMessage += ` (Context: ${truncatedContext})`;
    }
  }
  if (errorMessage.length > MAX_CONSOLE_ERROR_LENGTH) {
    errorMessage = errorMessage.substring(0, MAX_CONSOLE_ERROR_LENGTH) + "...";
  }
  return errorMessage;
}
var ShakespeareLogger = class {
  logger;
  verboseEnabled = false;
  errorLogPath;
  constructor(rootDir) {
    const logDir = rootDir ? join(rootDir, ".shakespeare") : join(process.cwd(), ".shakespeare");
    this.errorLogPath = join(logDir, "errors.log");
    const isTestEnvironment = process.env.NODE_ENV === "test" || process.env.JEST_WORKER_ID !== void 0;
    const canCreateLogDir = !isTestEnvironment || rootDir?.startsWith("/tmp") || rootDir?.startsWith(process.cwd());
    let fileTransport = null;
    if (canCreateLogDir) {
      if (!existsSync(logDir)) {
        try {
          mkdirSync(logDir, { recursive: true });
        } catch (error) {
          if (!isTestEnvironment) {
            console.warn(`Warning: Could not create log directory ${logDir}`);
          }
        }
      }
      if (existsSync(logDir)) {
        const gitignorePath = join(logDir, ".gitignore");
        if (!existsSync(gitignorePath)) {
          try {
            writeFileSync(gitignorePath, "# Ignore Shakespeare log files\n*.log*\n");
          } catch (error) {
          }
        }
      }
      if (existsSync(logDir)) {
        try {
          fileTransport = new winston.transports.File({
            filename: this.errorLogPath,
            level: "error",
            format: winston.format.combine(
              winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
              winston.format.errors({ stack: true }),
              winston.format.json()
            ),
            maxsize: 10 * 1024 * 1024,
            // 10MB max file size
            maxFiles: 5,
            // Keep 5 error log files
            tailable: true
          });
        } catch (error) {
          if (!isTestEnvironment) {
            console.warn(`Warning: Could not create error log file ${this.errorLogPath}`);
          }
        }
      }
    }
    const transports = [
      // Console transport for regular logging
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
            const timeStr = typeof timestamp === "string" ? timestamp.split(" ")[1] : timestamp;
            return `[${timeStr}] ${level}: ${message}${metaStr}`;
          })
        )
      })
    ];
    if (fileTransport) {
      transports.push(fileTransport);
    }
    this.logger = winston.createLogger({
      level: "info",
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports
    });
  }
  /**
   * Enable or disable verbose logging
   */
  setVerbose(enabled) {
    this.verboseEnabled = enabled;
    this.logger.level = enabled ? "debug" : "info";
  }
  /**
   * Set explicit log level
   */
  setLevel(level) {
    this.logger.level = level;
    this.verboseEnabled = level === "debug";
  }
  /**
   * Check if verbose mode is enabled
   */
  isVerbose() {
    return this.verboseEnabled;
  }
  /**
   * Always log - shown regardless of verbose setting
   */
  always(message, meta) {
    this.logger.info(message, meta);
  }
  /**
   * Verbose level logging - only shown when verbose is enabled
   */
  verbose(message, meta) {
    if (this.verboseEnabled) {
      this.logger.info(`\u{1F527} ${message}`, meta);
    }
  }
  /**
   * Debug level logging - detailed information for debugging
   */
  debug(message, meta) {
    if (this.verboseEnabled) {
      this.logger.debug(`\u{1F41B} ${message}`, meta);
    }
  }
  /**
   * Info level logging - general information
   */
  info(message, meta) {
    this.logger.info(message, meta);
  }
  /**
   * Warning level logging
   */
  warn(message, meta) {
    this.logger.warn(`\u26A0\uFE0F  ${message}`, meta);
  }
  /**
   * Error level logging - logs to console and error file
   */
  error(message, meta) {
    this.logger.error(`\u274C ${message}`, meta);
  }
  /**
   * Centralized error logging - handles both console (concise) and file (verbose) logging
   * This should be the single entry point for all error logging in the application
   */
  logError(operation, error, context) {
    const conciseError = formatErrorForConsole(error, operation, context);
    console.error();
    console.error(`\u274C ${conciseError}`);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : void 0;
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const fullContext = {
      timestamp,
      operation: operation || "Unknown operation",
      error: errorMessage,
      stack: errorStack,
      ...context && { context },
      // Include provided context
      process: {
        cwd: process.cwd(),
        argv: process.argv,
        version: process.version,
        platform: process.platform
      }
    };
    this.logger.error("Operation failed", fullContext);
    const hasFileTransport = this.logger.transports.some((t) => t instanceof winston.transports.File);
    if (hasFileTransport && existsSync(this.errorLogPath)) {
      console.error(`\u{1F4CB} Full error details logged to: ${this.errorLogPath}`);
      console.error(`\u{1F4A1} Run: tail -f "${this.errorLogPath}" to monitor errors`);
    }
    console.error();
  }
  /**
   * Get the path to the error log file
   */
  getErrorLogPath() {
    return this.errorLogPath;
  }
  /**
   * Log command execution with elided content
   */
  logCommand(command, args, options) {
    if (this.verboseEnabled) {
      const processedArgs = args.map((arg) => {
        if (arg.length > 100 && !arg.startsWith("--") && !arg.includes("/") && !arg.includes("=")) {
          return `[CONTENT: ${arg.length} chars]`;
        }
        return arg;
      });
      const meta = {
        command,
        args: processedArgs,
        ...options?.contentLength && { contentLength: options.contentLength }
      };
      this.logger.debug(`\u{1F680} Executing command: ${command}`, meta);
    }
  }
  /**
   * Log timing information
   */
  logTiming(operation, duration, meta) {
    if (this.verboseEnabled) {
      this.logger.debug(`\u23F1\uFE0F  ${operation} completed in ${duration}ms`, { duration, ...meta });
    }
  }
  /**
   * Log file processing information
   */
  logFileProcessing(filePath, operation, meta) {
    if (this.verboseEnabled) {
      const fileName = filePath.split("/").pop() || filePath;
      this.logger.debug(`\u{1F4C4} ${operation}: ${fileName}`, { filePath, operation, ...meta });
    }
  }
  /**
   * Log configuration details
   */
  logConfig(config) {
    if (this.verboseEnabled) {
      this.logger.info("\u{1F527} Configuration Details:", config);
    }
  }
  /**
   * Log statistics
   */
  logStats(stats) {
    if (this.verboseEnabled) {
      this.logger.info("\u{1F4CA} Statistics:", stats);
    }
  }
  /**
   * Create a child logger with additional context
   */
  child(context) {
    return this.logger.child(context);
  }
};

// src/utils/goose.ts
var MODEL_COSTS = {
  // OpenAI pricing (per 1M tokens)
  "openai/gpt-4o-mini": { input: 15e-5, output: 6e-4 },
  "openai/gpt-4o": { input: 5e-3, output: 0.015 },
  // Anthropic pricing (per 1M tokens)  
  "anthropic/claude-3-5-haiku": { input: 8e-4, output: 4e-3 },
  "anthropic/claude-3-5-sonnet": { input: 3e-3, output: 0.015 },
  // Google pricing (per 1M tokens)
  "google/gemini-1.5-flash": { input: 75e-6, output: 3e-4 },
  "google/gemini-1.5-pro": { input: 125e-5, output: 5e-3 },
  // Groq pricing (per 1M tokens) - very fast inference
  "groq/llama-3.1-70b": { input: 59e-5, output: 79e-5 },
  "groq/llama-3.1-8b": { input: 5e-5, output: 8e-5 },
  // DeepInfra pricing (per 1M tokens) - cost effective
  "deepinfra/llama-3.1-70b": { input: 52e-5, output: 75e-5 },
  "deepinfra/deepseek-chat": { input: 14e-5, output: 28e-5 }
};
var DEFAULT_MODELS_BY_TASK = {
  // Light tasks - use cheapest models
  scoring: { provider: "google", model: "gemini-1.5-flash" },
  analysis: { provider: "groq", model: "llama-3.1-8b" },
  // Medium tasks - balance cost and quality
  improvement: { provider: "anthropic", model: "claude-3-5-haiku" },
  // Heavy tasks - use best models
  generation: { provider: "anthropic", model: "claude-3-5-sonnet" }
};
var GooseAI = class {
  gooseCommand;
  cwd;
  defaultOptions;
  logger;
  constructor(cwd = process.cwd(), defaultOptions = {}, logger) {
    this.gooseCommand = "goose";
    this.cwd = cwd;
    this.defaultOptions = defaultOptions;
    this.logger = logger || new ShakespeareLogger(cwd);
  }
  /**
   * Set the logger instance for command logging
   */
  setLogger(logger) {
    this.logger = logger;
  }
  /**
   * Send a prompt to Goose and get the response using headless mode (backward compatibility)
   */
  async prompt(prompt) {
    const response = await this.promptWithOptions(prompt);
    return response.content;
  }
  /**
   * Enhanced prompt method with model selection and cost tracking
   */
  async promptWithOptions(prompt, options) {
    const startTime = Date.now();
    const finalOptions = { ...this.defaultOptions, ...options };
    const args = ["run", "--no-session", "--quiet"];
    if (finalOptions.provider) {
      args.push("--provider", finalOptions.provider);
    }
    if (finalOptions.model) {
      args.push("--model", finalOptions.model);
    }
    args.push("--text", prompt);
    this.logger.logCommand(this.gooseCommand, args, { contentLength: prompt.length });
    return new Promise((resolve, reject) => {
      const goose = spawn(this.gooseCommand, args, {
        cwd: this.cwd,
        stdio: ["pipe", "pipe", "pipe"]
      });
      let output = "";
      let error = "";
      goose.stdout.on("data", (data) => {
        output += data.toString();
      });
      goose.stderr.on("data", (data) => {
        error += data.toString();
      });
      goose.on("close", (code) => {
        const duration = Date.now() - startTime;
        if (code !== 0) {
          this.logger.logTiming("Goose command (failed)", duration, {
            exitCode: code,
            promptLength: prompt.length,
            provider: finalOptions.provider,
            model: finalOptions.model
          });
          const errorMsg = `Goose failed with exit code ${code}`;
          const errorContext = {
            exitCode: code,
            stderr: error || "(empty)",
            stdout: output || "(empty)",
            command: this.gooseCommand,
            args,
            promptLength: prompt.length,
            modelOptions: finalOptions,
            duration
          };
          this.logger.logError("Goose AI request", errorMsg, errorContext);
          reject(new Error(errorMsg));
        } else {
          const content = output.trim();
          const costInfo = this.calculateCostInfo(
            prompt,
            content,
            finalOptions,
            startTime
          );
          this.logger.logTiming("Goose command (success)", duration, {
            promptLength: prompt.length,
            responseLength: content.length,
            provider: finalOptions.provider,
            model: finalOptions.model,
            estimatedCost: costInfo.totalCost
          });
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
  async estimateCost(prompt, options) {
    const finalOptions = { ...this.defaultOptions, ...options };
    const inputTokens = this.estimateTokens(prompt);
    const outputTokens = Math.min(inputTokens * 2, 4e3);
    return this.calculateCostFromTokens(inputTokens, outputTokens, finalOptions);
  }
  /**
   * Calculate cost information for a completed operation
   */
  calculateCostInfo(prompt, response, options, startTime) {
    const inputTokens = this.estimateTokens(prompt);
    const outputTokens = this.estimateTokens(response);
    const totalCost = this.calculateCostFromTokens(inputTokens, outputTokens, options);
    return {
      provider: options.provider || "default",
      model: options.model || "default",
      inputTokens,
      outputTokens,
      totalCost,
      timestamp: new Date(startTime).toISOString()
    };
  }
  /**
   * Calculate cost from token counts and model options
   */
  calculateCostFromTokens(inputTokens, outputTokens, options) {
    const modelKey = `${options.provider || "openai"}/${options.model || "gpt-4o-mini"}`;
    const pricing = MODEL_COSTS[modelKey];
    if (!pricing) {
      const defaultPricing = MODEL_COSTS["openai/gpt-4o-mini"];
      return (inputTokens * defaultPricing.input + outputTokens * defaultPricing.output) / 1e6;
    }
    return (inputTokens * pricing.input + outputTokens * pricing.output) / 1e6;
  }
  /**
   * Estimate token count for text (rough approximation)
   */
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }
  /**
   * Get optimal model for a specific task type
   */
  getOptimalModelForTask(taskType) {
    return DEFAULT_MODELS_BY_TASK[taskType];
  }
};

// src/utils/ai.ts
var ANALYSIS_PROMPTS = {
  readability: `
    Analyze the following content for readability. Consider:
    - Sentence structure and length
    - Vocabulary level and consistency
    - Paragraph organization
    - Use of transitions
    - Clear and concise explanations
    
    Score from 0-10 where:
    0-3: Difficult to read, needs major revision
    4-6: Somewhat readable but needs improvement
    7-8: Good readability
    9-10: Excellent, clear and engaging
    
    Provide:
    1. Numeric score (0-10)
    2. Brief reasoning for the score
    3. Specific suggestions for improvement
    
    Content to analyze:
    {content}
    `,
  seoScore: `
    Evaluate the following content for SEO effectiveness. Consider:
    - Keyword usage and placement
    - Meta description potential
    - Header structure and organization
    - Internal/external linking opportunities
    - Content length and depth
    
    Score from 0-10 where:
    0-3: Poor SEO optimization
    4-6: Basic SEO implementation
    7-8: Good SEO practices
    9-10: Excellent SEO optimization
    
    Provide:
    1. Numeric score (0-10)
    2. Brief reasoning for the score
    3. Specific suggestions for improvement
    
    Content to analyze:
    {content}
    `,
  technicalAccuracy: `
    Review the following content for technical accuracy. Consider:
    - Factual correctness
    - Code examples (if any)
    - Technical terminology usage
    - Up-to-date information
    - Technical depth appropriate for the topic
    
    Score from 0-10 where:
    0-3: Contains significant technical errors
    4-6: Some technical inaccuracies
    7-8: Generally accurate with minor issues
    9-10: Highly accurate and well-researched
    
    Provide:
    1. Numeric score (0-10)
    2. Brief reasoning for the score
    3. Specific suggestions for improvement
    
    Content to analyze:
    {content}
    `,
  engagement: `
    Evaluate the content's engagement level. Consider:
    - Writing style and tone
    - Use of examples and analogies
    - Reader interaction elements
    - Story-telling elements
    - Call-to-action effectiveness
    
    Score from 0-10 where:
    0-3: Dry and unengaging
    4-6: Somewhat engaging but could improve
    7-8: Good engagement level
    9-10: Highly engaging and compelling
    
    Provide:
    1. Numeric score (0-10)
    2. Brief reasoning for the score
    3. Specific suggestions for improvement
    
    Content to analyze:
    {content}
    `,
  contentDepth: `
    Analyze the content's depth and comprehensiveness. Consider:
    - Topic coverage breadth
    - Supporting evidence and examples
    - Explanation thoroughness
    - Context and background information
    - Advanced concept handling
    
    Score from 0-10 where:
    0-3: Surface level only
    4-6: Basic coverage with some depth
    7-8: Good depth with most aspects covered
    9-10: Comprehensive and thorough coverage
    
    Provide:
    1. Numeric score (0-10)
    2. Brief reasoning for the score
    3. Specific suggestions for improvement
    
    Content to analyze:
    {content}
    `
};
var IMPROVEMENT_PROMPT = `
You are a content improvement specialist. Review the following content and its quality analysis.
Focus on the dimensions that scored lowest and provide specific improvements.

Current scores and analysis:
{analysis}

Original content:
{content}

Please provide:
1. Improved version of the content
2. Summary of changes made
3. Expected impact on quality scores

Make sure to maintain any technical accuracy while improving readability and engagement.
Preserve the original meaning and intent while enhancing the presentation and effectiveness.
`;
function parseGooseResponse(response) {
  const lines = response.split("\n").map((l) => l.trim()).filter(Boolean);
  let score = 7;
  let reasoning = "";
  const suggestions = [];
  for (const line of lines) {
    if (line.match(/^\d+(\.\d+)?$/)) {
      score = parseFloat(line);
    } else if (line.startsWith("- ")) {
      suggestions.push(line.slice(2));
    } else {
      reasoning = line;
    }
  }
  return {
    score,
    reasoning,
    suggestions
  };
}
var AIScorer = class {
  ai;
  logger;
  constructor(options = {}) {
    this.ai = options.ai ?? new GooseAI();
    this.logger = options.logger ?? new ShakespeareLogger();
  }
  /**
   * Score content across all quality dimensions
   */
  /**
   * Score content across all quality dimensions
   * This is the single entry point for content scoring
   */
  async scoreContent(content, strategies) {
    const analysis = {
      scores: {},
      analysis: {}
    };
    const costBreakdown = {};
    let totalCost = 0;
    const scoringStrategies = strategies || [
      { dimension: "readability", preferredModel: { provider: "google", model: "gemini-1.5-flash" } },
      { dimension: "seoScore", preferredModel: { provider: "google", model: "gemini-1.5-flash" } },
      { dimension: "technicalAccuracy", preferredModel: { provider: "groq", model: "llama-3.1-8b" } },
      { dimension: "engagement", preferredModel: { provider: "google", model: "gemini-1.5-flash" } },
      { dimension: "contentDepth", preferredModel: { provider: "groq", model: "llama-3.1-8b" } }
    ];
    for (const strategy of scoringStrategies) {
      const promptTemplate = ANALYSIS_PROMPTS[strategy.dimension];
      const prompt = promptTemplate.replace("{content}", content);
      try {
        const result = await this.scoreDimensionWithCost(prompt, strategy.preferredModel);
        analysis.scores[strategy.dimension] = result.response.score;
        analysis.analysis[strategy.dimension] = {
          reasoning: result.response.reasoning,
          suggestions: result.response.suggestions || []
        };
        costBreakdown[strategy.dimension] = result.costInfo;
        totalCost += result.costInfo.totalCost;
      } catch (error) {
        this.logger.logError(`Error scoring ${strategy.dimension}`, error);
        throw new Error(`Failed to score ${strategy.dimension}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return {
      analysis,
      totalCost,
      costBreakdown
    };
  }
  /**
   * Score content for a specific dimension
   */
  async scoreDimension(content, prompt) {
    try {
      const response = await this.ai.prompt(prompt);
      return parseGooseResponse(response);
    } catch (error) {
      this.logger.logError("Error scoring content", error);
      throw new Error(`Content scoring failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  /**
   * Generate improved content based on analysis
   * This is the single entry point for content improvement
   */
  async improveContent(content, analysis, options) {
    const analysisStr = JSON.stringify(analysis, null, 2);
    const prompt = IMPROVEMENT_PROMPT.replace("{analysis}", analysisStr).replace("{content}", content);
    if (!("promptWithOptions" in this.ai) || typeof this.ai.promptWithOptions !== "function") {
      throw new Error("AI implementation must support promptWithOptions method");
    }
    const response = await this.ai.promptWithOptions(prompt, options);
    const sections = response.content.split("\n\n");
    const improvedContent = sections[0];
    if (!improvedContent || improvedContent.trim().length === 0) {
      throw new Error("AI returned empty improved content");
    }
    return {
      content: improvedContent,
      costInfo: response.costInfo
    };
  }
  // Remove scoreContentWithCosts - use scoreContent directly
  // Remove improveContentWithCosts - use improveContent directly
  /**
   * Batch scoring for cost optimization
   */
  async scoreContentBatch(contentList, strategies) {
    const results = [];
    for (const content of contentList) {
      const result = await this.scoreContent(content, strategies);
      results.push(result);
    }
    return results;
  }
  /**
   * Estimate cost for scoring operation
   */
  async estimateScoringCost(content, strategies) {
    if (!("estimateCost" in this.ai) || typeof this.ai.estimateCost !== "function") {
      return 0;
    }
    const defaultStrategies = strategies || [
      { dimension: "readability", preferredModel: { provider: "google", model: "gemini-1.5-flash" } },
      { dimension: "seoScore", preferredModel: { provider: "google", model: "gemini-1.5-flash" } },
      { dimension: "technicalAccuracy", preferredModel: { provider: "groq", model: "llama-3.1-8b" } },
      { dimension: "engagement", preferredModel: { provider: "google", model: "gemini-1.5-flash" } },
      { dimension: "contentDepth", preferredModel: { provider: "groq", model: "llama-3.1-8b" } }
    ];
    let totalEstimatedCost = 0;
    for (const strategy of defaultStrategies) {
      const promptTemplate = ANALYSIS_PROMPTS[strategy.dimension];
      const prompt = promptTemplate.replace("{content}", content);
      const cost = await this.ai.estimateCost(prompt, strategy.preferredModel);
      totalEstimatedCost += cost;
    }
    return totalEstimatedCost;
  }
  /**
   * Estimate cost for improvement operation
   */
  async estimateImprovementCost(content, analysis, options) {
    if (!("estimateCost" in this.ai) || typeof this.ai.estimateCost !== "function") {
      return 0;
    }
    const analysisStr = JSON.stringify(analysis, null, 2);
    const prompt = IMPROVEMENT_PROMPT.replace("{analysis}", analysisStr).replace("{content}", content);
    return await this.ai.estimateCost(prompt, options);
  }
  /**
   * Score a specific dimension with cost tracking
   */
  async scoreDimensionWithCost(prompt, modelOptions) {
    if ("promptWithOptions" in this.ai && typeof this.ai.promptWithOptions === "function") {
      const response = await this.ai.promptWithOptions(prompt, modelOptions);
      return {
        response: parseGooseResponse(response.content),
        costInfo: response.costInfo
      };
    } else {
      const responseText = await this.ai.prompt(prompt);
      return {
        response: parseGooseResponse(responseText),
        costInfo: {
          provider: modelOptions?.provider || "unknown",
          model: modelOptions?.model || "unknown",
          inputTokens: Math.ceil(prompt.length / 4),
          outputTokens: Math.ceil(responseText.length / 4),
          totalCost: 0,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      };
    }
  }
};

// src/utils/config.ts
var InvalidConfigError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidConfigError";
  }
};

// src/index.ts
import path3 from "path";
import fs3 from "fs/promises";

// src/utils/schema-validation.ts
var SHAKESPEARE_CONFIG_SCHEMA = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://schemas.shakespeare.ai/config/v2.json",
  "title": "Shakespeare Configuration",
  "description": "Configuration format for Shakespeare AI content management system",
  "type": "object",
  "properties": {
    "$schema": { "type": "string" },
    "costOptimized": { "type": "boolean" },
    "qualityFirst": { "type": "boolean" },
    "model": { "type": "string" },
    "provider": { "type": "string" },
    "modelOptions": {
      "type": "object",
      "properties": {
        "provider": { "type": "string" },
        "model": { "type": "string" },
        "temperature": { "type": "number", "minimum": 0, "maximum": 2 },
        "maxTokens": { "type": "number", "minimum": 1 },
        "providerConfig": { "type": "object", "additionalProperties": true }
      },
      "additionalProperties": false
    },
    "models": {
      "type": "object",
      "properties": {
        "review": {
          "oneOf": [
            { "type": "string" },
            {
              "type": "object",
              "properties": {
                "model": { "type": "string" },
                "provider": { "type": "string" }
              },
              "required": ["model"],
              "additionalProperties": false
            }
          ]
        },
        "improve": {
          "oneOf": [
            { "type": "string" },
            {
              "type": "object",
              "properties": {
                "model": { "type": "string" },
                "provider": { "type": "string" }
              },
              "required": ["model"],
              "additionalProperties": false
            }
          ]
        },
        "generate": {
          "oneOf": [
            { "type": "string" },
            {
              "type": "object",
              "properties": {
                "model": { "type": "string" },
                "provider": { "type": "string" }
              },
              "required": ["model"],
              "additionalProperties": false
            }
          ]
        }
      },
      "additionalProperties": false
    },
    "taskModelOptions": {
      "type": "object",
      "properties": {
        "review": { "$ref": "#/properties/modelOptions" },
        "improve": { "$ref": "#/properties/modelOptions" },
        "generate": { "$ref": "#/properties/modelOptions" }
      },
      "additionalProperties": false
    },
    "verbose": { "type": "boolean" },
    "logLevel": { "type": "string", "enum": ["error", "warn", "info", "debug"] },
    "dbPath": { "type": "string" },
    "contentCollection": {
      "oneOf": [
        { "type": "string", "enum": ["astro", "nextjs", "gatsby", "custom"] },
        {
          "type": "object",
          "properties": {
            "baseDir": { "type": "string" },
            "include": { "type": "array", "items": { "type": "string" } },
            "exclude": { "type": "array", "items": { "type": "string" } },
            "framework": { "type": "string", "enum": ["astro", "nextjs", "gatsby", "custom"] }
          },
          "required": ["baseDir", "include"],
          "additionalProperties": false
        }
      ]
    }
  },
  "additionalProperties": false
};
var SchemaValidationError = class extends Error {
  constructor(message, errors) {
    super(message);
    this.errors = errors;
    this.name = "SchemaValidationError";
  }
};
var SimpleJSONSchemaValidator = class {
  validate(schema, data) {
    const errors = [];
    try {
      this.validateObject(schema, data, "", errors);
    } catch (error) {
      errors.push({ message: `Validation error: ${error}` });
    }
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : void 0
    };
  }
  validateObject(schema, data, path4, errors) {
    if (schema.type === "object") {
      if (typeof data !== "object" || data === null || Array.isArray(data)) {
        errors.push({ path: path4, message: "Expected object" });
        return;
      }
      if (schema.required) {
        for (const prop of schema.required) {
          if (!(prop in data)) {
            errors.push({ path: `${path4}.${prop}`, message: `Missing required property: ${prop}` });
          }
        }
      }
      if (schema.properties) {
        for (const [prop, propSchema] of Object.entries(schema.properties)) {
          if (prop in data) {
            this.validateAny(propSchema, data[prop], `${path4}.${prop}`, errors);
          }
        }
      }
      if (schema.additionalProperties === false) {
        const allowedProps = schema.properties ? Object.keys(schema.properties) : [];
        for (const prop of Object.keys(data)) {
          if (!allowedProps.includes(prop)) {
            errors.push({ path: `${path4}.${prop}`, message: `Additional property not allowed: ${prop}` });
          }
        }
      }
    }
  }
  validateAny(schema, data, path4, errors) {
    if (schema.type) {
      switch (schema.type) {
        case "object":
          this.validateObject(schema, data, path4, errors);
          break;
        case "string":
          if (typeof data !== "string") {
            errors.push({ path: path4, message: "Expected string" });
          } else if (schema.enum && !schema.enum.includes(data)) {
            errors.push({ path: path4, message: `Value must be one of: ${schema.enum.join(", ")}` });
          }
          break;
        case "number":
          if (typeof data !== "number") {
            errors.push({ path: path4, message: "Expected number" });
          } else {
            if (schema.minimum !== void 0 && data < schema.minimum) {
              errors.push({ path: path4, message: `Value must be >= ${schema.minimum}` });
            }
            if (schema.maximum !== void 0 && data > schema.maximum) {
              errors.push({ path: path4, message: `Value must be <= ${schema.maximum}` });
            }
            if (schema.enum && !schema.enum.includes(data)) {
              errors.push({ path: path4, message: `Value must be one of: ${schema.enum.join(", ")}` });
            }
          }
          break;
        case "boolean":
          if (typeof data !== "boolean") {
            errors.push({ path: path4, message: "Expected boolean" });
          }
          break;
        case "array":
          if (!Array.isArray(data)) {
            errors.push({ path: path4, message: "Expected array" });
          } else if (schema.items) {
            data.forEach((item, index) => {
              this.validateAny(schema.items, item, `${path4}[${index}]`, errors);
            });
          }
          break;
      }
    } else if (schema.oneOf) {
      const oneOfErrors = [];
      let validCount = 0;
      for (const subSchema of schema.oneOf) {
        const subErrors = [];
        try {
          this.validateAny(subSchema, data, path4, subErrors);
          if (subErrors.length === 0) {
            validCount++;
          }
        } catch {
        }
        oneOfErrors.push(subErrors);
      }
      if (validCount === 0) {
        errors.push({ path: path4, message: "Data does not match any of the expected schemas" });
      } else if (validCount > 1) {
        errors.push({ path: path4, message: "Data matches multiple schemas (should match exactly one)" });
      }
    }
  }
};
function validateConfigSchema(config, validator = new SimpleJSONSchemaValidator()) {
  return validator.validate(SHAKESPEARE_CONFIG_SCHEMA, config);
}
function validateConfigSchemaStrict(config, validator) {
  const result = validateConfigSchema(config, validator);
  if (!result.valid) {
    const errorMessages = result.errors?.map((e) => `${e.path}: ${e.message}`).join(", ") || "Unknown validation errors";
    throw new SchemaValidationError(`Configuration validation failed: ${errorMessages}`, result.errors || []);
  }
}

// src/index.ts
var Shakespeare = class _Shakespeare {
  constructor(rootDir = process.cwd(), dbPath, options = {}) {
    this.verbose = false;
    this.rootDir = rootDir;
    this.dbPath = dbPath ?? path3.join(rootDir, ".shakespeare", "content-db.json");
    this.logger = new ShakespeareLogger(rootDir);
    this.config = {
      dbPath,
      contentCollection: options.contentCollection,
      verbose: false,
      // Will be updated by setVerbose() if needed
      model: options.defaultModelOptions?.model,
      provider: options.defaultModelOptions?.provider,
      modelOptions: options.defaultModelOptions
    };
    this.modelOptions = options.defaultModelOptions;
    this.scanner = options.scanner ?? new ContentScanner(rootDir, options.contentCollection);
    this._db = options.database ?? new ContentDatabaseHandler(this.dbPath);
    if (options.ai) {
      this.ai = options.ai;
    } else {
      let aiScorerOptions = {};
      if (options.aiOptions) {
        aiScorerOptions = options.aiOptions;
      } else if (options.defaultModelOptions) {
        const gooseAI = new GooseAI(rootDir, options.defaultModelOptions, this.logger);
        aiScorerOptions = { ai: gooseAI };
      } else {
        const gooseAI = new GooseAI(rootDir, {}, this.logger);
        aiScorerOptions = { ai: gooseAI };
      }
      this.ai = new AIScorer(aiScorerOptions);
    }
  }
  /**
   * Get database instance for testing purposes
   * @internal
   */
  get db() {
    return this._db;
  }
  /**
   * Initialize the system
   */
  async initialize() {
    await this._db.load();
  }
  /**
   * Discover and index content without scoring (lightweight operation)
   * Creates database entries for new files with 'needs_review' status
   */
  async discoverContent() {
    const files = await this.scanner.scanContent();
    const database = this._db.getData();
    const newFiles = [];
    for (const file of files) {
      if (!database.entries[file]) {
        const newEntry = {
          path: file,
          currentScores: {
            readability: 0,
            seoScore: 0,
            technicalAccuracy: 0,
            engagement: 0,
            contentDepth: 0
          },
          targetScores: DEFAULT_TARGET_SCORES,
          lastReviewDate: (/* @__PURE__ */ new Date()).toISOString(),
          improvementIterations: 0,
          status: "needs_review",
          // Mark as unreviewed
          reviewHistory: []
        };
        await this._db.updateEntry(file, (_entry) => newEntry);
        newFiles.push(file);
      }
    }
    await this._db.save();
    return newFiles;
  }
  /**
   * Update content index with new files
   */
  async updateContentIndex() {
    const files = await this.scanner.scanContent();
    const database = this._db.getData();
    for (const file of files) {
      if (!database.entries[file]) {
        const content = await this.scanner.readContent(file);
        const scoringResult = await this.ai.scoreContent(content);
        const analysis = scoringResult.analysis;
        const newEntry = {
          path: file,
          currentScores: analysis.scores,
          targetScores: DEFAULT_TARGET_SCORES,
          lastReviewDate: (/* @__PURE__ */ new Date()).toISOString(),
          improvementIterations: 0,
          status: this.determineStatus(analysis.scores),
          reviewHistory: [{
            date: (/* @__PURE__ */ new Date()).toISOString(),
            scores: analysis.scores,
            improvements: []
          }]
        };
        await this._db.updateEntry(file, (_entry) => newEntry);
      }
    }
  }
  /**
   * Get the current database data
   */
  getDatabaseData() {
    return this._db.getData();
  }
  /**
   * Get content that needs review (unreviewed/discovered content)
   * @deprecated Use getContentNeedingReviewDetails() for full content objects
   */
  getContentNeedingReview() {
    if (!this._db.getData().lastUpdated) {
      this.logger.warn("Database not loaded. Call initialize() first.");
    }
    const database = this._db.getData();
    return Object.entries(database.entries || {}).filter(([_, entry]) => entry.status === "needs_review").map(([path4, _]) => path4);
  }
  /**
   * Get detailed content objects that need review
   */
  getContentNeedingReviewDetails() {
    if (!this._db.getData().lastUpdated) {
      this.logger.warn("Database not loaded. Call initialize() first.");
    }
    const database = this._db.getData();
    return Object.entries(database.entries || {}).filter(([_, entry]) => entry.status === "needs_review").map(([_, entry]) => entry);
  }
  /**
   * Get content entries by status
   */
  getContentByStatus(status) {
    if (!this._db.getData().lastUpdated) {
      this.logger.warn("Database not loaded. Call initialize() first.");
    }
    const database = this._db.getData();
    return Object.entries(database.entries || {}).filter(([_, entry]) => entry.status === status).map(([_, entry]) => entry);
  }
  /**
   * Review/score a specific content file
   * This is a convenience method that delegates to batch processing with a single item
   */
  async reviewContent(path4) {
    const result = await this.reviewContentBatch([path4], 1);
    if (result.failed.length > 0) {
      throw new Error(result.failed[0].error);
    }
  }
  /**
   * Get the entry with the lowest average score (excludes unreviewed content)
   */
  getWorstScoringContent() {
    const database = this._db.getData();
    let worstScore = Infinity;
    let worstPath = null;
    for (const [path4, entry] of Object.entries(database.entries)) {
      if (entry.status === "meets_targets" || entry.status === "needs_review") continue;
      const avgScore = Object.values(entry.currentScores).reduce((a, b) => a + b, 0) / Object.keys(entry.currentScores).length;
      if (avgScore === 0) continue;
      if (avgScore < worstScore) {
        worstScore = avgScore;
        worstPath = path4;
      }
    }
    return worstPath;
  }
  /**
   * Improve content at the specified path
   * This is a convenience method that delegates to batch processing with a single item
   */
  async improveContent(filePath) {
    const result = await this.improveContentBatch([filePath], 1);
    if (result.failed.length > 0) {
      throw new Error(result.failed[0].error);
    }
  }
  /**
   * Determine content status based on scores
   */
  determineStatus(scores) {
    const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length;
    if (avgScore >= 8.5) return "meets_targets";
    if (avgScore >= 7) return "needs_improvement";
    return "needs_review";
  }
  /**
   * Set verbose logging for progress reporting
   */
  setVerbose(verbose) {
    this.verbose = verbose;
    this.logger.setVerbose(verbose);
    this.config.verbose = verbose;
  }
  /**
   * Get current verbose setting
   */
  isVerbose() {
    return this.verbose;
  }
  /**
   * Get current model options being used
   */
  getModelOptions() {
    return this.modelOptions;
  }
  /**
   * Log message using structured logger
   * @param message - The message to log
   * @param level - Log level: 'always' (always log), 'verbose' (only when verbose), 'debug' (extra detail)
   */
  log(message, level = "verbose") {
    switch (level) {
      case "always":
        this.logger.always(message);
        break;
      case "verbose":
        this.logger.verbose(message);
        break;
      case "debug":
        this.logger.debug(message);
        break;
    }
  }
  // ========== BATCH PROCESSING METHODS ==========
  /**
   * Review multiple files in batch with optimized AI operations
   */
  async reviewContentBatch(filePaths, batchSize = 5) {
    const startTime = Date.now();
    this.log(`\u{1F4CA} Starting batch review of ${filePaths.length} files (batch size: ${batchSize})`, "always");
    await this.initialize();
    const successful = [];
    const failed = [];
    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(filePaths.length / batchSize);
      this.log(`\u{1F4E6} Processing batch ${batchNumber}/${totalBatches} (${batch.length} files)`, "always");
      const batchPromises = batch.map(async (filePath) => {
        try {
          this.log(`\u{1F4CA} Reviewing ${path3.basename(filePath)}`, "verbose");
          const database = this._db.getData();
          const entry = database.entries[filePath];
          if (!entry) {
            throw new Error(`Content not found: ${filePath}`);
          }
          if (entry.status !== "needs_review") {
            throw new Error(`Content has already been reviewed: ${filePath}`);
          }
          const content = await this.scanner.readContent(filePath);
          const analysis = await this.ai.scoreContent(content);
          const updatedEntry = {
            ...entry,
            currentScores: analysis.analysis.scores,
            lastReviewDate: (/* @__PURE__ */ new Date()).toISOString(),
            status: this.determineStatus(analysis.analysis.scores),
            reviewHistory: [{
              date: (/* @__PURE__ */ new Date()).toISOString(),
              scores: analysis.analysis.scores,
              improvements: []
            }]
          };
          await this._db.updateEntry(filePath, () => updatedEntry);
          await this._db.save();
          return { path: filePath, success: true };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.log(`\u274C Failed to review ${path3.basename(filePath)}: ${errorMessage}`, "always");
          return { path: filePath, success: false, error: errorMessage };
        }
      });
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach((result) => {
        if (result.success) {
          successful.push(result.path);
          this.log(`\u2705 Reviewed: ${path3.basename(result.path)}`, "verbose");
        } else {
          failed.push({ path: result.path, error: result.error || "Unknown error" });
        }
      });
      if (i + batchSize < filePaths.length) {
        this.log("\u23F8\uFE0F  Pausing between batches...", "debug");
        await new Promise((resolve) => setTimeout(resolve, 1e3));
      }
    }
    const duration = Date.now() - startTime;
    this.log(`\u{1F389} Batch review completed: ${successful.length} succeeded, ${failed.length} failed`, "always");
    if (this.verbose) {
      this.log(`   \u23F1\uFE0F  Total time: ${duration}ms (${Math.round(duration / 1e3 * 10) / 10}s)`);
      this.log(`   \u26A1 Average time per file: ${Math.round(duration / filePaths.length)}ms`);
      this.log(`   \u{1F4E6} Files per batch: ${batchSize}`);
    }
    return {
      successful,
      failed,
      summary: {
        total: filePaths.length,
        succeeded: successful.length,
        failed: failed.length,
        duration
      }
    };
  }
  /**
   * Improve multiple files in batch
   */
  async improveContentBatch(filePaths, batchSize = 3) {
    const startTime = Date.now();
    this.log(`\u{1F680} Starting batch improvement of ${filePaths.length} files (batch size: ${batchSize})`, "always");
    await this.initialize();
    const successful = [];
    const failed = [];
    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(filePaths.length / batchSize);
      this.log(`\u{1F4E6} Processing improvement batch ${batchNumber}/${totalBatches} (${batch.length} files)`, "always");
      const batchPromises = batch.map(async (filePath) => {
        try {
          this.log(`\u{1F4DD} Improving ${path3.basename(filePath)}`, "verbose");
          await this._db.load();
          const database = this._db.getData();
          this.logger.debug(`\u{1F50D} Looking for entry with path: ${filePath}`);
          this.logger.debug(`\u{1F50D} Available database entries: ${Object.keys(database.entries).join(", ")}`);
          let entry = database.entries[filePath];
          if (!entry) {
            const absolutePath = path3.resolve(this.rootDir, filePath);
            this.logger.debug(`\u{1F50D} Trying absolute path: ${absolutePath}`);
            entry = database.entries[absolutePath];
          }
          if (!entry) {
            throw new Error(`No content found at path: ${filePath}. Available paths: ${Object.keys(database.entries).join(", ")}`);
          }
          const absoluteFilePath = entry.path;
          this.logger.debug(`\u{1F50D} Using absolute path from entry: ${absoluteFilePath}`);
          const content = await this.scanner.readContent(absoluteFilePath);
          const analysis = await this.ai.scoreContent(content);
          this.logger.info(`\u{1F4DD} Attempting to improve content with ${content.length} characters...`);
          const improveOptions = await this.getWorkflowModelOptions("improve");
          const response = await this.ai.improveContent(content, analysis.analysis, improveOptions);
          const improvedContent = response.content;
          this.logger.info(`\u2705 Content improvement successful, got ${improvedContent.length} characters back`);
          if (improvedContent === content) {
            this.logger.warn("\u26A0\uFE0F  Warning: Improved content is identical to original");
          }
          const newScoringResult = await this.ai.scoreContent(improvedContent);
          const newAnalysis = newScoringResult.analysis;
          try {
            if (!path3.isAbsolute(absoluteFilePath)) {
              throw new Error(`Expected absolute path from database entry, but got relative path: ${absoluteFilePath}`);
            }
            this.logger.debug(`\u{1F50D} Writing improved content to: ${absoluteFilePath}`);
            await fs3.writeFile(absoluteFilePath, improvedContent, "utf-8");
            this.logger.info(`\u{1F4C4} Successfully wrote improved content to ${absoluteFilePath}`);
          } catch (writeError) {
            const errorMessage = writeError instanceof Error ? writeError.message : String(writeError);
            this.logger.error(`\u274C Failed to write improved content to file: ${errorMessage}`);
            throw writeError;
          }
          const databaseKey = Object.keys(database.entries).find((key) => database.entries[key] === entry);
          if (!databaseKey) {
            throw new Error(`Could not find database key for entry with path: ${absoluteFilePath}`);
          }
          await this._db.updateEntry(databaseKey, (entry2) => {
            if (!entry2) {
              throw new Error(`Entry not found for path: ${databaseKey}`);
            }
            return {
              ...entry2,
              currentScores: newAnalysis.scores,
              lastReviewDate: (/* @__PURE__ */ new Date()).toISOString(),
              improvementIterations: entry2.improvementIterations + 1,
              status: this.determineStatus(newAnalysis.scores),
              reviewHistory: [
                ...entry2.reviewHistory,
                {
                  date: (/* @__PURE__ */ new Date()).toISOString(),
                  scores: newAnalysis.scores,
                  improvements: Object.values(analysis.analysis).flatMap((a) => a.suggestions)
                }
              ]
            };
          });
          return { path: filePath, success: true };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.log(`\u274C Failed to improve ${path3.basename(filePath)}: ${errorMessage}`, "always");
          return { path: filePath, success: false, error: errorMessage };
        }
      });
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach((result) => {
        if (result.success) {
          successful.push(result.path);
          this.log(`\u2705 Improved: ${path3.basename(result.path)}`, "verbose");
        } else {
          failed.push({ path: result.path, error: result.error || "Unknown error" });
        }
      });
      if (i + batchSize < filePaths.length) {
        this.log("\u23F8\uFE0F  Pausing between improvement batches...", "debug");
        await new Promise((resolve) => setTimeout(resolve, 2e3));
      }
    }
    const duration = Date.now() - startTime;
    this.log(`\u{1F389} Batch improvement completed: ${successful.length} succeeded, ${failed.length} failed`, "always");
    if (this.verbose) {
      this.log(`   \u23F1\uFE0F  Total time: ${duration}ms (${Math.round(duration / 1e3 * 10) / 10}s)`);
      this.log(`   \u26A1 Average time per file: ${Math.round(duration / filePaths.length)}ms`);
      this.log(`   \u{1F4E6} Files per batch: ${batchSize}`);
    }
    return {
      successful,
      failed,
      summary: {
        total: filePaths.length,
        succeeded: successful.length,
        failed: failed.length,
        duration
      }
    };
  }
  /**
   * Review all content using batch processing for better performance
   */
  async reviewAllBatch(batchSize = 5) {
    const startTime = Date.now();
    const reviewOptions = await this.getWorkflowModelOptions("review");
    const modelInfo = reviewOptions ? `${reviewOptions.provider || "default"}${reviewOptions.model ? `/${reviewOptions.model}` : ""}` : "default";
    this.log(`\u{1F4CA} Starting batch content review using ${modelInfo}...`, "always");
    await this.initialize();
    const database = this._db.getData();
    const allEntries = Object.entries(database.entries || {});
    const contentNeedingReview = allEntries.filter(([, entry]) => entry.status === "needs_review").map(([path4]) => path4);
    if (contentNeedingReview.length === 0) {
      this.log("\u2705 No content needs review", "always");
      return {
        successful: [],
        failed: [],
        summary: { total: 0, succeeded: 0, failed: 0, duration: Date.now() - startTime }
      };
    }
    this.log(`\u{1F4DD} Found ${contentNeedingReview.length} files needing review`, "always");
    this.log(`\u{1F4E6} Using batch size: ${batchSize}`, "verbose");
    const result = await this.reviewContentBatch(contentNeedingReview, batchSize);
    result.summary.duration = Date.now() - startTime;
    return result;
  }
  /**
   * Improve worst-scoring content using batch processing
   */
  async improveWorstBatch(count = 5, batchSize = 3) {
    const startTime = Date.now();
    this.log(`\u{1F680} Starting batch improvement of ${count} worst-scoring content (batch size: ${batchSize})...`, "always");
    await this.initialize();
    const database = this._db.getData();
    const worstFiles = [];
    const entries = Object.entries(database.entries);
    const scoredEntries = entries.filter(([, entry]) => entry.status !== "needs_review" && entry.status !== "meets_targets").map(([path4, entry]) => {
      const scores = Object.values(entry.currentScores);
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      return { path: path4, avgScore, entry };
    }).filter(({ avgScore }) => avgScore > 0).sort((a, b) => a.avgScore - b.avgScore);
    for (let i = 0; i < Math.min(count, scoredEntries.length); i++) {
      worstFiles.push(scoredEntries[i].path);
    }
    if (worstFiles.length === 0) {
      this.log("\u2705 No content needs improvement", "always");
      return {
        successful: [],
        failed: [],
        summary: { total: 0, succeeded: 0, failed: 0, duration: Date.now() - startTime }
      };
    }
    this.log(`\u{1F4CB} Selected ${worstFiles.length} files for improvement:`, "verbose");
    worstFiles.forEach((file, index) => {
      const entry = scoredEntries.find((e) => e.path === file);
      this.log(`   ${index + 1}. ${path3.basename(file)} (score: ${entry?.avgScore.toFixed(1)})`, "verbose");
    });
    const result = await this.improveContentBatch(worstFiles, batchSize);
    result.summary.duration = Date.now() - startTime;
    return result;
  }
  // ========== HIGH-LEVEL WORKFLOW METHODS ==========
  /**
   * Discover content and provide detailed reporting
   */
  async discoverAndReport() {
    const startTime = Date.now();
    this.log("\u{1F50D} Starting content discovery...");
    try {
      const discovered = await this.discoverContent();
      const duration = Date.now() - startTime;
      this.log(`\u{1F4CA} Discovery completed: ${discovered.length} files found`);
      if (discovered.length > 0) {
        discovered.forEach((file) => this.log(`  \u{1F4C4} ${path3.basename(file)}`));
      }
      return {
        successful: discovered,
        failed: [],
        summary: {
          total: discovered.length,
          succeeded: discovered.length,
          failed: 0,
          duration
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`\u274C Discovery failed: ${errorMessage}`);
      return {
        successful: [],
        failed: [{ path: "discovery", error: errorMessage }],
        summary: {
          total: 0,
          succeeded: 0,
          failed: 1,
          duration: Date.now() - startTime
        }
      };
    }
  }
  /**
   * Review all content that needs review
   */
  async reviewAll() {
    const startTime = Date.now();
    this.log("\u{1F4CA} Starting content review...", "always");
    if (this.verbose) {
      this.log("\u{1F527} Configuration Details:");
      this.log(`   Root Directory: ${this.rootDir}`);
      this.log(`   Database Path: ${this.dbPath}`);
      this.log(`   Content Collection: ${this.config.contentCollection || "auto-detected"}`);
      this.log(`   Model: ${this.config.model || "default"}`);
      this.log(`   Provider: ${this.config.provider || "default"}`);
      this.log(`   Verbose Mode: ${this.verbose ? "\u2713 enabled" : "\u2717 disabled"}`);
      this.log("");
    }
    await this.initialize();
    const database = this._db.getData();
    this.log("\u{1F4CB} Database Status:", "always");
    this.log(`   Total entries: ${Object.keys(database.entries || {}).length}`, "always");
    this.log(`   Last updated: ${database.lastUpdated || "never"}`, "always");
    const allEntries = Object.entries(database.entries || {});
    const statusCounts = allEntries.reduce((counts, [, entry]) => {
      counts[entry.status] = (counts[entry.status] || 0) + 1;
      return counts;
    }, {});
    this.log("   Status breakdown:", "always");
    Object.entries(statusCounts).forEach(([status, count]) => {
      this.log(`     ${status}: ${count}`, "always");
    });
    this.log("", "always");
    const contentNeedingReview = allEntries.filter(([, entry]) => entry.status === "needs_review").map(([path4]) => path4);
    if (contentNeedingReview.length === 0) {
      this.log("\u2705 No content needs review", "always");
      return {
        successful: [],
        failed: [],
        summary: { total: 0, succeeded: 0, failed: 0, duration: Date.now() - startTime }
      };
    }
    this.log(`\u{1F4DD} Found ${contentNeedingReview.length} files needing review`, "always");
    if (this.verbose) {
      this.log("\u{1F4C2} Files to review:");
      contentNeedingReview.forEach((filePath, index) => {
        this.log(`   ${index + 1}. ${path3.basename(filePath)}`);
      });
      this.log("");
    }
    const successful = [];
    const failed = [];
    let totalFileSize = 0;
    let totalScoreTime = 0;
    for (let i = 0; i < contentNeedingReview.length; i++) {
      const filePath = contentNeedingReview[i];
      const fileStartTime = Date.now();
      try {
        this.log(`\u{1F4CA} Reviewing ${path3.basename(filePath)} (${i + 1}/${contentNeedingReview.length})`, "always");
        if (this.verbose) {
          try {
            const fs4 = await import("fs/promises");
            const stats = await fs4.stat(filePath);
            const fileSize = Math.round(stats.size / 1024 * 10) / 10;
            totalFileSize += stats.size;
            this.log(`   \u{1F4C4} File size: ${fileSize} KB`, "debug");
            this.log(`   \u{1F4C5} Last modified: ${stats.mtime.toISOString()}`, "debug");
          } catch (statError) {
            this.log(`   \u26A0\uFE0F Could not read file stats: ${statError}`, "debug");
          }
        }
        const reviewStartTime = Date.now();
        await this.reviewContent(filePath);
        const reviewDuration = Date.now() - reviewStartTime;
        totalScoreTime += reviewDuration;
        const updatedDatabase = this._db.getData();
        const updatedEntry = updatedDatabase.entries[filePath];
        successful.push(filePath);
        const fileDuration = Date.now() - fileStartTime;
        this.log(`\u2705 Reviewed: ${path3.basename(filePath)} (${fileDuration}ms)`, "always");
        if (this.verbose && updatedEntry) {
          this.log("   \u{1F4CA} Quality Scores:");
          this.log(`      Readability: ${updatedEntry.currentScores.readability}/10`);
          this.log(`      SEO Score: ${updatedEntry.currentScores.seoScore}/10`);
          this.log(`      Technical Accuracy: ${updatedEntry.currentScores.technicalAccuracy}/10`);
          this.log(`      Engagement: ${updatedEntry.currentScores.engagement}/10`);
          this.log(`      Content Depth: ${updatedEntry.currentScores.contentDepth}/10`);
          const avgScore = Object.values(updatedEntry.currentScores).reduce((a, b) => a + b, 0) / 5;
          this.log(`   \u{1F3AF} Average Score: ${Math.round(avgScore * 10) / 10}/10`);
          this.log(`   \u23F1\uFE0F Review Time: ${reviewDuration}ms`, "debug");
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        failed.push({ path: filePath, error: errorMessage });
        const fileDuration = Date.now() - fileStartTime;
        this.log(`\u274C Failed to review ${path3.basename(filePath)} (${fileDuration}ms): ${errorMessage}`, "always");
        if (this.verbose) {
          this.log(`   \u{1F50D} Error details: ${error instanceof Error ? error.stack : errorMessage}`, "debug");
        }
      }
      const progress = Math.round((i + 1) / contentNeedingReview.length * 100);
      if (this.verbose) {
        this.log(`   \u{1F4C8} Progress: ${progress}% (${i + 1}/${contentNeedingReview.length})`, "debug");
        this.log("", "debug");
      }
    }
    const duration = Date.now() - startTime;
    this.log(`\u{1F389} Review completed: ${successful.length} succeeded, ${failed.length} failed`, "always");
    if (this.verbose) {
      this.log("\u{1F4CA} Summary Statistics:");
      this.log(`   \u23F1\uFE0F Total time: ${duration}ms (${Math.round(duration / 1e3 * 10) / 10}s)`);
      this.log(`   \u{1F4C4} Total file size: ${Math.round(totalFileSize / 1024 * 10) / 10} KB`);
      this.log(`   \u{1F916} Total scoring time: ${totalScoreTime}ms`);
      this.log(`   \u26A1 Average time per file: ${Math.round(duration / contentNeedingReview.length)}ms`);
      if (successful.length > 0) {
        this.log(`   \u2705 Success rate: ${Math.round(successful.length / contentNeedingReview.length * 100)}%`);
      }
      if (failed.length > 0) {
        this.log("   \u274C Failed files:");
        failed.forEach(({ path: filePath, error }) => {
          this.log(`      ${path3.basename(filePath)}: ${error}`);
        });
      }
    }
    return {
      successful,
      failed,
      summary: {
        total: contentNeedingReview.length,
        succeeded: successful.length,
        failed: failed.length,
        duration
      }
    };
  }
  /**
   * Improve the worst-scoring content
   */
  async improveWorst(count = 1) {
    const startTime = Date.now();
    this.log(`\u{1F680} Starting improvement of ${count} worst-scoring content...`);
    await this.initialize();
    const successful = [];
    const failed = [];
    for (let i = 0; i < count; i++) {
      try {
        const worstPath = this.getWorstScoringContent();
        if (!worstPath) {
          this.log("\u2705 No content needs improvement");
          break;
        }
        this.log(`\u{1F4DD} Improving ${path3.basename(worstPath)} (${i + 1}/${count})`);
        await this.improveContent(worstPath);
        successful.push(worstPath);
        this.log(`\u2705 Improved: ${path3.basename(worstPath)}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        failed.push({ path: "improvement", error: errorMessage });
        this.log(`\u274C Improvement failed: ${errorMessage}`);
      }
    }
    const duration = Date.now() - startTime;
    this.log(`\u{1F389} Improvement completed: ${successful.length} succeeded, ${failed.length} failed`);
    return {
      successful,
      failed,
      summary: {
        total: count,
        succeeded: successful.length,
        failed: failed.length,
        duration
      }
    };
  }
  /**
   * Run the complete workflow: discover -> review -> improve
   */
  async runFullWorkflow(options = {}) {
    this.log("\u{1F3AD} Starting complete Shakespeare workflow...");
    const discovery = await this.discoverAndReport();
    const review = await this.reviewAll();
    const improvement = await this.improveWorst(options.improveCount || 1);
    this.log("\u{1F389} Complete workflow finished!");
    return {
      discovery,
      review,
      improvement
    };
  }
  /**
   * Get content health status dashboard
   */
  async getStatus() {
    await this.initialize();
    const database = this._db.getData();
    const entries = Object.entries(database.entries);
    const needsReview = entries.filter(([, entry]) => entry.status === "needs_review").length;
    const needsImprovement = entries.filter(([, entry]) => entry.status === "needs_improvement").length;
    const meetsTargets = entries.filter(([, entry]) => entry.status === "meets_targets").length;
    const scores = entries.map(([, entry]) => {
      const scores2 = Object.values(entry.currentScores || {});
      return scores2.reduce((a, b) => a + b, 0) / scores2.length;
    }).filter((score) => !isNaN(score));
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const worstScoring = this.getWorstScoringContent();
    return {
      totalFiles: entries.length,
      needsReview,
      needsImprovement,
      meetsTargets,
      averageScore: Math.round(averageScore * 10) / 10,
      worstScoring
    };
  }
  // ========== STATIC FACTORY METHODS ==========
  /**
   * Create Shakespeare instance with smart defaults and auto-detection
   * @param rootDir - The root directory to operate in
   * @param config - Configuration options
   */
  static async create(rootDir, config = {}) {
    const dbPath = config.dbPath;
    const detectedType = await detectProjectType(rootDir);
    const contentCollection = config.contentCollection || detectedType;
    const defaultModelOptions = getOptimizedModelOptions(config);
    const options = {
      contentCollection,
      defaultModelOptions
    };
    const shakespeare = new _Shakespeare(rootDir, dbPath, options);
    shakespeare.config = {
      ...shakespeare.config,
      ...config,
      contentCollection,
      model: defaultModelOptions?.model || config.model,
      provider: defaultModelOptions?.provider || config.provider,
      modelOptions: defaultModelOptions
    };
    if (config.verbose) {
      shakespeare.setVerbose(true);
    }
    if (config.logLevel) {
      shakespeare.logger.setLevel(config.logLevel);
    }
    return shakespeare;
  }
  /**
   * Create Shakespeare from configuration file or database config
   */
  static async fromConfig(configPath) {
    const { join: join2, dirname, resolve } = await import("path");
    const { existsSync: existsSync2, readFileSync } = await import("fs");
    const cwd = process.cwd();
    const possiblePaths = [
      configPath,
      join2(cwd, ".shakespeare", "config.json"),
      join2(cwd, "shakespeare.config.js"),
      join2(cwd, "shakespeare.config.mjs"),
      join2(cwd, "shakespeare.config.json"),
      join2(cwd, ".shakespeare.json")
    ].filter(Boolean);
    for (const configFile of possiblePaths) {
      try {
        if (existsSync2(configFile)) {
          let config;
          if (configFile.endsWith(".json")) {
            config = JSON.parse(readFileSync(configFile, "utf-8"));
          } else {
            const configModule = await import(configFile);
            config = configModule.default || configModule;
          }
          try {
            const normalizedConfig = await this.workflowConfigToShakespeareConfig(config);
            let configDir = dirname(resolve(configFile));
            if (configFile.includes(".shakespeare")) {
              configDir = dirname(configDir);
            }
            if (normalizedConfig.dbPath) {
              normalizedConfig.dbPath = resolve(configDir, normalizedConfig.dbPath);
            }
            const shakespeare = await _Shakespeare.create(configDir, normalizedConfig);
            return shakespeare;
          } catch (error) {
            if (error instanceof InvalidConfigError) {
              new ShakespeareLogger().error(`Failed to load config from ${configFile}: ${error.message}`);
              throw error;
            }
            throw error;
          }
        }
      } catch (error) {
        if (error instanceof InvalidConfigError) {
          throw error;
        }
        new ShakespeareLogger().warn(`Failed to load config from ${configFile}: ${error}`);
      }
    }
    try {
      const dbPath = join2(cwd, ".shakespeare", "content-db.json");
      if (existsSync2(dbPath)) {
        const db = JSON.parse(readFileSync(dbPath, "utf-8"));
        if (db.config) {
          try {
            const normalizedConfig = await this.workflowConfigToShakespeareConfig(db.config);
            const shakespeare = await _Shakespeare.create(cwd, normalizedConfig);
            return shakespeare;
          } catch (error) {
            if (error instanceof InvalidConfigError) {
              new ShakespeareLogger().error(`Failed to load config from database: ${error.message}`);
              throw error;
            }
            throw error;
          }
        }
      }
    } catch (error) {
      new ShakespeareLogger().warn(`Failed to load config from database: ${error}`);
    }
    return await _Shakespeare.create(cwd);
  }
  /**
   * Convert ShakespeareConfig to ShakespeareConfig
   */
  static async workflowConfigToShakespeareConfig(workflowConfig) {
    const config = {
      verbose: workflowConfig.verbose,
      logLevel: workflowConfig.logLevel
    };
    if (workflowConfig.contentCollection) {
      config.contentCollection = workflowConfig.contentCollection;
    }
    Object.keys(workflowConfig).forEach((key) => {
      if (!["verbose", "logLevel", "contentCollection"].includes(key)) {
        config[key] = workflowConfig[key];
      }
    });
    if (!config.model && workflowConfig.models?.review) {
      const reviewModel = workflowConfig.models.review;
      if (typeof reviewModel === "string") {
        config.model = reviewModel;
      } else {
        config.model = reviewModel.model;
        if (reviewModel.provider && !config.provider) {
          config.provider = reviewModel.provider;
        }
      }
    }
    if (config.model) {
      config.modelOptions = {
        model: config.model,
        provider: config.provider
      };
    }
    return config;
  }
  // ========== WORKFLOW CONFIGURATION METHODS ==========
  /**
   * Save workflow configuration to the content database
   */
  async saveShakespeareConfig(workflowConfig) {
    await this._db.load();
    const currentData = this._db.getData();
    currentData.config = workflowConfig;
    await this._db.save();
    this.log("\u{1F4BE} Workflow configuration saved to content database");
  }
  /**
   * Get current workflow configuration from database
   */
  async getShakespeareConfig() {
    await this._db.load();
    return this._db.getData().config;
  }
  /**
   * Get model information as a formatted string for display
   */
  async getModelInfoString(workflowType) {
    const modelOptions = await this.getWorkflowModelOptions(workflowType);
    if (!modelOptions) return "default";
    const provider = modelOptions.provider || "default";
    const model = modelOptions.model ? `/${modelOptions.model}` : "";
    return `${provider}${model}`;
  }
  /**
   * Get workflow-specific model options for an operation type
   */
  async getWorkflowModelOptions(workflowType) {
    if (this.config.taskModelOptions?.[workflowType]) {
      return this.config.taskModelOptions[workflowType];
    }
    const modelConfig = this.config.models?.[workflowType];
    if (modelConfig) {
      if (typeof modelConfig === "string") {
        return { model: modelConfig };
      } else {
        return {
          model: modelConfig.model,
          provider: modelConfig.provider
        };
      }
    }
    const defaults = {
      review: { model: "gpt-4o-mini", provider: "tetrate" },
      // Fast, cost-effective for scoring
      improve: { model: "claude-3-5-sonnet-latest", provider: "tetrate" },
      // Higher quality for content improvement
      generate: { model: "claude-3-5-sonnet-latest", provider: "tetrate" }
      // Higher quality for content generation
    };
    return defaults[workflowType];
  }
};
function createShakespeare(rootDir, dbPath, options) {
  return new Shakespeare(rootDir, dbPath, options);
}
async function detectProjectType(rootDir) {
  try {
    const { existsSync: existsSync2 } = await import("fs");
    const { join: join2 } = await import("path");
    if (existsSync2(join2(rootDir, "astro.config.mjs")) || existsSync2(join2(rootDir, "astro.config.js")) || existsSync2(join2(rootDir, "src/content"))) {
      return "astro";
    }
    if (existsSync2(join2(rootDir, "next.config.js")) || existsSync2(join2(rootDir, "next.config.mjs"))) {
      return "nextjs";
    }
    if (existsSync2(join2(rootDir, "gatsby-config.js")) || existsSync2(join2(rootDir, "gatsby-config.ts"))) {
      return "gatsby";
    }
    return "custom";
  } catch {
    return "custom";
  }
}
function getOptimizedModelOptions(config) {
  if (config.modelOptions) return config.modelOptions;
  if (config.model || config.provider) {
    return {
      provider: config.provider,
      model: config.model
    };
  }
  if (config.costOptimized) {
    return {
      provider: "google",
      model: "gemini-1.5-flash"
    };
  }
  if (config.qualityFirst) {
    return {
      provider: "anthropic",
      model: "claude-3-5-sonnet"
    };
  }
  return void 0;
}
var ShakespeareFactory = {
  /** Create Shakespeare for Astro projects with content collections */
  forAstro: (rootDir, dbPath, options = {}) => new Shakespeare(rootDir, dbPath, { ...options, contentCollection: "astro" }),
  /** Create Shakespeare for Next.js projects */
  forNextJS: (rootDir, dbPath, options = {}) => new Shakespeare(rootDir, dbPath, { ...options, contentCollection: "nextjs" }),
  /** Create Shakespeare for Gatsby projects */
  forGatsby: (rootDir, dbPath, options = {}) => new Shakespeare(rootDir, dbPath, { ...options, contentCollection: "gatsby" }),
  /** Create Shakespeare with custom content collection configuration */
  forCustom: (contentConfig, rootDir, dbPath, options = {}) => new Shakespeare(rootDir, dbPath, { ...options, contentCollection: contentConfig }),
  /** Create cost-optimized Shakespeare with specific model configuration */
  withCostOptimization: (modelOptions, rootDir, dbPath, options = {}) => new Shakespeare(rootDir, dbPath, { ...options, defaultModelOptions: modelOptions })
};
export {
  AIScorer,
  CONTENT_COLLECTIONS,
  GooseAI,
  SHAKESPEARE_CONFIG_SCHEMA,
  SchemaValidationError,
  Shakespeare,
  ShakespeareFactory,
  SimpleJSONSchemaValidator,
  createShakespeare,
  validateConfigSchema,
  validateConfigSchemaStrict
};
//# sourceMappingURL=index.js.map
