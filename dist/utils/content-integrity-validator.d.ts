import { ContentIntegrityResult } from '@/types/content';
import { ShakespeareLogger } from '@/utils/logger';
/**
 * Content Integrity Validator
 *
 * This validator enforces strict content integrity rules to prevent AI-generated
 * artifacts, truncation messages, and incomplete content from being saved.
 *
 * INTEGRITY VIOLATIONS ARE BINARY: Content either passes or fails.
 * There is no "partially acceptable" content when it comes to integrity.
 */
export declare class ContentIntegrityValidator {
    private logger;
    /**
     * Comprehensive list of patterns that indicate content integrity violations
     * Each pattern is documented so users understand what's being checked
     */
    private static readonly VIOLATION_PATTERNS;
    constructor(logger?: ShakespeareLogger);
    /**
     * Validate content integrity
     * Returns a binary result with detailed violation information
     */
    validateContent(content: string, executionId?: string): ContentIntegrityResult;
    /**
     * Check for specific violation patterns
     */
    private checkViolations;
    /**
     * Check for structural integrity issues
     */
    private checkStructuralIntegrity;
    /**
     * Get line number from character index
     */
    private getLineNumber;
    /**
     * Get snippet of content around a line
     */
    private getSnippet;
    /**
     * Get a human-readable report of violations
     */
    static formatViolationReport(result: ContentIntegrityResult): string;
    /**
     * Get human-readable violation type header
     */
    private static getViolationTypeHeader;
}
