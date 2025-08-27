import { IAI, IContentScanner, IContentDatabase, IContentScorer, AIModelOptions, AIResponse, ScoringStrategy, EnhancedAIContentAnalysis } from '@/types/interfaces';
import { ContentDatabase, ContentEntry } from '@/types/content';
import { AIContentAnalysis } from '@/utils/ai';

/**
 * Mock AI implementation for testing
 */
export class MockAI implements IAI {
  private responses: string[] = [];
  private responseIndex = 0;

  constructor(responses: string[] = []) {
    this.responses = responses;
  }

  async prompt(prompt: string): Promise<string> {
    if (this.responseIndex >= this.responses.length) {
      return '7.5\nDefault mock response\n- Mock suggestion 1\n- Mock suggestion 2';
    }
    return this.responses[this.responseIndex++];
  }

  async promptWithOptions(prompt: string, options?: AIModelOptions): Promise<AIResponse> {
    const content = await this.prompt(prompt);
    return {
      content,
      costInfo: {
        provider: options?.provider || 'mock',
        model: options?.model || 'test-model',
        inputTokens: Math.ceil(prompt.length / 4),
        outputTokens: Math.ceil(content.length / 4),
        totalCost: 0.001, // Mock cost
        timestamp: new Date().toISOString()
      }
    };
  }

  async estimateCost(prompt: string, options?: AIModelOptions): Promise<number> {
    const inputTokens = Math.ceil(prompt.length / 4);
    return inputTokens * 0.000001; // Mock pricing
  }

  reset(): void {
    this.responseIndex = 0;
  }

  addResponse(response: string): void {
    this.responses.push(response);
  }
}

/**
 * Mock content scanner for testing
 */
export class MockContentScanner implements IContentScanner {
  private files: string[];
  private contentMap: Map<string, string> = new Map();

  constructor(files: string[] = []) {
    this.files = files;
  }

  async scanContent(): Promise<string[]> {
    return this.files;
  }

  async readContent(filePath: string): Promise<string> {
    const content = this.contentMap.get(filePath);
    if (!content) {
      throw new Error(`File not found: ${filePath}`);
    }
    return content;
  }

  setFileContent(filePath: string, content: string): void {
    this.contentMap.set(filePath, content);
  }
}

/**
 * Mock database for testing
 */
export class MockDatabase implements IContentDatabase {
  private data: ContentDatabase = {
    lastUpdated: new Date().toISOString(),
    entries: {}
  };

  async load(): Promise<ContentDatabase> {
    return this.data;
  }

  async save(): Promise<void> {
    this.data.lastUpdated = new Date().toISOString();
  }

  getData(): ContentDatabase {
    return this.data;
  }

  async updateEntry(entryPath: string, updateFn: (entry: ContentEntry | undefined) => ContentEntry): Promise<void> {
    this.data.entries[entryPath] = updateFn(this.data.entries[entryPath]);
    await this.save();
  }

  setData(data: ContentDatabase): void {
    this.data = data;
  }

  clear(): void {
    this.data = {
      lastUpdated: new Date().toISOString(),
      entries: {}
    };
  }
}

/**
 * Mock content scorer for testing - provides realistic scores based on actual content analysis
 */
export class MockContentScorer implements IContentScorer {
  private mockImprovedContent: string;
  private predefinedScores?: any;

  constructor(mockImprovedContentOrConfig: string | any = 'Improved content') {
    if (typeof mockImprovedContentOrConfig === 'string') {
      this.mockImprovedContent = mockImprovedContentOrConfig;
    } else {
      this.mockImprovedContent = 'Improved content';
      this.predefinedScores = mockImprovedContentOrConfig;
    }
  }

