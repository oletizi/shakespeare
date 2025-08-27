import { ContentChunk, ChunkingConfig } from '@/types/interfaces';
import { ShakespeareLogger } from '@/utils/logger';
/**
 * Content chunker for processing large documents in manageable pieces
 */
export declare class ContentChunker {
    private logger;
    private config;
    constructor(config?: Partial<ChunkingConfig>, logger?: ShakespeareLogger);
    /**
     * Split content into chunks based on headers and size limits
     */
    chunkByHeaders(content: string): ContentChunk[];
    /**
     * Reassemble improved chunks back into complete content
     */
    reassembleChunks(improvedChunks: ContentChunk[]): string;
    /**
     * Validate that chunks don't have gaps or duplications
     */
    validateChunkBoundaries(chunks: ContentChunk[]): boolean;
    /**
     * Determine if content should be chunked based on size
     */
    shouldChunkContent(content: string): boolean;
    private createChunk;
    private isMarkdownHeader;
    private getHeaderLevel;
    private shouldStartNewChunk;
    private extractFrontmatter;
    private removeFrontmatter;
    private removeOverlapWithPrevious;
}
