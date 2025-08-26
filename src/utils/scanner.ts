import fs from 'fs/promises';
import path from 'path';
import { IContentScanner, ContentCollectionConfig, CONTENT_COLLECTIONS } from '@/types/interfaces';

/**
 * Content scanner with configurable content collection support
 */
export class ContentScanner implements IContentScanner {
  private config: ContentCollectionConfig;
  private rootDir: string;

  constructor(rootDir: string = process.cwd(), config?: ContentCollectionConfig | keyof typeof CONTENT_COLLECTIONS) {
    this.rootDir = rootDir;
    
    // Handle different config types
    if (typeof config === 'string') {
      this.config = CONTENT_COLLECTIONS[config] as ContentCollectionConfig;
    } else if (config) {
      this.config = config;
    } else {
      // Default to Astro content collections
      this.config = CONTENT_COLLECTIONS.astro as ContentCollectionConfig;
    }
  }

  /**
   * Scan for content files based on configuration
   */
  async scanContent(): Promise<string[]> {
    const contentDir = path.resolve(this.rootDir, this.config.baseDir);
    
    // Check if content directory exists
    try {
      await fs.access(contentDir);
    } catch {
      throw new Error(`Content directory not found: ${contentDir}. Make sure the directory exists or configure a different baseDir.`);
    }

    const contentFiles: string[] = [];
    
    const scan = async (dir: string, relativePath: string = ''): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativeFilePath = path.join(relativePath, entry.name);
        
        if (entry.isDirectory()) {
          await scan(fullPath, relativeFilePath);
        } else if (entry.isFile()) {
          // Check if file matches include patterns
          const shouldInclude = this.matchesPatterns(relativeFilePath, this.config.include);
          const shouldExclude = this.config.exclude && this.matchesPatterns(relativeFilePath, this.config.exclude);
          
          if (shouldInclude && !shouldExclude) {
            contentFiles.push(fullPath);
          }
        }
      }
    };

    await scan(contentDir);
    return contentFiles.sort();
  }

  /**
   * Check if a file path matches any of the given glob-like patterns
   */
  private matchesPatterns(filePath: string, patterns: readonly string[]): boolean {
    return patterns.some(pattern => this.matchesPattern(filePath, pattern));
  }

  /**
   * Simple glob pattern matching (supports ** and * wildcards)
   */
  private matchesPattern(filePath: string, pattern: string): boolean {
    // Normalize path separators
    const normalizedPath = filePath.replace(/\\/g, '/');
    const normalizedPattern = pattern.replace(/\\/g, '/');
    
    // Convert glob pattern to regex
    let regexPattern = normalizedPattern
      .replace(/\./g, '\\.')     // Escape dots first
      .replace(/\*\*\//g, '___DOUBLESTARSLASH___')  // Handle **/ first
      .replace(/\*\*/g, '___DOUBLESTAR___')  // Handle remaining ** 
      .replace(/\*/g, '[^/]*')   // * matches any filename characters except /
      .replace(/___DOUBLESTARSLASH___/g, '(?:.*/)?') // **/ matches any path including / (optional for root level)
      .replace(/___DOUBLESTAR___/g, '(?:.*/)?'); // ** matches any path including / (optional for root level)
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(normalizedPath);
  }

  /**
   * Read content of a markdown file
   */
  async readContent(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8');
  }
}
