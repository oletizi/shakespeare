# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-08-26

### Added
- AI-driven content review and improvement system
- Support for multiple content collection configurations (Astro, Next.js, Gatsby, Custom)
- Real AI integration via Goose CLI in headless mode
- Content quality analysis across 5 dimensions (readability, SEO, technical accuracy, engagement, content depth)
- Automatic content improvement with AI-generated suggestions
- Configurable content scanning with glob patterns
- Support for Markdown (.md) and MDX (.mdx) files
- Portable database with relative path storage
- Comprehensive TypeScript support with strict mode
- Factory functions for framework-specific configurations
- Integration and smoke testing suites
- MockAI with content-aware realistic scoring for testing

### Features
- **Content Collections**: Built-in support for popular static site generators
- **AI-Powered Analysis**: Uses real AI to analyze and score content quality
- **Automated Improvement**: AI-generated content improvements with tracking
- **Flexible Configuration**: Supports custom file patterns and directory structures
- **Database Portability**: Relative paths for cross-system compatibility
- **Framework Integration**: Easy setup for Astro, Next.js, and Gatsby projects

### Technical Details
- Node.js 18+ required
- ES modules with TypeScript
- Comprehensive test coverage (89%+)
- Dependency injection architecture
- Real AI integration testing capabilities
- Cross-platform file path handling

[1.0.0]: https://github.com/oletizi/shakespeare/releases/tag/v1.0.0