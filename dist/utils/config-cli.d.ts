/**
 * CLI configuration management utilities
 */
/**
 * Configuration templates for different use cases
 */
export declare const CONFIG_TEMPLATES: {
    readonly astro: {
        readonly $schema: "https://schemas.shakespeare.ai/config/v2.json";
        readonly version: 2;
        readonly contentCollection: "astro";
        readonly verbose: true;
        readonly logLevel: "info";
        readonly models: {
            readonly review: "gemini-1.5-flash-8b";
            readonly improve: "claude-3-5-sonnet";
            readonly generate: "claude-3-5-sonnet";
        };
        readonly providers: {
            readonly review: "google";
            readonly improve: "anthropic";
            readonly generate: "anthropic";
        };
    };
    readonly nextjs: {
        readonly $schema: "https://schemas.shakespeare.ai/config/v2.json";
        readonly version: 2;
        readonly contentCollection: "nextjs";
        readonly verbose: true;
        readonly logLevel: "info";
        readonly models: {
            readonly review: "gemini-1.5-flash-8b";
            readonly improve: "claude-3-5-sonnet";
            readonly generate: "claude-3-5-sonnet";
        };
        readonly providers: {
            readonly review: "google";
            readonly improve: "anthropic";
            readonly generate: "anthropic";
        };
    };
    readonly gatsby: {
        readonly $schema: "https://schemas.shakespeare.ai/config/v2.json";
        readonly version: 2;
        readonly contentCollection: "gatsby";
        readonly verbose: true;
        readonly logLevel: "info";
        readonly models: {
            readonly review: "gemini-1.5-flash-8b";
            readonly improve: "claude-3-5-sonnet";
            readonly generate: "claude-3-5-sonnet";
        };
        readonly providers: {
            readonly review: "google";
            readonly improve: "anthropic";
            readonly generate: "anthropic";
        };
    };
    readonly costOptimized: {
        readonly $schema: "https://schemas.shakespeare.ai/config/v2.json";
        readonly version: 2;
        readonly costOptimized: true;
        readonly verbose: false;
        readonly logLevel: "info";
    };
    readonly qualityFirst: {
        readonly $schema: "https://schemas.shakespeare.ai/config/v2.json";
        readonly version: 2;
        readonly qualityFirst: true;
        readonly verbose: true;
        readonly logLevel: "debug";
    };
    readonly minimal: {
        readonly $schema: "https://schemas.shakespeare.ai/config/v2.json";
        readonly version: 2;
        readonly verbose: false;
    };
};
export type ConfigTemplate = keyof typeof CONFIG_TEMPLATES;
/**
 * Initialize a new Shakespeare configuration
 */
export declare function initConfig(template?: ConfigTemplate, customPath?: string): Promise<void>;
/**
 * Initialize with force overwrite
 */
export declare function initConfigForce(template?: ConfigTemplate, customPath?: string): Promise<void>;
/**
 * Validate current configuration
 */
export declare function validateConfig(): Promise<void>;
/**
 * Show current configuration
 */
export declare function showConfig(): Promise<void>;
/**
 * List available configuration templates
 */
export declare function listTemplates(): void;
/**
 * Show configuration help
 */
export declare function showConfigHelp(): void;