  async scoreContent(content: string, strategies?: any): Promise<EnhancedAIContentAnalysis> {
    const scores = this.predefinedScores?.scores || this.analyzeContentQuality(content);
    const analysis = this.predefinedScores?.analysis || {
      readability: { 
        reasoning: this.getReadabilityReasoning(content, scores.readability), 
        suggestions: this.getReadabilitySuggestions(scores.readability)
      },
      seoScore: { 
        reasoning: this.getSEOReasoning(content, scores.seoScore), 
        suggestions: this.getSEOSuggestions(scores.seoScore)
      },
      technicalAccuracy: { 
        reasoning: this.getTechnicalReasoning(content, scores.technicalAccuracy), 
        suggestions: this.getTechnicalSuggestions(scores.technicalAccuracy)
      },
      engagement: { 
        reasoning: this.getEngagementReasoning(content, scores.engagement), 
        suggestions: this.getEngagementSuggestions(scores.engagement)
      },
      contentDepth: { 
        reasoning: this.getDepthReasoning(content, scores.contentDepth), 
        suggestions: this.getDepthSuggestions(scores.contentDepth)
      }
    };

    return { 
      analysis: { scores, analysis },
      totalCost: 0.001,
      costBreakdown: {
        readability: { provider: 'mock', model: 'mock', inputTokens: 100, outputTokens: 50, totalCost: 0.0002, timestamp: new Date().toISOString() },
        seoScore: { provider: 'mock', model: 'mock', inputTokens: 100, outputTokens: 50, totalCost: 0.0002, timestamp: new Date().toISOString() },
        technicalAccuracy: { provider: 'mock', model: 'mock', inputTokens: 100, outputTokens: 50, totalCost: 0.0002, timestamp: new Date().toISOString() },
        engagement: { provider: 'mock', model: 'mock', inputTokens: 100, outputTokens: 50, totalCost: 0.0002, timestamp: new Date().toISOString() },
        contentDepth: { provider: 'mock', model: 'mock', inputTokens: 100, outputTokens: 50, totalCost: 0.0002, timestamp: new Date().toISOString() }
      }
    };
  }

  private analyzeContentQuality(content: string) {
    const words = content.trim().split(/\s+/).length;
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
    const hasHeaders = /^#/.test(content);
    const hasCodeBlocks = /```/.test(content);
    const hasLists = /^\s*[-*+]|\d+\./m.test(content);

    // Readability: based on sentence length and structure
    let readability = Math.min(9, Math.max(1, 8 - (words / sentences - 15) / 5));
    if (hasHeaders) readability += 0.5;
    if (hasLists) readability += 0.3;
    readability = Math.min(10, readability);

    // SEO Score: based on structure and length
    let seoScore = Math.min(8, words / 50); // Base score from word count
    if (hasHeaders) seoScore += 1;
    if (hasLists) seoScore += 0.5;
    if (words < 100) seoScore = Math.max(1, seoScore - 2);
    seoScore = Math.min(10, seoScore);

    // Technical Accuracy: based on content structure and completeness
    let technicalAccuracy = 5; // Base score
    if (hasCodeBlocks) technicalAccuracy += 2;
    if (hasHeaders && paragraphs > 1) technicalAccuracy += 1;
    if (words > 200) technicalAccuracy += 1;
    if (words < 50) technicalAccuracy = Math.max(2, technicalAccuracy - 3);
    technicalAccuracy = Math.min(10, technicalAccuracy);

    // Engagement: based on variety and interactivity
    let engagement = Math.min(7, words / 100); // Base from length
    if (hasHeaders) engagement += 0.5;
    if (hasLists) engagement += 0.5;
    if (hasCodeBlocks) engagement += 1;
    if (words < 50) engagement = Math.max(1, engagement - 3);
    engagement = Math.min(10, engagement);

    // Content Depth: based on length and structure
    let contentDepth = Math.min(6, words / 80);
    if (paragraphs > 2) contentDepth += 1;
    if (hasHeaders) contentDepth += 0.5;
    if (hasCodeBlocks) contentDepth += 1;
    if (words < 50) contentDepth = Math.max(1, contentDepth - 4);
    contentDepth = Math.min(10, contentDepth);

    return {
      readability: Math.round(readability * 10) / 10,
      seoScore: Math.round(seoScore * 10) / 10,
      technicalAccuracy: Math.round(technicalAccuracy * 10) / 10,
      engagement: Math.round(engagement * 10) / 10,
      contentDepth: Math.round(contentDepth * 10) / 10
    };
  }

  private getReadabilityReasoning(content: string, score: number): string {
    const words = content.trim().split(/\s+/).length;
    if (score < 4) return `Very difficult to read. Content is too brief (${words} words) with poor structure.`;
    if (score < 6) return `Below average readability. Content needs better organization and flow.`;
    if (score < 8) return `Good readability with clear structure and appropriate sentence length.`;
    return `Excellent readability with well-structured content and clear presentation.`;
  }

  private getReadabilitySuggestions(score: number): string[] {
    if (score < 6) return ['Add more content and examples', 'Use clearer headings', 'Break up long sentences'];
    return ['Consider adding more examples', 'Use bullet points where appropriate'];
  }

  private getSEOReasoning(content: string, score: number): string {
    const hasHeaders = /^#/.test(content);
    if (score < 4) return `Poor SEO structure. Missing headers and insufficient content length.`;
    if (score < 6) return `Below average SEO. ${hasHeaders ? 'Has headers but' : 'Missing headers and'} needs more content.`;
    if (score < 8) return `Good SEO structure with ${hasHeaders ? 'proper headers and' : ''} adequate content length.`;
    return `Excellent SEO optimization with proper structure and comprehensive content.`;
  }

  private getSEOSuggestions(score: number): string[] {
    if (score < 6) return ['Add descriptive headers', 'Increase content length', 'Use relevant keywords'];
    return ['Optimize meta descriptions', 'Add internal links'];
  }

  private getTechnicalReasoning(content: string, score: number): string {
    const hasCode = /```/.test(content);
    if (score < 4) return `Low technical accuracy. Content is too brief and lacks technical depth.`;
    if (score < 6) return `Fair technical content. ${hasCode ? 'Includes code examples but' : ''} needs more detail.`;
    if (score < 8) return `Good technical accuracy with ${hasCode ? 'code examples and' : ''} solid explanations.`;
    return `Excellent technical accuracy with comprehensive coverage and examples.`;
  }

