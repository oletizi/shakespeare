#!/usr/bin/env node

/**
 * Test ESM compatibility of Shakespeare.create() and Shakespeare.fromConfig()
 */

import { Shakespeare } from './dist/index.js';

console.log('🧪 Testing ESM Compatibility...\n');

try {
  console.log('1️⃣ Testing Shakespeare.create()...');
  const shakespeare1 = await Shakespeare.create({
    costOptimized: true,
    verbose: true
  });
  console.log('✅ Shakespeare.create() works in ESM!');

  console.log('\n2️⃣ Testing Shakespeare.fromConfig()...');
  const shakespeare2 = await Shakespeare.fromConfig();
  console.log('✅ Shakespeare.fromConfig() works in ESM!');

  console.log('\n🎉 ESM compatibility FIXED!');
  console.log('   - No more "Dynamic require of \'fs\' is not supported" errors');
  console.log('   - Shakespeare.create() can be used in ESM projects');
  console.log('   - Shakespeare.fromConfig() can be used in ESM projects');

} catch (error) {
  console.error('❌ ESM compatibility test failed:', error.message);
  process.exit(1);
}