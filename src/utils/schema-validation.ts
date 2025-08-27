/**
 * JSON Schema validation utilities for Shakespeare configuration
 */

import { ShakespeareConfig } from '@/types/interfaces';

// JSON Schema definition for unified Shakespeare configuration
export const SHAKESPEARE_CONFIG_SCHEMA = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://schemas.shakespeare.ai/config/v2.json",
  "title": "Shakespeare Configuration",
  "description": "Configuration format for Shakespeare AI content management system",
  "type": "object",
  "properties": {
    "$schema": { "type": "string" },
    "costOptimized": { "type": "boolean" },
    "qualityFirst": { "type": "boolean" },
    "model": { "type": "string" },
    "provider": { "type": "string" },
    "modelOptions": {
      "type": "object",
      "properties": {
        "provider": { "type": "string" },
        "model": { "type": "string" },
        "temperature": { "type": "number", "minimum": 0, "maximum": 2 },
        "maxTokens": { "type": "number", "minimum": 1 },
        "providerConfig": { "type": "object", "additionalProperties": true }
      },
      "additionalProperties": false
    },
    "models": {
      "type": "object",
      "properties": {
        "review": {
          "oneOf": [
            { "type": "string" },
            {
              "type": "object",
              "properties": {
                "model": { "type": "string" },
                "provider": { "type": "string" }
              },
              "required": ["model"],
              "additionalProperties": false
            }
          ]
        },
        "improve": {
          "oneOf": [
            { "type": "string" },
            {
              "type": "object",
              "properties": {
                "model": { "type": "string" },
                "provider": { "type": "string" }
              },
              "required": ["model"],
              "additionalProperties": false
            }
          ]
        },
        "generate": {
          "oneOf": [
            { "type": "string" },
            {
              "type": "object",
              "properties": {
                "model": { "type": "string" },
                "provider": { "type": "string" }
              },
              "required": ["model"],
              "additionalProperties": false
            }
          ]
        }
      },
      "additionalProperties": false
    },
    "taskModelOptions": {
      "type": "object",
      "properties": {
        "review": { "$ref": "#/properties/modelOptions" },
        "improve": { "$ref": "#/properties/modelOptions" },
        "generate": { "$ref": "#/properties/modelOptions" }
      },
      "additionalProperties": false
    },
    "verbose": { "type": "boolean" },
    "logLevel": { "type": "string", "enum": ["error", "warn", "info", "debug"] },
    "dbPath": { "type": "string" },
    "contentCollection": {
      "oneOf": [
        { "type": "string", "enum": ["astro", "nextjs", "gatsby", "custom"] },
        {
          "type": "object",
          "properties": {
            "baseDir": { "type": "string" },
            "include": { "type": "array", "items": { "type": "string" } },
            "exclude": { "type": "array", "items": { "type": "string" } },
            "framework": { "type": "string", "enum": ["astro", "nextjs", "gatsby", "custom"] }
          },
          "required": ["baseDir", "include"],
          "additionalProperties": false
        }
      ]
    }
  },
  "additionalProperties": false
} as const;

/**
 * Schema validation error
 */
export class SchemaValidationError extends Error {
  constructor(message: string, public errors: any[]) {
    super(message);
    this.name = 'SchemaValidationError';
  }
}

/**
 * Basic JSON Schema validator interface
 * Note: This is a minimal implementation for basic validation.
 * For full JSON Schema support, consider using a library like ajv.
 */
export interface JSONSchemaValidator {
  validate(schema: any, data: any): { valid: boolean; errors?: any[] };
}

/**
 * Simple JSON Schema validator implementation
 * This provides basic validation for the Shakespeare config schemas
 */
