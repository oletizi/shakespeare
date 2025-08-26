#!/usr/bin/env node

import { Shakespeare } from '..';
import path from 'path';

async function main() {
  const contentDir = process.env.CONTENT_DIR || path.join(process.cwd(), 'content');
  const dbPath = process.env.DB_PATH || path.join(process.cwd(), '.shakespeare', 'content-db.json');

  const shakespeare = new Shakespeare(contentDir, dbPath);
  await shakespeare.initialize();

  const worstContentPath = shakespeare.getWorstScoringContent();
  if (!worstContentPath) {
    console.log('No content needs improvement');
    return;
  }

  console.log(`Improving content: ${worstContentPath}`);
  await shakespeare.improveContent(worstContentPath);
  console.log('Content improvement completed');
}

main().catch(console.error);
