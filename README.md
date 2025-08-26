# Shakespeare

An AI-driven content review and improvement system.

## Installation

```bash
npm install
npm run build
```

## Usage

The system provides two main scripts:

1. Update content index:
```bash
npm run update-content-index
```

2. Improve worst-scoring content:
```bash
npm run improve-content
```

## Configuration

The system can be configured using environment variables:

- `CONTENT_DIR`: Directory containing markdown content files (default: `./content`)
- `DB_PATH`: Path to the content database JSON file (default: `./.shakespeare/content-db.json`)

## Content Quality Dimensions

Content is scored across multiple dimensions:

- Readability
- SEO Score
- Technical Accuracy
- Engagement
- Content Depth

Each dimension is scored from 0 to 10, with target scores configurable in the constants file.
