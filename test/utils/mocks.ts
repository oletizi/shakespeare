import { IAI, IContentScanner, IContentDatabase, IContentScorer } from '@/types/interfaces';
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
 * Mock content scorer for testing
 */
export class MockContentScorer implements IContentScorer {
  private mockScores: AIContentAnalysis;
  private mockImprovedContent: string;

  constructor(mockScores: AIContentAnalysis | null = null, mockImprovedContent: string = 'Improved content') {
    this.mockScores = mockScores || {
      scores: {
        readability: 7.5,
        seoScore: 8.0,
        technicalAccuracy: 9.0,
        engagement: 7.0,
        contentDepth: 8.5
      },
      analysis: {
        readability: { reasoning: 'Good readability', suggestions: ['Add more examples'] },
        seoScore: { reasoning: 'Well structured', suggestions: ['Add keywords'] },
        technicalAccuracy: { reasoning: 'Accurate content', suggestions: ['Update examples'] },
        engagement: { reasoning: 'Somewhat engaging', suggestions: ['Add interactions'] },
        contentDepth: { reasoning: 'Good depth', suggestions: ['Expand topics'] }
      }
    };
    this.mockImprovedContent = mockImprovedContent;
  }

  async scoreContent(content: string): Promise<AIContentAnalysis> {
    return this.mockScores;
  }

  async improveContent(content: string, analysis: AIContentAnalysis): Promise<string> {
    return this.mockImprovedContent;
  }
}