  private getTechnicalSuggestions(score: number): string[] {
    if (score < 6) return ['Add code examples', 'Provide more technical details', 'Include practical examples'];
    return ['Update to latest standards', 'Add edge case handling'];
  }

  private getEngagementReasoning(content: string, score: number): string {
    const words = content.trim().split(/\s+/).length;
    if (score < 4) return `Poor engagement. Content is too brief (${words} words) with minimal interactive elements.`;
    if (score < 6) return `Below average engagement. Content needs more variety and interactive elements.`;
    if (score < 8) return `Good engagement with varied content structure and adequate length.`;
    return `Excellent engagement with interactive elements and compelling content.`;
  }

  private getEngagementSuggestions(score: number): string[] {
    if (score < 6) return ['Add more interactive elements', 'Use varied content formats', 'Include engaging examples'];
    return ['Add call-to-action elements', 'Include multimedia content'];
  }

  private getDepthReasoning(content: string, score: number): string {
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
    if (score < 4) return `Insufficient content depth. Only ${paragraphs} paragraph${paragraphs === 1 ? '' : 's'} with minimal coverage.`;
    if (score < 6) return `Basic content depth. Covers topics but lacks comprehensive detail.`;
    if (score < 8) return `Good content depth with multiple perspectives and adequate coverage.`;
    return `Excellent content depth with comprehensive coverage and detailed analysis.`;
  }

  private getDepthSuggestions(score: number): string[] {
    if (score < 6) return ['Expand topic coverage', 'Add detailed explanations', 'Include multiple perspectives'];
    return ['Add advanced topics', 'Include case studies'];
  }

  async improveContent(content: string, analysis: AIContentAnalysis, options?: any): Promise<AIResponse> {
    return {
      content: this.mockImprovedContent,
      costInfo: {
        provider: options?.provider || 'mock',
        model: options?.model || 'mock-model',
        inputTokens: 100,
        outputTokens: 50,
        totalCost: 0.001,
        timestamp: new Date().toISOString()
      }
    };
  }

  // Remove scoreContentWithCosts - use scoreContent directly

  // Remove improveContentWithCosts - use improveContent directly

  async scoreContentBatch(contentList: string[], strategies?: ScoringStrategy[]): Promise<EnhancedAIContentAnalysis[]> {
    const results: EnhancedAIContentAnalysis[] = [];
    for (const content of contentList) {
      const result = await this.scoreContent(content, strategies);
      results.push(result);
    }
    return results;
  }

  async estimateScoringCost(content: string, strategies?: ScoringStrategy[]): Promise<number> {
    return 0.005; // Mock cost estimate
  }

  async estimateImprovementCost(content: string, analysis: AIContentAnalysis, options?: AIModelOptions): Promise<number> {
    return 0.01; // Mock cost estimate
  }
}