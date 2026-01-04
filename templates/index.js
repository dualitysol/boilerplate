/**
 * Universal Entry Point
 * 
 * Single entry point for any project type:
 * - Monolith
 * - Microservices
 * - Serverless (Lambda, Cloud Functions)
 * - Hybrid
 * 
 * Reads boilerplate.config.js and automatically configures all dependencies.
 */

import { bootstrap } from '@dualitysol/boilerplate/src/bootstrap/index.js';

// Start application
bootstrap().catch((error) => {
  console.error('❌ Application failed to start:', error);
  process.exit(1);
});
