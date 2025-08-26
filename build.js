#!/usr/bin/env node

import { build } from 'esbuild';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Plugin to resolve @/ aliases
const aliasPlugin = {
  name: 'alias',
  setup(build) {
    // Resolve @/ to src/
    build.onResolve({ filter: /^@\// }, async (args) => {
      const relativePath = args.path.replace(/^@\//, '');
      const resolvedPath = path.resolve(__dirname, 'src', relativePath);
      
      // Try with .ts extension first, then .js
      const extensions = ['.ts', '.js', '/index.ts', '/index.js'];
      const fs = await import('fs/promises');
      
      for (const ext of extensions) {
        try {
          const fullPath = resolvedPath + ext;
          await fs.access(fullPath);
          return { path: fullPath };
        } catch {
          // Continue to next extension
        }
      }
      
      // If no file found, return the original path and let esbuild handle the error
      return { path: resolvedPath };
    });
  },
};

const commonOptions = {
  platform: 'node',
  target: 'node20',
  format: 'esm',
  plugins: [aliasPlugin],
  bundle: true,
  external: ['dotenv'], // Don't bundle dependencies
  sourcemap: true,
};

async function buildAll() {
  try {
    console.log('🏗️  Building JavaScript with esbuild...');
    
    // Build main module
    await build({
      ...commonOptions,
      entryPoints: ['src/index.ts'],
      outfile: 'dist/index.js',
    });

    // Build scripts
    await build({
      ...commonOptions,
      entryPoints: [
        'src/scripts/updateContentIndex.ts',
        'src/scripts/improveContent.ts',
      ],
      outdir: 'dist/scripts',
    });

    console.log('📝 Generating TypeScript declarations...');
    
    // Generate TypeScript declarations using tsc
    execSync('tsc --emitDeclarationOnly', { stdio: 'inherit' });

    console.log('✅ Build completed successfully');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildAll();