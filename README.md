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

## Content Discovery Workflow

Shakespeare provides two approaches to content management:

### 1. **Lightweight Discovery** (Recommended for large projects)
```bash
# Quick discovery - indexes files without AI scoring
npm run discover-content

# Review individual files as needed
npm run review-content src/content/article.md

# Find worst reviewed content for improvement
npm run improve-content
```

### 2. **Full Indexing** (All-in-one approach)
```bash
# Comprehensive scan with immediate AI analysis
npm run update-content-index

# Improve worst content
npm run improve-content
```

## Content States

- **`needs_review`** - Discovered but not yet analyzed by AI (zero scores)
- **`needs_improvement`** - Reviewed with scores < 8.5 average
- **`meets_targets`** - High quality content (≥ 8.5 average)
- **`in_progress`** - Currently being improved

### Key Methods

```typescript
// Lightweight content discovery (fast, no AI scoring)
const newFiles = await shakespeare.discoverContent();

// Get unreviewed content
const needsReview = shakespeare.getContentNeedingReview();

// Review specific content with AI
await shakespeare.reviewContent(filePath);

// Scan and analyze all content (slower, includes AI scoring)
await shakespeare.updateContentIndex();

// Get content that needs the most improvement (excludes unreviewed)
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

### Database Portability

The content database stores file paths as **relative paths** from the database directory, making it portable across different systems and project locations. This means you can:

- Move your project to different directories
- Share the database across team members  
- Deploy to different environments
- Archive and restore project state

Example database structure:
```json
{
  "lastUpdated": "2025-08-26T06:15:31.708Z",
  "entries": {
    "../src/content/blog/post1.md": {
      "path": "../src/content/blog/post1.md",
      "currentScores": { ... },
      "status": "needs_review"
    }
  }
}
```

Add to `.gitignore`:
```gitignore
.shakespeare/
*.improved.md
*.improved.mdx
```

## Testing

```bash
# Run all tests (unit + integration, excludes smoke tests)
npm test

# Run integration tests only (uses mocks)
npm run test:integration  

# Run smoke tests manually (requires real AI configuration & expensive API calls)
npm run test:smoke
```

**Note**: Smoke tests are excluded from the default test suite (`npm test`) because they make real AI API calls which can be expensive. Run them manually only when needed for end-to-end verification.

## Publishing

This package is configured for publishing to npm with industry-standard best practices.

### For Package Maintainers

#### Initial Setup

1. **Authenticate with npm:**
   ```bash
   npm login
   ```

2. **Verify package configuration:**
   ```bash
   npm run prepublishOnly  # Runs tests and build
   ```

#### Publishing Process

**Patch Release (bug fixes):**
```bash
npm version patch  # 1.0.0 → 1.0.1
npm publish --otp=<6-digit-code>  # Include OTP if 2FA enabled
```

**Minor Release (new features):**
```bash
npm version minor  # 1.0.0 → 1.1.0  
npm publish --otp=<6-digit-code>  # Include OTP if 2FA enabled
```

**Major Release (breaking changes):**
```bash
npm version major  # 1.0.0 → 2.0.0
npm publish --otp=<6-digit-code>  # Include OTP if 2FA enabled
```

#### Automated Publishing Workflow

The package includes automated scripts that:

- **`npm version`**: Builds the package and stages dist files
- **`npm publish`**: Runs full test suite and build before publishing
- **Post-publish**: Creates git tags and pushes to repository

#### Manual Verification

Before publishing, verify:

```bash
# Check what files will be published
npm pack --dry-run

# Verify package contents
tar -tvf *.tgz

# Test local installation
npm install -g ./shakespeare-1.0.0.tgz
```

### Package Configuration

- **Registry**: https://registry.npmjs.org/ (public)
- **Access**: Public package under `@oletizi` scope
- **Files**: Only `dist/`, `README.md`, and `CHANGELOG.md` are published
- **Exports**: Proper ES module support with TypeScript declarations
- **License**: ISC

## License

ISC