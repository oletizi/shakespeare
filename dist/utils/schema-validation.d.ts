/**
 * JSON Schema validation utilities for Shakespeare configuration
 */
export declare const SHAKESPEARE_CONFIG_SCHEMA: {
    readonly $schema: "http://json-schema.org/draft-07/schema#";
    readonly $id: "https://schemas.shakespeare.ai/config/v2.json";
    readonly title: "Shakespeare Configuration";
    readonly description: "Configuration format for Shakespeare AI content management system";
    readonly type: "object";
    readonly properties: {
        readonly $schema: {
            readonly type: "string";
        };
        readonly costOptimized: {
            readonly type: "boolean";
        };
        readonly qualityFirst: {
            readonly type: "boolean";
        };
        readonly model: {
            readonly type: "string";
        };
        readonly provider: {
            readonly type: "string";
        };
        readonly modelOptions: {
            readonly type: "object";
            readonly properties: {
                readonly provider: {
                    readonly type: "string";
                };
                readonly model: {
                    readonly type: "string";
                };
                readonly temperature: {
                    readonly type: "number";
                    readonly minimum: 0;
                    readonly maximum: 2;
                };
                readonly maxTokens: {
                    readonly type: "number";
                    readonly minimum: 1;
                };
                readonly providerConfig: {
                    readonly type: "object";
                    readonly additionalProperties: true;
                };
            };
            readonly additionalProperties: false;
        };
        readonly models: {
            readonly type: "object";
            readonly properties: {
                readonly review: {
                    readonly oneOf: readonly [{
                        readonly type: "string";
                    }, {
                        readonly type: "object";
                        readonly properties: {
                            readonly model: {
                                readonly type: "string";
                            };
                            readonly provider: {
                                readonly type: "string";
                            };
                        };
                        readonly required: readonly ["model"];
                        readonly additionalProperties: false;
                    }];
                };
                readonly improve: {
                    readonly oneOf: readonly [{
                        readonly type: "string";
                    }, {
                        readonly type: "object";
                        readonly properties: {
                            readonly model: {
                                readonly type: "string";
                            };
                            readonly provider: {
                                readonly type: "string";
                            };
                        };
                        readonly required: readonly ["model"];
                        readonly additionalProperties: false;
                    }];
                };
                readonly generate: {
                    readonly oneOf: readonly [{
                        readonly type: "string";
                    }, {
                        readonly type: "object";
                        readonly properties: {
                            readonly model: {
                                readonly type: "string";
                            };
                            readonly provider: {
                                readonly type: "string";
                            };
                        };
                        readonly required: readonly ["model"];
                        readonly additionalProperties: false;
                    }];
                };
            };
            readonly additionalProperties: false;
        };
        readonly taskModelOptions: {
            readonly type: "object";
            readonly properties: {
                readonly review: {
                    readonly $ref: "#/properties/modelOptions";
                };
                readonly improve: {
                    readonly $ref: "#/properties/modelOptions";
                };
                readonly generate: {
                    readonly $ref: "#/properties/modelOptions";
                };
            };
            readonly additionalProperties: false;
        };
        readonly verbose: {
            readonly type: "boolean";
        };
        readonly logLevel: {
            readonly type: "string";
            readonly enum: readonly ["error", "warn", "info", "debug"];
        };
        readonly dbPath: {
            readonly type: "string";
        };
        readonly contentCollection: {
            readonly oneOf: readonly [{
                readonly type: "string";
                readonly enum: readonly ["astro", "nextjs", "gatsby", "custom"];
            }, {
                readonly type: "object";
                readonly properties: {
                    readonly baseDir: {
                        readonly type: "string";
                    };
                    readonly include: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                    readonly exclude: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                    readonly framework: {
                        readonly type: "string";
                        readonly enum: readonly ["astro", "nextjs", "gatsby", "custom"];
                    };
                };
                readonly required: readonly ["baseDir", "include"];
                readonly additionalProperties: false;
            }];
        };
    };
    readonly additionalProperties: false;
};
/**
 * Schema validation error
 */
export declare class SchemaValidationError extends Error {
    errors: any[];
    constructor(message: string, errors: any[]);
}
/**
 * Basic JSON Schema validator interface
 * Note: This is a minimal implementation for basic validation.
 * For full JSON Schema support, consider using a library like ajv.
 */
export interface JSONSchemaValidator {
    validate(schema: any, data: any): {
        valid: boolean;
        errors?: any[];
    };
}
/**
 * Simple JSON Schema validator implementation
 * This provides basic validation for the Shakespeare config schemas
 */
export declare class SimpleJSONSchemaValidator implements JSONSchemaValidator {
    validate(schema: any, data: any): {
        valid: boolean;
        errors?: any[];
    };
    private validateObject;
    private validateAny;
}
/**
 * Validate Shakespeare configuration against JSON schema
 * @param config - Configuration object to validate
 * @param validator - JSON Schema validator (optional, uses built-in simple validator by default)
 * @returns Validation result
 */
export declare function validateConfigSchema(config: any, validator?: JSONSchemaValidator): {
    valid: boolean;
    errors?: any[];
};
/**
 * Validate and throw error if configuration is invalid
 * @param config - Configuration object to validate
 * @param validator - JSON Schema validator (optional)
 * @throws SchemaValidationError if configuration is invalid
 */
export declare function validateConfigSchemaStrict(config: any, validator?: JSONSchemaValidator): void;
