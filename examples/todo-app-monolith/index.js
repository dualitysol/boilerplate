/**
 * Todo App Monolith - Universal Entry Point
 * 
 * This entry point works for:
 * - Local development
 * - Production monolith
 * - Docker containers
 * - Kubernetes pods
 * 
 * All infrastructure is configured in boilerplate.config.js
 */

import { bootstrap } from '../../../src/bootstrap/index.js';

// Universal bootstrap - reads boilerplate.config.js and initializes everything
bootstrap().catch(error => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});
