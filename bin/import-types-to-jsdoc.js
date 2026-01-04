#!/usr/bin/env node

/**
 * JSDoc Importer from TypeScript Definitions
 * 
 * This script scans TypeScript .d.ts files and automatically updates
 * JavaScript files with proper JSDoc imports and type annotations.
 * 
 * Features:
 * - Finds all .d.ts interfaces in types/ directory
 * - Updates @param {Object} to @param {import('path').InterfaceName}
 * - Adds @typedef imports at top of files
 * - Preserves existing JSDoc structure
 * - Smart matching based on parameter names
 * 
 * Usage:
 *   node bin/import-types-to-jsdoc.js [servicePath]
 *   node bin/import-types-to-jsdoc.js examples/todo-app-monolith/services/TodoService
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');

/**
 * Find all TypeScript definition files in types directory
 * @param {string} typesRoot - Root types directory
 * @returns {Map<string, string>} - Map of interface name to file path
 */
function findAllTypeDefinitions(typesRoot) {
  const interfaces = new Map();
  
  if (!fs.existsSync(typesRoot)) {
    return interfaces;
  }
  
  function scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.name.endsWith('.d.ts') && entry.name !== 'index.d.ts') {
        // Extract interface name from filename
        const interfaceName = entry.name.replace('.d.ts', '');
        const capitalizedName = interfaceName.charAt(0).toUpperCase() + interfaceName.slice(1);
        
        interfaces.set(interfaceName, fullPath);
        interfaces.set(capitalizedName, fullPath);
      }
    }
  }
  
  scanDirectory(typesRoot);
  return interfaces;
}

/**
 * Parse interfaces from TypeScript file
 * @param {string} filePath - Path to .d.ts file
 * @returns {Array<{name: string, properties: Array}>}
 */
function parseTypeScriptInterface(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const interfacePattern = /export interface (\w+)\s*\{([^}]+)\}/g;
  
  const interfaces = [];
  let match;
  
  while ((match = interfacePattern.exec(content)) !== null) {
    const [, name, body] = match;
    
    // Parse properties
    const propPattern = /(\w+)\??\s*:\s*([^;]+);/g;
    const properties = [];
    let propMatch;
    
    while ((propMatch = propPattern.exec(body)) !== null) {
      const [, propName, propType] = propMatch;
      properties.push({
        name: propName.trim(),
        type: propType.trim()
      });
    }
    
    interfaces.push({ name, properties });
  }
  
  return interfaces;
}

/**
 * Find JSDoc blocks that need type imports
 * @param {string} code - JavaScript code
 * @param {Map<string, string>} availableTypes - Available type definitions
 * @returns {Array<{original: string, replacement: string, lineStart: number}>}
 */
function findJSDocBlocksNeedingTypes(code, availableTypes) {
  const lines = code.split('\n');
  const replacements = [];
  
  let inJSDoc = false;
  let jsdocStart = -1;
  let jsdocLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.trim().startsWith('/**')) {
      inJSDoc = true;
      jsdocStart = i;
      jsdocLines = [line];
    } else if (inJSDoc) {
      jsdocLines.push(line);
      
      if (line.trim() === '*/') {
        inJSDoc = false;
        
        // Analyze JSDoc block
        const jsdocBlock = jsdocLines.join('\n');
        const paramMatches = [...jsdocBlock.matchAll(/@param\s+\{Object\}\s+(\w+(?:\.\w+)?)/g)];
        
        for (const match of paramMatches) {
          const paramName = match[1];
          const baseParamName = paramName.split('.')[0];
          
          // Check if we have a type definition for this parameter
          const capitalizedParam = baseParamName.charAt(0).toUpperCase() + baseParamName.slice(1);
          
          if (availableTypes.has(baseParamName) || availableTypes.has(capitalizedParam)) {
            const typePath = availableTypes.get(baseParamName) || availableTypes.get(capitalizedParam);
            
            // Calculate relative path from current file
            // For now, we'll use a placeholder
            const replacement = jsdocBlock.replace(
              new RegExp(`@param\\s+\\{Object\\}\\s+${paramName.replace('.', '\\.')}`),
              `@param {import('../../types/${path.basename(path.dirname(typePath))}/${path.basename(typePath, '.d.ts')}.js').${capitalizedParam}} ${paramName}`
            );
            
            replacements.push({
              original: jsdocBlock,
              replacement,
              lineStart: jsdocStart
            });
          }
        }
      }
    }
  }
  
  return replacements;
}

/**
 * Update JavaScript file with type imports
 * @param {string} filePath - Path to JavaScript file
 * @param {Map<string, string>} availableTypes - Available type definitions
 * @param {string} serviceName - Service name for relative path calculation
 * @returns {boolean} - True if file was modified
 */
