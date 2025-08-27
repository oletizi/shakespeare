#!/usr/bin/env node

/**
 * Content Discovery Script
 * 
 * Quickly discovers and indexes content without the expensive AI review step.
 * Creates database entries with 'needs_review' status.
 */

import { Shakespeare } from '../index.js';
import path from 'path';
import { ShakespeareLogger } from '@/utils/logger';

async function main() {
  const rootDir = process.cwd();
  const dbPath = path.join(rootDir, '.shakespeare', 'content-db.json');
  const logger = new ShakespeareLogger(rootDir);

  try {
    console.log('🔍 Discovering content...\n');
    
    const shakespeare = new Shakespeare(rootDir, dbPath);
    await shakespeare.initialize();
    
    // Discover content without scoring
    const newFiles = await shakespeare.discoverContent();
    
    if (newFiles.length === 0) {
      console.log('✅ No new content found. Database is up to date.\n');
    } else {
      console.log(`📄 Discovered ${newFiles.length} new content file(s):`);
      newFiles.forEach(file => {
        const relativePath = path.relative(rootDir, file);
        console.log(`   • ${relativePath}`);
      });
      console.log('');
    }
    
    // Show summary of content status
    const needingReview = shakespeare.getContentNeedingReview();
    const totalEntries = Object.keys(shakespeare.getDatabaseData().entries).length;
    
    console.log('📊 Content Summary:');
    console.log(`   Total files: ${totalEntries}`);
    console.log(`   Needs review: ${needingReview.length}`);
    console.log(`   Reviewed: ${totalEntries - needingReview.length}\n`);
    
    if (needingReview.length > 0) {
      console.log('💡 Next steps:');
      console.log('   • Run individual reviews: npm run review-content [file-path]');
      console.log('   • Run full content index: npm run update-content-index');
      console.log('   • Find worst content: npm run improve-content');
    }
    
    console.log(`\n✅ Content discovery complete. Database updated at:`);
    console.log(`   ${dbPath}`);
    
  } catch (error) {
    logger.logError('Error discovering content', error);
    process.exit(1);
  }
}

main().catch(console.error);