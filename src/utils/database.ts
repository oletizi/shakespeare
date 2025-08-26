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
  private data: ContentDatabase = {
    lastUpdated: new Date().toISOString(),
    entries: {}
  };

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  /**
   * Load the database from disk
   */
  async load(): Promise<ContentDatabase> {
    try {
      const content = await fs.readFile(this.dbPath, 'utf-8');
      this.data = JSON.parse(content);
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
    await fs.writeFile(this.dbPath, JSON.stringify(this.data, null, 2));
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
