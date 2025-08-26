import fs from 'fs/promises';
import path from 'path';
import { ContentDatabase, ContentEntry } from '@/types/content';
import { IContentDatabase } from '@/types/interfaces';

export { ContentDatabase as ContentDatabaseType } from '@/types/content';

/**
 * Database handler for content tracking
 */
export class ContentDatabaseHandler implements IContentDatabase {
  private dbPath: string;
  private dbDir: string;
  private data: ContentDatabase = {
    lastUpdated: new Date().toISOString(),
    entries: {}
  };

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    this.dbDir = path.dirname(dbPath);
  }

  /**
   * Convert absolute path to relative path from database directory
   */
  private toRelativePath(absolutePath: string): string {
    return path.relative(this.dbDir, absolutePath);
  }

  /**
   * Convert relative path to absolute path from database directory
   */
  private toAbsolutePath(relativePath: string): string {
    return path.resolve(this.dbDir, relativePath);
  }

  /**
   * Load the database from disk
   */
  async load(): Promise<ContentDatabase> {
    try {
      const content = await fs.readFile(this.dbPath, 'utf-8');
      this.data = JSON.parse(content);
      
      // Convert stored relative paths to absolute paths for internal use
      const normalizedEntries: { [key: string]: ContentEntry } = {};
      for (const [relativePath, entry] of Object.entries(this.data.entries)) {
        const absolutePath = this.toAbsolutePath(relativePath);
        normalizedEntries[absolutePath] = {
          ...entry,
          path: absolutePath // Ensure entry.path is also absolute
        };
      }
      this.data.entries = normalizedEntries;
      
      return this.data;
    } catch (error) {
      // If file doesn't exist, create new database
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        await this.save();
        return this.data;
      }
      throw error;
    }
  }

  /**
   * Save the database to disk
   */
  async save(): Promise<void> {
    this.data.lastUpdated = new Date().toISOString();
    
    // Convert absolute paths to relative paths for storage
    const storageData: ContentDatabase = {
      ...this.data,
      entries: {}
    };
    
    for (const [absolutePath, entry] of Object.entries(this.data.entries)) {
      const relativePath = this.toRelativePath(absolutePath);
      storageData.entries[relativePath] = {
        ...entry,
        path: relativePath // Store relative path in entry.path as well
      };
    }
    
    await fs.writeFile(this.dbPath, JSON.stringify(storageData, null, 2));
  }

  /**
   * Get the current database state
   */
  getData(): ContentDatabase {
    return this.data;
  }

  /**
   * Update an entry in the database
   */
  async updateEntry(entryPath: string, updateFn: (entry: ContentEntry | undefined) => ContentEntry): Promise<void> {
    this.data.entries[entryPath] = updateFn(this.data.entries[entryPath]);
    await this.save();
  }
}
