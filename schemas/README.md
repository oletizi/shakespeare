# Shakespeare Configuration JSON Schemas

This directory contains JSON Schema definitions for validating Shakespeare configuration files. These schemas provide IDE support, validation, and documentation for the configuration format.

## Available Schemas

### Main Schema
- **`shakespeare-config.schema.json`** - Union schema that validates both V1 and V2 formats

### Version-Specific Schemas
- **`shakespeare-config-v1.schema.json`** - Legacy V1 configuration format (with workflows)
- **`shakespeare-config-v2.schema.json`** - Current V2 configuration format (with model negotiation)

## Usage

### 1. In Your Config File (JSON)

Add a `$schema` property to get IDE validation and autocompletion:

```json
{
  "$schema": "https://schemas.shakespeare.ai/config/shakespeare-config.json",
  "version": 2,
  "contentCollection": "astro",
  "models": {
    "review": "gemini-1.5-flash-8b",
    "improve": "claude-3-5-sonnet"
  }
}
```

### 2. Programmatic Validation

```javascript
import { validateConfigSchema, validateConfigSchemaStrict } from '@oletizi/shakespeare';

// Basic validation
const result = validateConfigSchema(configObject);
if (!result.valid) {
  console.error('Config validation errors:', result.errors);
}

// Strict validation (throws on error)
try {
  validateConfigSchemaStrict(configObject);
  console.log('Config is valid!');
} catch (error) {
  console.error('Config validation failed:', error.message);
}
```

### 3. With JSON Schema Libraries

For more advanced validation, use with libraries like [ajv](https://ajv.js.org/):

```javascript
import Ajv from 'ajv';
import { SHAKESPEARE_CONFIG_V2_SCHEMA } from '@oletizi/shakespeare';

const ajv = new Ajv();
const validate = ajv.compile(SHAKESPEARE_CONFIG_V2_SCHEMA);

if (!validate(configObject)) {
  console.error('Validation errors:', validate.errors);
}
```

### 4. VS Code Integration

VS Code automatically recognizes the `$schema` property. You can also configure it globally in your workspace:

```json
// .vscode/settings.json
{
  "json.schemas": [
    {
      "fileMatch": ["shakespeare.config.json", ".shakespeare/config.json"],
      "url": "https://schemas.shakespeare.ai/config/shakespeare-config.json"
    }
  ]
}
```

## Configuration Examples

### V2 Format (Recommended) - With Model Negotiation

```json
{
  "$schema": "https://schemas.shakespeare.ai/config/v2.json",
  "version": 2,
  "contentCollection": "astro",
  "verbose": true,
  "logLevel": "debug",
  "models": {
    "review": "gemini-1.5-flash-8b",
    "improve": "claude-3-5-sonnet",
    "generate": "claude-3-5-sonnet"
  },
  "providers": {
    "review": "google",
    "improve": "anthropic",
    "generate": "anthropic"
  }
}
```

### V2 Format - Cost Optimized

```json
{
  "$schema": "https://schemas.shakespeare.ai/config/v2.json",
  "version": 2,
  "costOptimized": true,
  "contentCollection": "nextjs"
}
```

### V2 Format - Quality First

```json
{
  "$schema": "https://schemas.shakespeare.ai/config/v2.json",
  "version": 2,
  "qualityFirst": true,
  "verbose": true
}
```

### V1 Format (Legacy)

```json
{
  "$schema": "https://schemas.shakespeare.ai/config/v1.json",
  "version": 1,
  "contentCollection": "astro",
  "models": {
    "review": "gemini-1.5-flash-8b"
  },
  "workflows": {
    "review": {
      "batchSize": 5
    }
  }
}
```

## Schema URLs

The schemas are available at these URLs:

- `https://schemas.shakespeare.ai/config/shakespeare-config.json` - Main union schema
- `https://schemas.shakespeare.ai/config/v1.json` - V1 schema
- `https://schemas.shakespeare.ai/config/v2.json` - V2 schema

## Migration from V1 to V2

The key differences between V1 and V2:

1. **V2 removes `workflows`** - Configuration is simpler
2. **V2 adds model negotiation features**:
   - `costOptimized` / `qualityFirst` for easy optimization
   - Enhanced `models` / `providers` support 
   - New `taskModelOptions` for advanced configuration
3. **V2 improves path handling** - Paths are relative to config file location

### Migration Steps

1. Change `"version": 1` to `"version": 2`
2. Remove the `workflows` section
3. Keep your `models` and `providers` configuration (now fully supported in V2!)
4. Optionally add `costOptimized: true` or `qualityFirst: true` for quick optimization

The `models` and `providers` configuration you already have will work perfectly in V2 - this is the core model negotiation feature!