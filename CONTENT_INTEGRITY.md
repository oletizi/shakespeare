# Content Integrity Validation

## Overview

Shakespeare enforces strict content integrity validation to prevent AI-generated artifacts, truncation messages, and incomplete content from being saved. **Content integrity is binary** - content either passes or fails. There is no "partially acceptable" content when it comes to integrity.

## Why Binary Validation?

Unlike content quality dimensions (readability, SEO, technical accuracy, etc.) which exist on a spectrum, content integrity violations represent **fundamental failures** that make content unacceptable for production:

- **Truncated content** is incomplete and misleading
- **AI commentary** ("Here's the improved content...") is unprofessional 
- **Placeholder text** ([TODO], [INSERT EXAMPLE]) is obviously unfinished
- **Broken markdown** creates rendering errors

These issues must be completely absent before content is acceptable.

## Violation Types

### 🚫 Truncation Messages

AI models have token limits. When they hit these limits, they often insert messages indicating the content was cut short:

| Pattern | Description |
|---------|-------------|
| `[Content truncated due to length limit...]` | Explicit truncation due to token limits |
| `[Content continues...]` | Content continuation indicator |
| `[Continue with remaining sections...]` | Promise to continue that wasn't fulfilled |
| `[Remaining content...]` | Reference to missing content |
| `[Additional sections would include...]` | Mention of sections that aren't present |
| `[Further sections would cover...]` | Reference to missing sections |
| `[The rest of the content...]` | Indicates missing content |
| `[Content shortened for brevity...]` | AI shortened instead of providing full content |
| `...would continue with sections` | Natural language truncation |

### 🤖 AI Commentary

Meta-discussion about the content instead of the content itself:

| Pattern | Description |
|---------|-------------|
| `Here's the improved content...` | AI announcing what it did |
| `I've improved/enhanced/updated...` | First-person AI commentary |
| `Below is the improved...` | AI introduction to content |
| `Based on the analysis...` | AI explaining its reasoning |
| `After reviewing the content...` | AI describing its process |
| `Let me improve/enhance...` | AI announcing intentions |

### 📝 Meta Elements

Special markdown elements that shouldn't appear in production:

| Pattern | Description |
|---------|-------------|
| `**Note:**` | Meta notes inappropriate for production |
| `**Disclaimer:**` | Meta disclaimers |
| `**AI Note:**` | AI-specific notes |

### ⚠️ Placeholder Content

Temporary content requiring replacement:

| Pattern | Description |
|---------|-------------|
| `[TODO...]` | TODO placeholders |
| `[PLACEHOLDER...]` | Explicit placeholder content |
| `[INSERT...]` | Insert instructions |
| `[ADD...]` | Add instructions |
| `[EXAMPLE...]` | Example placeholders needing real content |
| `[Your...here]` | User input placeholders |
| `[FIXME...]` | Fix-me markers |
| `XXX` | Common programmer placeholder |

### 💻 Structural Issues

Markdown and content structure problems:

| Issue | Description |
|-------|-------------|
| Unclosed code blocks | Odd number of ``` markers |
| Malformed frontmatter | Unclosed or invalid YAML frontmatter |
| Empty sections | Headers with no content following them |
| Broken markdown | Invalid markdown syntax |

## How Validation Works

1. **Pre-save validation**: Before any improved content is saved, it goes through integrity validation
2. **Binary pass/fail**: Content either passes all checks or is rejected entirely
3. **Detailed reporting**: When content fails, users get a detailed report of all violations
4. **No partial acceptance**: Even one violation causes complete rejection

## Example Validation Report

When content fails integrity validation, users see:

```
❌ Content integrity check FAILED
Found 3 violation(s):

🚫 Truncation Issues:
  • AI model hit output token limit and truncated content
    Line 245
    >>> 245: [Content truncated due to length limit - would continue with remaining sections...]

🤖 AI Commentary:
  • AI commentary about improving content
    Line 1
    >>> 1: Here's the improved version of your content:

⚠️ TODO Placeholders:
  • TODO placeholder requiring completion
    Line 89
    >>> 89: [TODO: Add specific examples here]
```

## Integration with Shakespeare Workflow

The integrity validator is integrated at multiple points:

1. **After AI improvement**: Validates improved content before saving
2. **During chunk reassembly**: Validates reassembled chunks in large documents
3. **Before file writes**: Final check before writing to disk

## For Developers

The integrity validator is implemented in:
- `/src/utils/content-integrity-validator.ts` - Main validator class
- `/src/types/content.ts` - Type definitions for violations

To add new violation patterns:
1. Add to `VIOLATION_PATTERNS` in the validator class
2. Include clear description for user visibility
3. Test with real-world examples

## Configuration

Currently, integrity validation is always enabled and cannot be disabled. This is by design - content integrity is non-negotiable for production systems.