import { ContentChunk, ChunkingConfig, ChunkProcessingResult } from '@/types/interfaces';
import { ShakespeareLogger } from '@/utils/logger';
import { generateId } from '@/utils/uuid';

/**
 * Content chunker for processing large documents in manageable pieces
 */
export class ContentChunker {
  private logger: ShakespeareLogger;
  private config: ChunkingConfig;

  constructor(config?: Partial<ChunkingConfig>, logger?: ShakespeareLogger) {
    this.logger = logger ?? new ShakespeareLogger();
    this.config = {
      maxChunkSize: 20000,  // 20K chars - safe for most AI models
      minChunkSize: 5000,   // 5K chars minimum
      splitOnHeaders: true,
      headerLevels: [1, 2, 3], // H1, H2, H3
      overlapLines: 2,
      ...config
    };
  }

  /**
   * Split content into chunks based on headers and size limits
   */
  chunkByHeaders(content: string): ContentChunk[] {
    const lines = content.split('\n');
    const chunks: ContentChunk[] = [];
    let currentChunk: string[] = [];
    let currentStartLine = 0;
    let currentHeaders: string[] = [];
    let frontmatter = this.extractFrontmatter(content);

    // Process each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isHeader = this.isMarkdownHeader(line);
      const headerLevel = this.getHeaderLevel(line);

      // Check if we should start a new chunk
      const shouldSplit = this.shouldStartNewChunk(
        currentChunk,
        line,
        isHeader,
        headerLevel
      );

      if (shouldSplit && currentChunk.length > 0) {
        // Create chunk from current content
        const chunk = this.createChunk(
          currentChunk,
          currentStartLine,
          i - 1,
          currentHeaders,
          frontmatter,
          chunks.length === 0 // isFirst
        );
        chunks.push(chunk);

        // Start new chunk with overlap
        const overlapStart = Math.max(0, i - this.config.overlapLines);
        currentChunk = lines.slice(overlapStart, i + 1);
        currentStartLine = overlapStart;
        currentHeaders = isHeader ? [line.trim()] : [];
      } else {
        // Add line to current chunk
        currentChunk.push(line);
        if (isHeader) {
          currentHeaders.push(line.trim());
        }
      }
    }

    // Add the last chunk
    if (currentChunk.length > 0) {
      const chunk = this.createChunk(
        currentChunk,
        currentStartLine,
        lines.length - 1,
        currentHeaders,
        frontmatter,
        chunks.length === 0 // isFirst
      );
      chunks.push(chunk);
    }

    // Mark the last chunk
    if (chunks.length > 0) {
      chunks[chunks.length - 1].isLast = true;
    }

    this.logger.info(`Content chunked into ${chunks.length} parts`, {
      originalLength: content.length,
      chunkSizes: chunks.map(c => c.characterCount),
      operation: 'content_chunking'
    });

