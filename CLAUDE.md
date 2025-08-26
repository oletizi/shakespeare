# Claude AI Agent Guidelines for Shakespeare

This document provides guidelines for AI agents (including Claude Code) working on the Shakespeare project. It ensures consistency with the project's architectural principles, quality standards, and development patterns.

## Overview

Shakespeare is a TypeScript project focused on:

- AI-driven content review and improvement system
- TypeScript strict mode with modern ES2020 features
- High code coverage requirements
- Dependency injection for testability
- Clean architecture with proper separation of concerns

## Core Requirements

### Import Pattern

- **ALWAYS use the `@/` import pattern** for internal modules
- Pattern is already configured in `tsconfig.json` with path mapping
- Examples:
  ```typescript
  import { ContentScanner } from '@/utils/scanner';
  import { ContentEntry } from '@/types/content';
  import { AIScorer } from '@/utils/ai';
  ```

### Error Handling

- **Never implement fallbacks or use mock data outside of test code**
- **Throw errors with descriptive messages** instead of fallbacks
- Errors let us know that something isn't implemented
- Fallbacks and mock data are bug factories

```typescript
// ✅ GOOD: Throw descriptive errors
if (!apiKey) {
  throw new Error('API key is required but not configured');
}

// ❌ BAD: Using fallbacks
const apiKey = process.env.API_KEY || 'mock-key-for-testing';
```

### Code Quality Standards

- **TypeScript strict mode required** (already enabled)
- **High code coverage** - aim for 80%+ coverage
- **Unit tests must be deterministic** - use mocking/dependency injection
- **NO module stubbing** - use dependency injection instead
- All code must be unit testable

### File Size Limits

- **Code files should be no larger than 300-500 lines**
- Anything larger should be refactored for readability and modularity
- Split large files into smaller, focused modules

### Repository Hygiene

- **Build artifacts ONLY in `dist/` directory** (already configured)
- NO temporary scripts, logs, or generated files committed to git
- **Never bypass pre-commit or pre-push hooks** - fix issues instead
- Clean repository is mandatory

## Implementation Patterns

### Dependency Injection Pattern

```typescript
// Good: Constructor injection with interfaces
export interface ContentProcessorOptions {
  aiScorer?: AIScorer;
  database?: ContentDatabaseHandler;
  scanner?: ContentScanner;
}

export class ContentProcessor {
  private readonly aiScorer: AIScorer;
  private readonly database: ContentDatabaseHandler;

  constructor(options: ContentProcessorOptions = {}) {
    this.aiScorer = options.aiScorer ?? new AIScorer();
    this.database = options.database ?? new ContentDatabaseHandler();
  }
}

// Provide factory for backward compatibility
export function createContentProcessor(options?: ContentProcessorOptions): ContentProcessor {
  return new ContentProcessor(options);
}
```

### Test Structure (Critical for Coverage)

```typescript
import { ContentProcessor } from '@/services/processor';
import { AIScorer } from '@/utils/ai';

describe('ContentProcessor', () => {
  let mockAIScorer: jest.Mocked<AIScorer>;
  let mockDatabase: jest.Mocked<ContentDatabaseHandler>;
  let processor: ContentProcessor;

  beforeEach(() => {
    mockAIScorer = {
      scoreContent: jest.fn(),
      improveContent: jest.fn(),
    } as jest.Mocked<AIScorer>;

    mockDatabase = {
      load: jest.fn(),
      updateEntry: jest.fn(),
      getData: jest.fn(),
    } as jest.Mocked<ContentDatabaseHandler>;

    processor = new ContentProcessor({
      aiScorer: mockAIScorer,
      database: mockDatabase,
    });
  });

  it('should handle both success and error cases', async () => {
    // Test both happy path and error conditions
    mockAIScorer.scoreContent.mockResolvedValue(mockAnalysis);
    
    await expect(processor.processContent('test.md')).resolves.not.toThrow();
    
    // Test error case
    mockAIScorer.scoreContent.mockRejectedValue(new Error('API failure'));
    await expect(processor.processContent('test.md')).rejects.toThrow('API failure');
  });
});
```

## Project Structure

The project follows this structure:

```text
shakespeare/
├── src/
│   ├── index.ts           # Main Shakespeare class and exports
│   ├── types/             # Type definitions
│   ├── utils/             # Utility classes (scanner, database, ai, etc.)
│   └── scripts/           # CLI scripts
├── test/                  # Unit tests
├── dist/                  # Build artifacts (TypeScript compilation output)
├── package.json           # Package configuration
└── tsconfig.json          # TypeScript configuration with @/ paths
```

## Development Workflow for AI Agents

### Before Making Changes

1. **Read existing code** to understand patterns and conventions
2. **Check dependencies** in package.json to understand available libraries
3. **Review test files** to understand testing patterns
4. **Verify imports use `@/` pattern**

### When Writing Code

1. **Use dependency injection** - pass dependencies via constructor
2. **Follow `@/` import pattern** for all internal imports
3. **Write tests first** or alongside implementation
4. **Ensure high coverage** - test all error paths
5. **Use descriptive error messages** with context
6. **Throw errors instead of fallbacks** outside of test code
7. **Keep files under 300-500 lines** - refactor if larger

### Before Completing Tasks

1. **Run tests**: `npm test`
2. **Check build**: `npm run build`
3. **Verify TypeScript compilation**: `tsc --noEmit`
4. **Ensure all imports use `@/` pattern**

## Common Commands

```bash
# Development commands
npm run build       # Compile TypeScript to dist/
npm run watch       # Watch mode compilation
npm test           # Run Jest tests
npm run test:watch # Run tests in watch mode

# Scripts (after building)
npm run update-content-index  # Update content database
npm run improve-content       # Improve worst-scoring content
```

## Error Handling Pattern

```typescript
try {
  const result = await someOperation();
  return result;
} catch (error: any) {
  const contextualMessage = `Failed to ${operation} for ${resource}: ${error.message}`;
  console.error(contextualMessage);
  throw new Error(contextualMessage);
}
```

## Critical Don'ts for AI Agents

❌ **NEVER implement fallbacks or mock data** outside of test code - throw descriptive errors instead  
❌ **NEVER stub entire modules** (`jest.mock('fs')`) - use dependency injection  
❌ **NEVER put build artifacts** outside `dist/` directory  
❌ **NEVER bypass pre-commit/pre-push checks** - fix issues instead  
❌ **NEVER use relative imports** - use `@/` pattern for internal modules  
❌ **NEVER write environment-dependent tests**  
❌ **NEVER commit temporary files** or scripts  
❌ **NEVER create files larger than 500 lines** - refactor for modularity  

## Success Criteria

An AI agent has successfully completed work when:

- ✅ All tests pass with high coverage
- ✅ Code follows dependency injection patterns
- ✅ All internal imports use `@/` pattern
- ✅ Build artifacts contained in `dist/` directory
- ✅ Pre-commit/pre-push hooks pass
- ✅ TypeScript compilation succeeds
- ✅ No fallbacks or mock data outside test code
- ✅ Files are appropriately sized (under 500 lines)
- ✅ Descriptive error messages for missing functionality

## When in Doubt

- Look at existing code in the project for patterns
- Check test files for testing approaches
- Follow the dependency injection pattern consistently
- Use `@/` imports for all internal modules
- Prioritize testability over convenience
- Throw errors with context instead of using fallbacks