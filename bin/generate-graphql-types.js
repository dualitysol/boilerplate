#!/usr/bin/env node

/**
 * GraphQL Code Generation Helper
 * 
 * This script helps generate TypeScript types from GraphQL schemas.
 * It wraps @graphql-codegen/cli with sensible defaults.
 */

import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import fs from 'fs-extra'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = resolve(__dirname, '..')

/**
 * Run GraphQL Code Generator
 */
async function runCodegen(watch = false) {
  console.log('🔧 GraphQL Code Generator\n')

  // Check if codegen config exists
  const configPath = resolve(rootDir, 'codegen.yml')
  if (!await fs.pathExists(configPath)) {
    console.error('❌ codegen.yml not found')
    console.error('   Run: boilerplate generate-types')
    process.exit(1)
  }

  // Check if schema directory exists
  const schemaDir = resolve(rootDir, 'src/graphql/schema')
  if (!await fs.pathExists(schemaDir)) {
    console.error('❌ src/graphql/schema/ directory not found')
    console.error('   Create GraphQL schema files first')
    process.exit(1)
  }

  // Check if dependencies are installed
  try {
    await import('@graphql-codegen/cli')
  } catch (error) {
    console.error('❌ @graphql-codegen/cli not installed')
    console.error('\nInstall required dependencies:')
    console.error('npm install -D @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-resolvers @graphql-codegen/typescript-operations')
    process.exit(1)
  }

  // Build command
  const args = ['graphql-codegen', '--config', 'codegen.yml']
  if (watch) {
    args.push('--watch')
    console.log('👀 Watching for schema changes...\n')
  }

  // Run codegen
  const child = spawn('npx', args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true
  })

  child.on('error', (error) => {
    console.error('❌ Error running codegen:', error.message)
    process.exit(1)
  })

  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(`\n❌ Codegen failed with code ${code}`)
      process.exit(code)
    }
    
    if (!watch) {
      console.log('\n✅ TypeScript types generated successfully!')
      console.log('   Check ./types/graphql-generated.d.ts')
    }
  })
}

// Parse CLI arguments
const args = process.argv.slice(2)
const watch = args.includes('--watch') || args.includes('-w')

// Run
runCodegen(watch).catch((error) => {
  console.error('❌ Fatal error:', error.message)
  process.exit(1)
})