    return chunks;
  }

  /**
   * Reassemble improved chunks back into complete content
   */
  reassembleChunks(improvedChunks: ContentChunk[]): string {
    if (improvedChunks.length === 0) {
      return '';
    }

    if (improvedChunks.length === 1) {
      return improvedChunks[0].content;
    }

    let reassembled = '';
    let frontmatterProcessed = false;

    for (let i = 0; i < improvedChunks.length; i++) {
      const chunk = improvedChunks[i];
      let chunkContent = chunk.content;

      // Handle frontmatter - only include it once from the first chunk
      if (chunk.preserveFrontmatter && !frontmatterProcessed) {
        frontmatterProcessed = true;
        // Keep the frontmatter as is
      } else if (chunk.preserveFrontmatter && frontmatterProcessed) {
        // Remove frontmatter from subsequent chunks
        chunkContent = this.removeFrontmatter(chunkContent);
      }

      // Handle overlap removal between chunks
      if (i > 0) {
        chunkContent = this.removeOverlapWithPrevious(
          chunkContent,
          improvedChunks[i - 1].content,
          this.config.overlapLines
        );
      }

      reassembled += chunkContent;

      // Add newline between chunks if needed
      if (i < improvedChunks.length - 1 && !chunkContent.endsWith('\n')) {
        reassembled += '\n';
      }
    }

    this.logger.info(`Reassembled ${improvedChunks.length} chunks`, {
      totalLength: reassembled.length,
      chunkLengths: improvedChunks.map(c => c.characterCount),
      operation: 'content_reassembly'
    });

    return reassembled;
  }

  /**
   * Validate that chunks don't have gaps or duplications
   */
  validateChunkBoundaries(chunks: ContentChunk[]): boolean {
    if (chunks.length <= 1) {
      return true;
    }

    for (let i = 1; i < chunks.length; i++) {
      const prevChunk = chunks[i - 1];
      const currentChunk = chunks[i];

      // Check for reasonable overlap or continuity
      const gap = currentChunk.startLine - prevChunk.endLine;
      if (gap > this.config.overlapLines + 1) {
        this.logger.warn(`Large gap detected between chunks ${i - 1} and ${i}`, {
          gap,
          prevEnd: prevChunk.endLine,
          currentStart: currentChunk.startLine,
          operation: 'chunk_validation'
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Determine if content should be chunked based on size
   */
  shouldChunkContent(content: string): boolean {
    return content.length > this.config.maxChunkSize;
  }

  // Private helper methods

  private createChunk(
    lines: string[],
    startLine: number,
    endLine: number,
    headers: string[],
    frontmatter: string | null,
    isFirst: boolean
  ): ContentChunk {
    let content = lines.join('\n');
    
    // Add frontmatter to first chunk if it exists
    if (isFirst && frontmatter) {
      content = frontmatter + '\n\n' + content;
    }

    return {
      id: generateId(),
      content,
      startLine,
      endLine,
      headers,
      preserveFrontmatter: isFirst && frontmatter !== null,
      characterCount: content.length,
      isFirst,
      isLast: false // Will be set later
    };
  }

  private isMarkdownHeader(line: string): boolean {
    return /^#{1,6}\s+/.test(line.trim());
  }

  private getHeaderLevel(line: string): number {
    const match = line.trim().match(/^(#{1,6})\s+/);
    return match ? match[1].length : 0;
  }

  private shouldStartNewChunk(
    currentChunk: string[],
    line: string,
    isHeader: boolean,
    headerLevel: number
  ): boolean {
    const currentSize = currentChunk.join('\n').length;

    // Don't split if we haven't reached minimum size
    if (currentSize < this.config.minChunkSize) {
      return false;
    }

    // Split if we're over max size
    if (currentSize > this.config.maxChunkSize) {
      return true;
    }

    // Split on configured header levels
    if (this.config.splitOnHeaders && isHeader && 
        this.config.headerLevels.includes(headerLevel)) {
      return true;
    }

    return false;
  }

  private extractFrontmatter(content: string): string | null {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
    return frontmatterMatch ? frontmatterMatch[0] : null;
  }

  private removeFrontmatter(content: string): string {
    return content.replace(/^---\n[\s\S]*?\n---\n/, '');
  }

  private removeOverlapWithPrevious(
    currentContent: string,
    previousContent: string,
    overlapLines: number
  ): string {
    const currentLines = currentContent.split('\n');
    const previousLines = previousContent.split('\n');
    
    // Find common lines at the start of current content
    let commonLines = 0;
    const checkLines = Math.min(overlapLines * 2, currentLines.length, previousLines.length);
    
    for (let i = 0; i < checkLines; i++) {
      const currentLine = currentLines[i];
      const previousLine = previousLines[previousLines.length - checkLines + i];
      
      if (currentLine === previousLine) {
        commonLines++;
      } else {
        break;
      }
    }

    // Remove the overlapping lines
    return currentLines.slice(commonLines).join('\n');
  }
}

