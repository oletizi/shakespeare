#!/usr/bin/env node

/**
 * Zero-configuration content discovery script
 * Uses workflow configuration from .shakespeare/content-db.json
 */

import { Shakespeare } from '../../dist/index.js';

// This is it! The entire script is just 2 lines.
const shakespeare = await Shakespeare.fromConfig();
await shakespeare.discoverAndReport();