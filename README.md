# @oletizi/shakespeare

AI-driven content review and improvement system with configurable content collection support.

## Features

- **AI-Powered Analysis**: Uses real AI (via Goose CLI) to analyze and score content quality
- **Content Collections**: Built-in support for Astro, Next.js, Gatsby, and custom configurations  
- **Multiple Quality Dimensions**: Analyzes readability, SEO, technical accuracy, engagement, and content depth
- **Automated Improvement**: AI-generated content improvements with tracking
- **Flexible Configuration**: Supports MDX, Markdown, and custom file patterns

## Quick Start

### For Astro Projects (Default)

```typescript
import { ShakespeareFactory } from '@oletizi/shakespeare';

// Uses Astro's src/content directory by default
const shakespeare = ShakespeareFactory.forAstro();

// Analyze all content
await shakespeare.updateContentIndex();

// Find lowest quality content
const worstContent = await shakespeare.getWorstScoringContent();
console.log('Needs improvement:', worstContent);

// Improve content with AI
await shakespeare.improveContent(worstContent);
```

### For Other Frameworks

```typescript
// Next.js projects
const shakespeare = ShakespeareFactory.forNextJS();

// Gatsby projects  
const shakespeare = ShakespeareFactory.forGatsby();

// Custom configuration
const shakespeare = ShakespeareFactory.forCustom({
  baseDir: 'docs',
  include: ['**/*.mdx', '**/*.md'],
  exclude: ['**/README.md']
});
```

### Manual Configuration

```typescript
import { Shakespeare, CONTENT_COLLECTIONS } from '@oletizi/shakespeare';

const shakespeare = new Shakespeare(process.cwd(), undefined, {
  contentCollection: 'astro' // or 'nextjs', 'gatsby'
});

// Or with custom config
const shakespeare = new Shakespeare(process.cwd(), undefined, {
  contentCollection: {
    baseDir: 'src/content',
    include: ['**/*.mdx', '**/*.md'],
    exclude: ['**/index.md', '**/README.md'],
    framework: 'custom'
  }
});
```

## Content Collection Configurations

### Built-in Configurations

| Framework | Base Directory | Includes | Excludes |
|-----------|---------------|----------|----------|
| **Astro** | `src/content` | `**/*.mdx`, `**/*.md` | `**/index.md`, `**/README.md` |
| **Next.js** | `content` | `**/*.mdx`, `**/*.md` | `**/README.md` |
| **Gatsby** | `content` | `**/*.mdx`, `**/*.md` | `**/README.md` |

### Custom Configuration

```typescript
import { ContentCollectionConfig, CONTENT_COLLECTIONS } from '@oletizi/shakespeare';

// Create custom configuration
const customConfig: ContentCollectionConfig = {
  baseDir: 'my-docs',
  include: ['**/*.mdx'],
  exclude: ['**/draft-*.mdx'],
  framework: 'custom'
};

// Or use the helper function
const config = CONTENT_COLLECTIONS.custom(
  'my-docs',           // baseDir
  ['**/*.mdx'],        // include patterns
  ['**/draft-*.mdx']   // exclude patterns
);
```

## Quality Dimensions

Shakespeare analyzes content across five dimensions:

- **Readability** (1-10): How easy the content is to read and understand
- **SEO Score** (1-10): Search engine optimization potential
- **Technical Accuracy** (1-10): Correctness and completeness of technical content
- **Engagement** (1-10): How engaging and interactive the content is
- **Content Depth** (1-10): Comprehensiveness and depth of coverage

## Content Status

Based on average scores, content receives one of three statuses:

- **`meets_targets`**: Average score ≥ 8.5 - High quality content
- **`needs_improvement`**: Average score ≥ 7.0 - Good content with room for improvement  
- **`needs_review`**: Average score < 7.0 - Requires significant attention

## API Reference

### Core Classes

#### `Shakespeare`
Main class for content analysis and improvement.

```typescript
constructor(
  rootDir?: string,              // Project root directory
  dbPath?: string,               // Database file path
  options?: ShakespeareOptions   // Configuration options
)
```

#### `ShakespeareFactory`
Convenience factory for framework-specific configurations.

```typescript
ShakespeareFactory.forAstro(rootDir?, dbPath?, options?)
ShakespeareFactory.forNextJS(rootDir?, dbPath?, options?)
ShakespeareFactory.forGatsby(rootDir?, dbPath?, options?)
ShakespeareFactory.forCustom(config, rootDir?, dbPath?, options?)
```

### Key Methods

```typescript
// Scan and analyze all content
await shakespeare.updateContentIndex();

// Get content that needs the most improvement
const worstContent = await shakespeare.getWorstScoringContent();

// Improve content with AI
await shakespeare.improveContent(filePath);
```

## Requirements

- **Node.js** 18+
- **Goose CLI** installed and configured with API credentials
- TypeScript project with ES modules

### Installing Goose CLI

```bash
# Install goose (see https://github.com/block-open-source/goose for details)
pip install goose-ai

# Configure with your AI provider
goose configure
```

## Configuration Files

Shakespeare creates a `.shakespeare/` directory in your project with:

- `content-db.json`: Content analysis database with scores and history
- Improved content files with `.improved.md` extension

Add to `.gitignore`:
```gitignore
.shakespeare/
*.improved.md
*.improved.mdx
```

## Testing

```bash
# Run all tests
npm test

# Run integration tests (uses mocks)
npm run test:integration  

# Run smoke tests (requires real AI configuration)
npm run test:smoke
```

## License

ISC