export class SimpleJSONSchemaValidator implements JSONSchemaValidator {
  validate(schema: any, data: any): { valid: boolean; errors?: any[] } {
    const errors: any[] = [];
    
    try {
      this.validateObject(schema, data, '', errors);
    } catch (error) {
      errors.push({ message: `Validation error: ${error}` });
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
  
  private validateObject(schema: any, data: any, path: string, errors: any[]): void {
    if (schema.type === 'object') {
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        errors.push({ path, message: 'Expected object' });
        return;
      }
      
      // Check required properties
      if (schema.required) {
        for (const prop of schema.required) {
          if (!(prop in data)) {
            errors.push({ path: `${path}.${prop}`, message: `Missing required property: ${prop}` });
          }
        }
      }
      
      // Validate properties
      if (schema.properties) {
        for (const [prop, propSchema] of Object.entries(schema.properties)) {
          if (prop in data) {
            this.validateAny(propSchema, data[prop], `${path}.${prop}`, errors);
          }
        }
      }
      
      // Check for additional properties
      if (schema.additionalProperties === false) {
        const allowedProps = schema.properties ? Object.keys(schema.properties) : [];
        for (const prop of Object.keys(data)) {
          if (!allowedProps.includes(prop)) {
            errors.push({ path: `${path}.${prop}`, message: `Additional property not allowed: ${prop}` });
          }
        }
      }
    }
  }
  
  private validateAny(schema: any, data: any, path: string, errors: any[]): void {
    if (schema.type) {
      switch (schema.type) {
        case 'object':
          this.validateObject(schema, data, path, errors);
          break;
        case 'string':
          if (typeof data !== 'string') {
            errors.push({ path, message: 'Expected string' });
          } else if (schema.enum && !schema.enum.includes(data)) {
            errors.push({ path, message: `Value must be one of: ${schema.enum.join(', ')}` });
          }
          break;
        case 'number':
          if (typeof data !== 'number') {
            errors.push({ path, message: 'Expected number' });
          } else {
            if (schema.minimum !== undefined && data < schema.minimum) {
              errors.push({ path, message: `Value must be >= ${schema.minimum}` });
            }
            if (schema.maximum !== undefined && data > schema.maximum) {
              errors.push({ path, message: `Value must be <= ${schema.maximum}` });
            }
            if (schema.enum && !schema.enum.includes(data)) {
              errors.push({ path, message: `Value must be one of: ${schema.enum.join(', ')}` });
            }
          }
          break;
        case 'boolean':
          if (typeof data !== 'boolean') {
            errors.push({ path, message: 'Expected boolean' });
          }
          break;
        case 'array':
          if (!Array.isArray(data)) {
            errors.push({ path, message: 'Expected array' });
          } else if (schema.items) {
            data.forEach((item, index) => {
              this.validateAny(schema.items, item, `${path}[${index}]`, errors);
            });
          }
          break;
      }
    } else if (schema.oneOf) {
      const oneOfErrors: any[][] = [];
      let validCount = 0;
      
      for (const subSchema of schema.oneOf) {
        const subErrors: any[] = [];
        try {
          this.validateAny(subSchema, data, path, subErrors);
          if (subErrors.length === 0) {
            validCount++;
          }
        } catch {
          // Ignore errors for oneOf validation
        }
        oneOfErrors.push(subErrors);
      }
      
      if (validCount === 0) {
        errors.push({ path, message: 'Data does not match any of the expected schemas' });
      } else if (validCount > 1) {
        errors.push({ path, message: 'Data matches multiple schemas (should match exactly one)' });
      }
    }
  }
}

/**
 * Validate Shakespeare configuration against JSON schema
 * @param config - Configuration object to validate
 * @param validator - JSON Schema validator (optional, uses built-in simple validator by default)
 * @returns Validation result
 */
export function validateConfigSchema(
  config: any, 
  validator: JSONSchemaValidator = new SimpleJSONSchemaValidator()
): { valid: boolean; errors?: any[] } {
  return validator.validate(SHAKESPEARE_CONFIG_SCHEMA, config);
}

/**
 * Validate and throw error if configuration is invalid
 * @param config - Configuration object to validate
 * @param validator - JSON Schema validator (optional)
 * @throws SchemaValidationError if configuration is invalid
 */
export function validateConfigSchemaStrict(
  config: any,
  validator?: JSONSchemaValidator
): void {
  const result = validateConfigSchema(config, validator);
  
  if (!result.valid) {
    const errorMessages = result.errors?.map(e => `${e.path}: ${e.message}`).join(', ') || 'Unknown validation errors';
    throw new SchemaValidationError(`Configuration validation failed: ${errorMessages}`, result.errors || []);
  }
}