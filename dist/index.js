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
  constructor(cwd = process.cwd(), defaultOptions = {}) {
    this.gooseCommand = "goose";
    this.cwd = cwd;
    this.defaultOptions = defaultOptions;
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
    const args = ["run", "--no-session", "--quiet", "--text", prompt];
    if (finalOptions.provider) {
      args.splice(-1, 0, "--provider", finalOptions.provider);
    }
    if (finalOptions.model) {
      args.splice(-1, 0, "--model", finalOptions.model);
    }
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
        if (code !== 0) {
          reject(new Error(`Goose failed with code ${code}: ${error}`));
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
  constructor(options = {}) {
    this.ai = options.ai ?? new GooseAI();
  }
  /**
   * Score content across all quality dimensions
   */
  async scoreContent(content) {
    const analysis = {
      scores: {},
      analysis: {}
    };
    for (const [dimension, promptTemplate] of Object.entries(ANALYSIS_PROMPTS)) {
      const prompt = promptTemplate.replace("{content}", content);
      const result = await this.scoreDimension(content, prompt);
      analysis.scores[dimension] = result.score;
      analysis.analysis[dimension] = {
        reasoning: result.reasoning,
        suggestions: result.suggestions || []
      };
    }
    return analysis;
  }
  /**
   * Score content for a specific dimension
   */
  async scoreDimension(content, prompt) {
    try {
      const response = await this.ai.prompt(prompt);
      return parseGooseResponse(response);
    } catch (error) {
      console.error("Error scoring content:", error);
      return {
        score: 5,
        reasoning: "Error during scoring process",
        suggestions: ["Retry scoring"]
      };
    }
  }
  /**
   * Generate improved content based on analysis
   */
  async improveContent(content, analysis) {
    const response = await this.improveContentWithCosts(content, analysis);
    return response.content;
  }
  /**
   * Enhanced scoring with cost tracking and model selection
   */
  async scoreContentWithCosts(content, strategies) {
    const analysis = {
      scores: {},
      analysis: {}
    };
    const costBreakdown = {};
    let totalCost = 0;
    const defaultStrategies = strategies || [
      { dimension: "readability", preferredModel: { provider: "google", model: "gemini-1.5-flash" } },
      { dimension: "seoScore", preferredModel: { provider: "google", model: "gemini-1.5-flash" } },
      { dimension: "technicalAccuracy", preferredModel: { provider: "groq", model: "llama-3.1-8b" } },
      { dimension: "engagement", preferredModel: { provider: "google", model: "gemini-1.5-flash" } },
      { dimension: "contentDepth", preferredModel: { provider: "groq", model: "llama-3.1-8b" } }
    ];
    for (const strategy of defaultStrategies) {
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
        console.error(`Error scoring ${strategy.dimension}:`, error);
        analysis.scores[strategy.dimension] = 5;
        analysis.analysis[strategy.dimension] = {
          reasoning: "Error during scoring process",
          suggestions: ["Retry scoring"]
        };
      }
    }
    return {
      analysis,
      totalCost,
      costBreakdown
    };
  }
  /**
   * Enhanced content improvement with cost tracking
   */
  async improveContentWithCosts(content, analysis, options) {
    const analysisStr = JSON.stringify(analysis, null, 2);
    const prompt = IMPROVEMENT_PROMPT.replace("{analysis}", analysisStr).replace("{content}", content);
    const finalOptions = options || { provider: "anthropic", model: "claude-3-5-haiku" };
    try {
      if ("promptWithOptions" in this.ai && typeof this.ai.promptWithOptions === "function") {
        const response = await this.ai.promptWithOptions(prompt, finalOptions);
        const sections = response.content.split("\n\n");
        return {
          content: sections[0] || content,
          costInfo: response.costInfo
        };
      } else {
        const responseText = await this.ai.prompt(prompt);
        const sections = responseText.split("\n\n");
        return {
          content: sections[0] || content,
          costInfo: {
            provider: finalOptions.provider || "unknown",
            model: finalOptions.model || "unknown",
            inputTokens: Math.ceil(prompt.length / 4),
            outputTokens: Math.ceil(responseText.length / 4),
            totalCost: 0,
            // Cannot calculate without enhanced AI
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }
        };
      }
    } catch (error) {
      console.error("Error improving content:", error);
      return {
        content,
        costInfo: {
          provider: finalOptions.provider || "unknown",
          model: finalOptions.model || "unknown",
          inputTokens: 0,
          outputTokens: 0,
          totalCost: 0,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      };
    }
  }
  /**
   * Batch scoring for cost optimization
   */
  async scoreContentBatch(contentList, strategies) {
    const results = [];
    for (const content of contentList) {
      const result = await this.scoreContentWithCosts(content, strategies);
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
    const finalOptions = options || { provider: "anthropic", model: "claude-3-5-haiku" };
    return await this.ai.estimateCost(prompt, finalOptions);
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

// src/index.ts
import path3 from "path";
import fs3 from "fs/promises";
var Shakespeare = class {
  constructor(rootDir = process.cwd(), dbPath, options = {}) {
    this.rootDir = rootDir;
    this.dbPath = dbPath ?? path3.join(rootDir, ".shakespeare", "content-db.json");
    this.scanner = options.scanner ?? new ContentScanner(rootDir, options.contentCollection);
    this.db = options.database ?? new ContentDatabaseHandler(this.dbPath);
    this.ai = options.ai ?? new AIScorer();
    const dbDir = path3.dirname(this.dbPath);
    fs3.mkdir(dbDir, { recursive: true }).catch(console.error);
  }
  /**
   * Initialize the system
   */
  async initialize() {
    await this.db.load();
  }
  /**
   * Discover and index content without scoring (lightweight operation)
   * Creates database entries for new files with 'needs_review' status
   */
  async discoverContent() {
    const files = await this.scanner.scanContent();
    const database = this.db.getData();
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
        await this.db.updateEntry(file, (_entry) => newEntry);
        newFiles.push(file);
      }
    }
    await this.db.save();
    return newFiles;
  }
  /**
   * Update content index with new files
   */
  async updateContentIndex() {
    const files = await this.scanner.scanContent();
    const database = this.db.getData();
    for (const file of files) {
      if (!database.entries[file]) {
        const content = await this.scanner.readContent(file);
        const analysis = await this.ai.scoreContent(content);
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
        await this.db.updateEntry(file, (_entry) => newEntry);
      }
    }
  }
  /**
   * Get the current database data
   */
  getDatabaseData() {
    return this.db.getData();
  }
  /**
   * Get content that needs review (unreviewed/discovered content)
   */
  getContentNeedingReview() {
    const database = this.db.getData();
    return Object.entries(database.entries).filter(([_, entry]) => entry.status === "needs_review").map(([path4, _]) => path4);
  }
  /**
   * Review/score a specific content file
   */
  async reviewContent(path4) {
    const database = this.db.getData();
    const entry = database.entries[path4];
    if (!entry) {
      throw new Error(`Content not found: ${path4}`);
    }
    if (entry.status !== "needs_review") {
      throw new Error(`Content has already been reviewed: ${path4}`);
    }
    const content = await this.scanner.readContent(path4);
    const analysis = await this.ai.scoreContent(content);
    const updatedEntry = {
      ...entry,
      currentScores: analysis.scores,
      lastReviewDate: (/* @__PURE__ */ new Date()).toISOString(),
      status: this.determineStatus(analysis.scores),
      reviewHistory: [{
        date: (/* @__PURE__ */ new Date()).toISOString(),
        scores: analysis.scores,
        improvements: []
      }]
    };
    await this.db.updateEntry(path4, () => updatedEntry);
    await this.db.save();
  }
  /**
   * Get the entry with the lowest average score (excludes unreviewed content)
   */
  getWorstScoringContent() {
    const database = this.db.getData();
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
   */
  async improveContent(path4) {
    const database = this.db.getData();
    const entry = database.entries[path4];
    if (!entry) {
      throw new Error(`No content found at path: ${path4}`);
    }
    const content = await this.scanner.readContent(path4);
    const analysis = await this.ai.scoreContent(content);
    const improvedContent = await this.ai.improveContent(content, analysis);
    const newAnalysis = await this.ai.scoreContent(improvedContent);
    await fs3.writeFile(path4, improvedContent, "utf-8");
    await this.db.updateEntry(path4, (entry2) => {
      if (!entry2) {
        throw new Error(`Entry not found for path: ${path4}`);
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
};
function createShakespeare(rootDir, dbPath, options) {
  return new Shakespeare(rootDir, dbPath, options);
}
var ShakespeareFactory = {
  /** Create Shakespeare for Astro projects with content collections */
  forAstro: (rootDir, dbPath, options = {}) => new Shakespeare(rootDir, dbPath, { ...options, contentCollection: "astro" }),
  /** Create Shakespeare for Next.js projects */
  forNextJS: (rootDir, dbPath, options = {}) => new Shakespeare(rootDir, dbPath, { ...options, contentCollection: "nextjs" }),
  /** Create Shakespeare for Gatsby projects */
  forGatsby: (rootDir, dbPath, options = {}) => new Shakespeare(rootDir, dbPath, { ...options, contentCollection: "gatsby" }),
  /** Create Shakespeare with custom content collection configuration */
  forCustom: (contentConfig, rootDir, dbPath, options = {}) => new Shakespeare(rootDir, dbPath, { ...options, contentCollection: contentConfig })
};
export {
  CONTENT_COLLECTIONS,
  Shakespeare,
  ShakespeareFactory,
  createShakespeare
};
//# sourceMappingURL=index.js.map
