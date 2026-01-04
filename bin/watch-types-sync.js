#!/usr/bin/env node

/**
 * Types Sync Watcher
 * 
 * Watches for changes in JavaScript files (JSDoc) and TypeScript definition files,
 * and automatically keeps them in sync.
 * 
 * Features:
 * - Watches .js files for JSDoc changes -> regenerates .d.ts
 * - Watches .d.ts files for interface changes -> updates JSDoc imports
 * - Debounced processing to avoid rapid rebuilds
 * - Parallel processing for multiple services
 * 
 * Usage:
 *   node bin/watch-types-sync.js
 *   node bin/watch-types-sync.js --service=TodoService
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');

// Configuration
const DEBOUNCE_DELAY = 1000; // 1 second
const WATCH_PATTERNS = {
  js: ['service/**/*.js', 'resolvers/**/*.js', 'model/**/*.js'],
  dts: ['types/**/*.d.ts']
};

/**
 * Debounce function
 */
function debounce(func, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Run script and return promise
 * @param {string} scriptPath - Path to script
 * @param {Array<string>} args - Script arguments
 * @returns {Promise<void>}
 */
function runScript(scriptPath, args) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [scriptPath, ...args], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit'
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script exited with code ${code}`));
      }
    });
    
    child.on('error', reject);
  });
}

/**
 * Find all services in examples directory
 * @returns {Array<{name: string, path: string}>}
 */
function findAllServices() {
  const services = [];
  const examplesDir = path.join(PROJECT_ROOT, 'examples');
  
  if (!fs.existsSync(examplesDir)) {
    return services;
  }
  
  function scanForServices(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      const fullPath = path.join(dir, entry.name);
      
      // Check if this is a services directory
      if (entry.name === 'services') {
        const serviceEntries = fs.readdirSync(fullPath, { withFileTypes: true });
        
        for (const serviceEntry of serviceEntries) {
          if (serviceEntry.isDirectory()) {
            services.push({
              name: serviceEntry.name,
              path: path.join(fullPath, serviceEntry.name)
            });
          }
        }
      } else {
        scanForServices(fullPath);
      }
    }
  }
  
  scanForServices(examplesDir);
  return services;
}

/**
 * Process JavaScript file change (JSDoc -> TypeScript)
 * @param {string} filePath - Changed file path
 * @param {string} servicePath - Service path
 */
const processJSChange = debounce(async (filePath, servicePath) => {
  console.log(`\n📝 JavaScript file changed: ${path.relative(PROJECT_ROOT, filePath)}`);
  console.log('🔄 Regenerating TypeScript definitions...\n');
  
  try {
    await runScript(
      path.join(PROJECT_ROOT, 'bin/generate-types-from-jsdoc.js'),
      [servicePath]
    );
    console.log('✅ TypeScript definitions updated\n');
  } catch (error) {
    console.error('❌ Error generating types:', error.message);
  }
}, DEBOUNCE_DELAY);

/**
 * Process TypeScript file change (TypeScript -> JSDoc)
 * @param {string} filePath - Changed file path
 * @param {string} servicePath - Service path
 */
const processDTSChange = debounce(async (filePath, servicePath) => {
  console.log(`\n📘 TypeScript file changed: ${path.relative(PROJECT_ROOT, filePath)}`);
  console.log('🔄 Updating JSDoc imports...\n');
  
  try {
    await runScript(
      path.join(PROJECT_ROOT, 'bin/import-types-to-jsdoc.js'),
      [servicePath]
    );
    console.log('✅ JSDoc imports updated\n');
  } catch (error) {
    console.error('❌ Error importing types:', error.message);
  }
}, DEBOUNCE_DELAY);

/**
 * Watch service directory
 * @param {Object} service - Service info
 */
function watchService(service) {
  console.log(`👁️  Watching: ${service.name}`);
  
  const watchDirs = [
    path.join(service.path, 'service'),
    path.join(service.path, 'resolvers'),
    path.join(service.path, 'model'),
    path.join(path.dirname(path.dirname(service.path)), 'types', service.name)
  ];
  
  for (const dir of watchDirs) {
    if (!fs.existsSync(dir)) continue;
    
    try {
      fs.watch(dir, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        
        const fullPath = path.join(dir, filename);
        
        // Ignore if file doesn't exist (deleted files)
        if (!fs.existsSync(fullPath)) return;
        
        // Process based on file type
        if (filename.endsWith('.js')) {
          processJSChange(fullPath, service.path);
        } else if (filename.endsWith('.d.ts') && filename !== 'index.d.ts') {
          processDTSChange(fullPath, service.path);
        }
      });
      
      console.log(`   📁 ${path.relative(PROJECT_ROOT, dir)}`);
    } catch (error) {
      console.error(`   ❌ Failed to watch ${dir}:`, error.message);
    }
  }
}

/**
 * Initial sync for all services
 * @param {Array} services - Services to sync
 */
async function initialSync(services) {
  console.log('\n🔄 Running initial sync...\n');
  
  for (const service of services) {
    console.log(`\n📦 Syncing ${service.name}...`);
    
    try {
      // Generate TypeScript from JSDoc
      await runScript(
        path.join(PROJECT_ROOT, 'bin/generate-types-from-jsdoc.js'),
        [service.path]
      );
      
      // Import TypeScript to JSDoc
      await runScript(
        path.join(PROJECT_ROOT, 'bin/import-types-to-jsdoc.js'),
        [service.path]
      );
      
      console.log(`✅ ${service.name} synced`);
    } catch (error) {
      console.error(`❌ Error syncing ${service.name}:`, error.message);
    }
  }
  
  console.log('\n✅ Initial sync complete\n');
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  console.log('🚀 Types Sync Watcher');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Find services to watch
  let services;
  
  const serviceFlag = args.find(arg => arg.startsWith('--service='));
  if (serviceFlag) {
    const serviceName = serviceFlag.split('=')[1];
    const allServices = findAllServices();
    services = allServices.filter(s => s.name === serviceName);
    
    if (services.length === 0) {
      console.error(`❌ Service not found: ${serviceName}`);
      process.exit(1);
    }
  } else {
    services = findAllServices();
  }
  
  if (services.length === 0) {
    console.error('❌ No services found');
    process.exit(1);
  }
  
  console.log(`Found ${services.length} service(s):\n`);
  for (const service of services) {
    console.log(`  • ${service.name}`);
  }
  console.log('');
  
  // Run initial sync
  await initialSync(services);
  
  // Start watching
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👀 Watching for changes...\n');
  
  for (const service of services) {
    watchService(service);
  }
  
  console.log('\n✅ Watcher is running. Press Ctrl+C to stop.\n');
  
  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n\n👋 Stopping watcher...');
    process.exit(0);
  });
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
