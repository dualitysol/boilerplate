#!/usr/bin/env node

/**
 * GraphQL Type Generation Script
 * 
 * This script runs @graphql-codegen/cli to generate TypeScript types
 * from GraphQL schemas and operations.
 * 
 * Usage:
 *   node scripts/generate-graphql-types.js
 *   npm run graphql:codegen
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const configPath = join(rootDir, 'codegen.yml');

if (!existsSync(configPath)) {
  console.error('❌ Error: codegen.yml not found');
  console.log('💡 Run: npx @dualitysol/boilerplate-cli init');
  process.exit(1);
}

console.log('🚀 Starting GraphQL code generation...');
console.log('📁 Config:', configPath);

try {
  // Use the locally installed graphql-codegen
  const codegenBin = join(rootDir, 'node_modules', '.bin', 'graphql-codegen');
  
  if (existsSync(codegenBin)) {
    execSync(`"${codegenBin}" --config codegen.yml`, {
      cwd: rootDir,
      stdio: 'inherit'
    });
  } else {
    // Fallback to npx if local bin not found
    execSync('npx @graphql-codegen/cli --config codegen.yml', {
      cwd: rootDir,
      stdio: 'inherit'
    });
  }
  
  console.log('✅ GraphQL types generated successfully!');
  console.log('📝 Check src/graphql/generated/ for generated files');
} catch (error) {
  console.error('❌ Error generating GraphQL types:', error.message);
  process.exit(1);
}
