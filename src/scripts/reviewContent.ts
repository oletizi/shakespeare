#!/usr/bin/env node

/**
 * Content Review Script
 * 
 * Reviews/scores individual content files that were discovered but not yet reviewed.
 */

import { Shakespeare } from '../index.js';
import path from 'path';

async function main() {
  const rootDir = process.cwd();
  const dbPath = path.join(rootDir, '.shakespeare', 'content-db.json');
  const targetPath = process.argv[2];

  if (!targetPath) {
    console.error('❌ Usage: npm run review-content <file-path>\n');
    console.log('💡 Available files needing review:');
    
    try {
      const shakespeare = new Shakespeare(rootDir, dbPath);
      await shakespeare.initialize();
      
      const needingReview = shakespeare.getContentNeedingReview();
      if (needingReview.length === 0) {
        console.log('   (No files need review)');
      } else {
        needingReview.forEach(file => {
          const relativePath = path.relative(rootDir, file);
          console.log(`   • ${relativePath}`);
        });
      }
    } catch (error) {
      console.error('Error loading content database:', error);
    }
    
    process.exit(1);
  }

  try {
    console.log(`🔍 Reviewing content: ${path.relative(rootDir, targetPath)}\n`);
    
    const shakespeare = new Shakespeare(rootDir, dbPath);
    await shakespeare.initialize();
    
    // Convert relative path to absolute if needed
    const absolutePath = path.isAbsolute(targetPath) ? targetPath : path.resolve(rootDir, targetPath);
    
    // Review the content with AI
    console.log('🤖 Analyzing content with AI...');
    await shakespeare.reviewContent(absolutePath);
    
    // Show the results
    const database = shakespeare.getDatabaseData();
    const entry = database.entries[absolutePath];
    
    if (entry) {
      const avgScore = Object.values(entry.currentScores).reduce((a, b) => a + b, 0) / 5;
      
      console.log('\n📊 Review Results:');
      console.log(`   Status: ${entry.status}`);
      console.log(`   Average Score: ${avgScore.toFixed(1)}/10`);
      console.log('   Dimension Scores:');
      console.log(`     • Readability: ${entry.currentScores.readability}/10`);
      console.log(`     • SEO: ${entry.currentScores.seoScore}/10`);
      console.log(`     • Technical Accuracy: ${entry.currentScores.technicalAccuracy}/10`);
      console.log(`     • Engagement: ${entry.currentScores.engagement}/10`);
      console.log(`     • Content Depth: ${entry.currentScores.contentDepth}/10`);
      
      console.log('\n💡 Next steps:');
      if (entry.status === 'needs_improvement') {
        console.log('   • Improve content: npm run improve-content');
      } else if (entry.status === 'meets_targets') {
        console.log('   • Content meets quality targets! ✅');
      } else {
        console.log('   • Continue reviewing other content files');
      }
    }
    
    console.log(`\n✅ Content review complete.`);
    
  } catch (error) {
    console.error('❌ Error reviewing content:', error);
    process.exit(1);
  }
}

main().catch(console.error);