import { ContentIntegrityResult, ContentIntegrityViolation, ContentIntegrityViolationType } from '@/types/content';
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
export class ContentIntegrityValidator {
  private logger: ShakespeareLogger;

  /**
   * Comprehensive list of patterns that indicate content integrity violations
   * Each pattern is documented so users understand what's being checked
   */
  private static readonly VIOLATION_PATTERNS = {
    // TRUNCATION MESSAGES - AI ran out of tokens or was interrupted
    truncation: [
      {
        pattern: /\[Content truncated due to length limit[^\]]*\]/gi,
        description: 'AI model hit output token limit and truncated content'
      },
      {
        pattern: /\[Content continues\.\.\.\]/gi,
        description: 'Content continuation indicator suggesting incomplete output'
      },
      {
        pattern: /\[Continue with remaining sections[^\]]*\]/gi,
        description: 'Explicit truncation with promise to continue'
      },
      {
        pattern: /\[Remaining content[^\]]*\]/gi,
        description: 'Reference to missing remaining content'
      },
      {
        pattern: /\[Additional sections would include[^\]]*\]/gi,
        description: 'Mention of sections that would be included but aren\'t'
      },
      {
        pattern: /\[Further sections would cover[^\]]*\]/gi,
        description: 'Reference to further sections that are missing'
      },
      {
        pattern: /\[The rest of the content[^\]]*\]/gi,
        description: 'Reference to rest of content that isn\'t present'
      },
      {
        pattern: /\[Content shortened for brevity[^\]]*\]/gi,
        description: 'AI shortened content instead of providing full version'
      },
      {
        pattern: /\.\.\.?\s*would continue with[^\.]{0,100}sections?/gi,
        description: 'Natural language truncation indicator'
      }
    ],

    // AI COMMENTARY - Meta discussion about the content instead of the content itself
    commentary: [
      {
        pattern: /^(Here's|Here is) (the|an?) improved/mi,
        description: 'AI commentary about improving content'
      },
      {
        pattern: /^I('ve| have) (improved|enhanced|updated)/mi,
        description: 'First-person AI commentary'
      },
      {
        pattern: /^(Below is|The following is) the improved/mi,
        description: 'AI introduction to improved content'
      },
      {
        pattern: /^Based on the analysis/mi,
        description: 'AI explaining its reasoning'
      },
      {
        pattern: /^After reviewing the content/mi,
        description: 'AI describing its review process'
      },
      {
        pattern: /^(Let me|I'll) (improve|enhance|update)/mi,
        description: 'AI announcing what it will do'
      }
    ],

    // MARKDOWN META ELEMENTS - Special markdown that shouldn't appear in content
    metaElements: [
      {
        pattern: /\*\*Note:\*\*/gi,
        description: 'Meta note that shouldn\'t be in production content'
      },
      {
        pattern: /\*\*Disclaimer:\*\*/gi,
        description: 'Meta disclaimer that shouldn\'t be in production content'
      },
      {
        pattern: /\*\*AI Note:\*\*/gi,
        description: 'AI-specific note that shouldn\'t be in production'
      }
    ],

    // PLACEHOLDER CONTENT - Temporary content that needs to be replaced
    placeholders: [
      {
        pattern: /\[TODO[^\]]*\]/gi,
        description: 'TODO placeholder requiring completion'
      },
      {
        pattern: /\[PLACEHOLDER[^\]]*\]/gi,
        description: 'Explicit placeholder content'
      },
      {
        pattern: /\[INSERT[^\]]*\]/gi,
        description: 'Insert instruction placeholder'
      },
      {
        pattern: /\[ADD[^\]]*\]/gi,
        description: 'Add instruction placeholder'
      },
      {
        pattern: /\[EXAMPLE[^\]]*\]/gi,
        description: 'Example placeholder needing real content'
      },
      {
        pattern: /\[Your[^\]]*here\]/gi,
        description: 'User input placeholder'
      },
      {
        pattern: /\[FIXME[^\]]*\]/gi,
        description: 'Fix-me marker indicating broken content'
      },
      {
        pattern: /XXX/g,
        description: 'Common programmer placeholder marker'
      }
    ]
  };

  constructor(logger?: ShakespeareLogger) {
    this.logger = logger ?? new ShakespeareLogger();
  }

  /**
   * Validate content integrity
   * Returns a binary result with detailed violation information
   */
  validateContent(content: string, executionId?: string): ContentIntegrityResult {
    const violations: ContentIntegrityViolation[] = [];
    const lines = content.split('\n');

    // Check for truncation violations
    this.checkViolations(
      content,
      lines,
      ContentIntegrityValidator.VIOLATION_PATTERNS.truncation,
      ContentIntegrityViolationType.TRUNCATION_MESSAGE,
      violations
    );

    // Check for AI commentary violations
    this.checkViolations(
      content,
      lines,
      ContentIntegrityValidator.VIOLATION_PATTERNS.commentary,
      ContentIntegrityViolationType.AI_COMMENTARY,
      violations
    );

    // Check for meta element violations
    this.checkViolations(
      content,
      lines,
      ContentIntegrityValidator.VIOLATION_PATTERNS.metaElements,
      ContentIntegrityViolationType.META_DISCUSSION,
      violations
    );

    // Check for placeholder violations
    this.checkViolations(
      content,
      lines,
      ContentIntegrityValidator.VIOLATION_PATTERNS.placeholders,
      ContentIntegrityViolationType.TODO_PLACEHOLDER,
      violations
    );

    // Check for structural violations
    this.checkStructuralIntegrity(content, lines, violations);

    const isValid = violations.length === 0;

    // Log result
    if (executionId) {
      if (isValid) {
        this.logger.info(`[${executionId}] Content integrity validation PASSED`, {
          executionId,
          contentLength: content.length,
          operation: 'content_integrity_validation_passed'
        });
      } else {
        this.logger.error(`[${executionId}] Content integrity validation FAILED`, {
          executionId,
          violationCount: violations.length,
          violations: violations.map(v => ({ type: v.type, message: v.message })),
          operation: 'content_integrity_validation_failed'
        });
      }
    }

    return { isValid, violations };
  }

  /**
   * Check for specific violation patterns
   */
  private checkViolations(
    content: string,
    lines: string[],
    patterns: Array<{ pattern: RegExp; description: string }>,
    violationType: ContentIntegrityViolationType,
    violations: ContentIntegrityViolation[]
  ): void {
    for (const { pattern, description } of patterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const lineNumber = this.getLineNumber(content, match.index || 0);
        const snippet = this.getSnippet(lines, lineNumber);
        
        violations.push({
          type: violationType,
          message: description,
          lineNumber,
          snippet
        });
      }
    }
  }

  /**
   * Check for structural integrity issues
   */
  private checkStructuralIntegrity(
    content: string,
    lines: string[],
    violations: ContentIntegrityViolation[]
  ): void {
    // Check for unclosed code blocks
    const codeBlockCount = (content.match(/```/g) || []).length;
    if (codeBlockCount % 2 !== 0) {
      violations.push({
        type: ContentIntegrityViolationType.UNCLOSED_CODE_BLOCK,
        message: 'Unclosed code block detected (odd number of ``` markers)'
      });
    }

    // Check for malformed frontmatter
    if (content.startsWith('---')) {
      const frontmatterEnd = content.indexOf('---', 3);
      if (frontmatterEnd === -1) {
        violations.push({
          type: ContentIntegrityViolationType.MALFORMED_FRONTMATTER,
          message: 'Frontmatter opened but never closed',
          lineNumber: 1
        });
      } else {
        // Validate YAML structure (basic check)
        const frontmatter = content.substring(3, frontmatterEnd);
        if (frontmatter.includes('---')) {
          violations.push({
            type: ContentIntegrityViolationType.MALFORMED_FRONTMATTER,
            message: 'Multiple --- markers within frontmatter',
            lineNumber: 1
          });
        }
      }
    }

    // Check for incomplete sections (headers without content)
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1];
      
      // If we have a header followed immediately by another header or end of file
      if (/^#{1,6}\s+/.test(line)) {
        if (i === lines.length - 1 || /^#{1,6}\s+/.test(nextLine) || nextLine.trim() === '') {
          // Check if there's any content in the next few lines
          let hasContent = false;
          for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
            if (lines[j].trim() && !/^#{1,6}\s+/.test(lines[j])) {
              hasContent = true;
              break;
            }
          }
          
          if (!hasContent && line.trim() !== '#' && !line.includes('[WIP]')) {
            violations.push({
              type: ContentIntegrityViolationType.INCOMPLETE_SECTION,
              message: `Header "${line.trim()}" has no content`,
              lineNumber: i + 1,
              snippet: line
            });
          }
        }
      }
    }
  }

  /**
   * Get line number from character index
   */
  private getLineNumber(content: string, charIndex: number): number {
    return content.substring(0, charIndex).split('\n').length;
  }

  /**
   * Get snippet of content around a line
   */
  private getSnippet(lines: string[], lineNumber: number, context: number = 1): string {
    const startLine = Math.max(0, lineNumber - 1 - context);
    const endLine = Math.min(lines.length, lineNumber + context);
    
    return lines
      .slice(startLine, endLine)
      .map((line, index) => {
        const currentLineNum = startLine + index + 1;
        const marker = currentLineNum === lineNumber ? '>>> ' : '    ';
        return `${marker}${currentLineNum}: ${line}`;
      })
      .join('\n');
  }

  /**
   * Get a human-readable report of violations
   */
  static formatViolationReport(result: ContentIntegrityResult): string {
    if (result.isValid) {
      return '✅ Content integrity check PASSED - No violations found';
    }

    const report: string[] = [
      '❌ Content integrity check FAILED',
      `Found ${result.violations.length} violation(s):\n`
    ];

    // Group violations by type
    const violationsByType = new Map<ContentIntegrityViolationType, ContentIntegrityViolation[]>();
    for (const violation of result.violations) {
      if (!violationsByType.has(violation.type)) {
        violationsByType.set(violation.type, []);
      }
      violationsByType.get(violation.type)!.push(violation);
    }

    // Format each type
    for (const [type, violations] of violationsByType) {
      report.push(`\n${this.getViolationTypeHeader(type)}:`);
      for (const violation of violations) {
        report.push(`  • ${violation.message}`);
        if (violation.lineNumber) {
          report.push(`    Line ${violation.lineNumber}`);
        }
        if (violation.snippet) {
          report.push(`    ${violation.snippet.split('\n').join('\n    ')}`);
        }
      }
    }

    return report.join('\n');
  }

  /**
   * Get human-readable violation type header
   */
  private static getViolationTypeHeader(type: ContentIntegrityViolationType): string {
    const headers: Record<ContentIntegrityViolationType, string> = {
      [ContentIntegrityViolationType.TRUNCATION_MESSAGE]: '🚫 Truncation Issues',
      [ContentIntegrityViolationType.AI_COMMENTARY]: '🤖 AI Commentary',
      [ContentIntegrityViolationType.META_DISCUSSION]: '📝 Meta Discussion',
      [ContentIntegrityViolationType.UNCLOSED_CODE_BLOCK]: '💻 Code Block Issues',
      [ContentIntegrityViolationType.INCOMPLETE_SECTION]: '📄 Incomplete Sections',
      [ContentIntegrityViolationType.TODO_PLACEHOLDER]: '⚠️ TODO Placeholders',
      [ContentIntegrityViolationType.EXAMPLE_PLACEHOLDER]: '📋 Example Placeholders',
      [ContentIntegrityViolationType.INSERT_PLACEHOLDER]: '➕ Insert Placeholders',
      [ContentIntegrityViolationType.BROKEN_MARKDOWN]: '🔧 Broken Markdown',
      [ContentIntegrityViolationType.MALFORMED_FRONTMATTER]: '⚙️ Malformed Frontmatter'
    };
    
    return headers[type] || type;
  }
}