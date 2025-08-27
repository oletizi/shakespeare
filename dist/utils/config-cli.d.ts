/**
 * CLI configuration management utilities
 */
/**
 * Configuration templates for different use cases
 */
export declare const CONFIG_TEMPLATES: {
    readonly astro: {
        readonly $schema: "https://schemas.shakespeare.ai/config/v2.json";
        readonly contentCollection: "astro";
        readonly verbose: true;
        readonly logLevel: "info";
        readonly models: {
            readonly review: {
                readonly model: "gpt-4o-mini";
                readonly provider: "tetrate";
            };
            readonly improve: {
                readonly model: "claude-3-5-sonnet-latest";
                readonly provider: "tetrate";
            };
            readonly generate: {
                readonly model: "claude-3-5-sonnet-latest";
                readonly provider: "tetrate";
            };
        };
    };
    readonly nextjs: {
        readonly $schema: "https://schemas.shakespeare.ai/config/v2.json";
        readonly contentCollection: "nextjs";
        readonly verbose: true;
        readonly logLevel: "info";
        readonly models: {
            readonly review: {
                readonly model: "gpt-4o-mini";
                readonly provider: "tetrate";
            };
            readonly improve: {
                readonly model: "claude-3-5-sonnet-latest";
                readonly provider: "tetrate";
            };
            readonly generate: {
                readonly model: "claude-3-5-sonnet-latest";
                readonly provider: "tetrate";
            };
        };
    };
    readonly gatsby: {
        readonly $schema: "https://schemas.shakespeare.ai/config/v2.json";
        readonly contentCollection: "gatsby";
        readonly verbose: true;
        readonly logLevel: "info";
        readonly models: {
            readonly review: {
                readonly model: "gemini-1.5-flash-8b";
                readonly provider: "google";
            };
            readonly improve: {
                readonly model: "claude-3-5-sonnet";
                readonly provider: "anthropic";
            };
            readonly generate: {
                readonly model: "claude-3-5-sonnet";
                readonly provider: "anthropic";
            };
        };
    };
    readonly costOptimized: {
        readonly $schema: "https://schemas.shakespeare.ai/config/v2.json";
        readonly costOptimized: true;
        readonly verbose: false;
        readonly logLevel: "info";
    };
    readonly qualityFirst: {
        readonly $schema: "https://schemas.shakespeare.ai/config/v2.json";
        readonly qualityFirst: true;
        readonly verbose: true;
        readonly logLevel: "debug";
    };
    readonly minimal: {
        readonly $schema: "https://schemas.shakespeare.ai/config/v2.json";
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
