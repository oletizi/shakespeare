import fs from 'fs/promises';
import path from 'path';

/**
 * Content scanner to find markdown files
 */
export class ContentScanner {
  private contentDir: string;

  constructor(contentDir: string) {
    this.contentDir = contentDir;
  }

  /**
   * Scan for markdown files recursively
   */
  async scanContent(): Promise<string[]> {
    const markdownFiles: string[] = [];
    
    async function scan(dir: string): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          markdownFiles.push(fullPath);
        }
      }
    }

    await scan(this.contentDir);
    return markdownFiles;
  }

  /**
   * Read content of a markdown file
   */
  async readContent(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8');
  }
}