function updateJSFileWithTypes(filePath, availableTypes, serviceName) {
  let code = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  
  // Find all @param {Object} annotations
  // Only match base parameters, not nested ones (input vs input.title)
  const paramObjectPattern = /@param\s+\{Object\}\s+(\w+)(?:\s|$)/g;
  const matches = [...code.matchAll(paramObjectPattern)];
  
  if (matches.length === 0) {
    return false;
  }
  
  console.log(`   Found ${matches.length} Object parameters to replace`);
  
  // Calculate relative path to types directory
  const fileDir = path.dirname(filePath);
  
  // Track which parameters we've already replaced to avoid duplicates
  const replacedParams = new Set();
  
  // Replace each {Object} with proper import
  for (const match of matches) {
    const paramName = match[1];
    
    // Skip if already replaced
    if (replacedParams.has(paramName)) {
      continue;
    }
    
    const capitalizedParam = paramName.charAt(0).toUpperCase() + paramName.slice(1);
    
    // Check if type exists
    const typePathLower = availableTypes.get(paramName);
    const typePathUpper = availableTypes.get(capitalizedParam);
    const typePath = typePathLower || typePathUpper;
    
    if (typePath) {
      const relativePath = path.relative(fileDir, typePath).replace(/\\/g, '/').replace('.d.ts', '.js');
      
      // Replace {Object} with {import(...).Type}
      // Important: Only replace the FIRST occurrence (base parameter), not nested properties
      const importStatement = `import('${relativePath}').${capitalizedParam}`;
      const oldPattern = `@param\\s+\\{Object\\}\\s+${paramName}(?=\\s)`;
      const newAnnotation = `@param {${importStatement}} ${paramName}`;
      
      const regex = new RegExp(oldPattern);
      if (regex.test(code)) {
        code = code.replace(regex, newAnnotation);
        modified = true;
        replacedParams.add(paramName);
        console.log(`   ✓ Updated ${paramName} -> ${capitalizedParam}`);
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, code, 'utf-8');
  }
  
  return modified;
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node import-types-to-jsdoc.js <servicePath>');
    console.log('Example: node bin/import-types-to-jsdoc.js examples/todo-app-monolith/services/TodoService');
    process.exit(1);
  }
  
  const servicePath = path.resolve(PROJECT_ROOT, args[0]);
  const serviceName = path.basename(servicePath);
  
  console.log(`\n🔍 Updating JSDoc for service: ${serviceName}`);
  console.log(`   Path: ${servicePath}\n`);
  
  // Find types directory
  const basePath = path.dirname(path.dirname(servicePath));
  const typesRoot = path.join(basePath, 'types', serviceName);
  
  if (!fs.existsSync(typesRoot)) {
    console.error(`❌ Types directory not found: ${typesRoot}`);
    console.error('   Run generate-types-from-jsdoc.js first!');
    process.exit(1);
  }
  
  // Find all available types
  console.log('📚 Loading type definitions...');
  const availableTypes = findAllTypeDefinitions(typesRoot);
  console.log(`   Found ${availableTypes.size / 2} type definitions\n`);
  
  if (availableTypes.size === 0) {
    console.error('❌ No type definitions found');
    process.exit(1);
  }
  
  // Find JavaScript files to update
  const filesToUpdate = [];
  
  const serviceDir = path.join(servicePath, 'service');
  const resolverDir = path.join(servicePath, 'resolvers');
  const modelDir = path.join(servicePath, 'model');
  
  if (fs.existsSync(serviceDir)) {
    const files = fs.readdirSync(serviceDir)
      .filter(f => f.endsWith('.js'))
      .map(f => path.join(serviceDir, f));
    filesToUpdate.push(...files);
  }
  
  if (fs.existsSync(resolverDir)) {
    const files = fs.readdirSync(resolverDir)
      .filter(f => f.endsWith('.js'))
      .map(f => path.join(resolverDir, f));
    filesToUpdate.push(...files);
  }
  
  if (fs.existsSync(modelDir)) {
    const files = fs.readdirSync(modelDir)
      .filter(f => f.endsWith('.js'))
      .map(f => path.join(modelDir, f));
    filesToUpdate.push(...files);
  }
  
  let updatedCount = 0;
  
  for (const filePath of filesToUpdate) {
    console.log(`📄 Processing: ${path.relative(PROJECT_ROOT, filePath)}`);
    
    const wasModified = updateJSFileWithTypes(filePath, availableTypes, serviceName);
    if (wasModified) {
      updatedCount++;
      console.log(`   ✅ Updated\n`);
    } else {
      console.log(`   No changes needed\n`);
    }
  }
  
  console.log(`✅ Done! Updated ${updatedCount} files\n`);
}

main();
