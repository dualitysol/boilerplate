#!/usr/bin/env node

/**
 * Watch mode for automatic type generation
 * Monitors src/ directory and regenerates types on changes
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const srcDir = path.join(__dirname, '../src')
const generateScript = path.join(__dirname, 'generate-boilerplate-types.js')

console.log('👀 Watching for changes in src/ directory...\n')
console.log('Press Ctrl+C to stop\n')

let regenerating = false

/**
 * Regenerate types
 */
function regenerateTypes() {
  if (regenerating) return
  
  regenerating = true
  console.log('🔄 Regenerating types...')
  
  try {
    execSync(`node ${generateScript}`, { stdio: 'inherit' })
    console.log('✅ Types updated!\n')
  } catch (error) {
    console.error('❌ Failed to regenerate types:', error.message)
  } finally {
    regenerating = false
  }
}

/**
 * Watch directory for changes
 */
function watchDirectory(dir) {
  fs.watch(dir, { recursive: true }, (eventType, filename) => {
    if (!filename) return
    
    // Only watch .js and .ts files
    if (!filename.endsWith('.js') && !filename.endsWith('.ts')) return
    
    // Ignore node_modules and dist
    if (filename.includes('node_modules') || filename.includes('dist')) return
    
    console.log(`📝 File changed: ${filename}`)
    
    // Debounce: wait a bit before regenerating
    setTimeout(() => regenerateTypes(), 500)
  })
}

// Initial generation
regenerateTypes()

// Start watching
watchDirectory(srcDir)

// Keep process alive
process.on('SIGINT', () => {
  console.log('\n👋 Stopping type watcher...')
  process.exit(0)
})
