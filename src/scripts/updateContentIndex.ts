#!/usr/bin/env node

import { Shakespeare } from '..';
import path from 'path';

async function main() {
  const contentDir = process.env.CONTENT_DIR || path.join(process.cwd(), 'content');
  const dbPath = process.env.DB_PATH || path.join(process.cwd(), '.shakespeare', 'content-db.json');

  const shakespeare = new Shakespeare(contentDir, dbPath);
  await shakespeare.initialize();
  await shakespeare.updateContentIndex();

  console.log('Content index updated successfully');
}

main().catch(console.error);
