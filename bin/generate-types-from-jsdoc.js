#!/usr/bin/env node

/**
 * TypeScript Types Generator from JSDoc
 * 
 * This script scans JavaScript files for JSDoc comments and automatically
 * generates TypeScript interface files (.d.ts) in the types/ directory.
 * 
 * Features:
 * - Extracts @param {Object} with property descriptions
 * - Generates proper TypeScript interfaces
 * - Creates organized folder structure: types/ServiceName/{dto,entities,responses}
 * - Auto-imports generated types back into JSDoc
 * 
 * Usage:
 *   node bin/generate-types-from-jsdoc.js [servicePath]
 *   node bin/generate-types-from-jsdoc.js examples/todo-app-monolith/services/TodoService
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');

/**
 * Parse JSDoc comments from JavaScript code
 * @param {string} code - JavaScript source code
 * @returns {Array<{type: string, name: string, description: string, properties: Array}>}
 */
function parseJSDocComments(code) {
  const jsdocPattern = /\/\*\*([\s\S]*?)\*\//g;
  // Pattern to match both regular and optional parameters: @param {Type} name OR @param {Type} [name]
  const paramPattern = /@param\s+\{([^}]+)\}\s+(\[)?([^\]\s]+)(\])?(?:\s+-\s+(.+))?/g;
  const returnPattern = /@returns?\s+\{([^}]+)\}(?:\s+(.+))?/;
  const templatePattern = /@template\s+(\w+)/;
  
  const results = [];
  let match;
  
  while ((match = jsdocPattern.exec(code)) !== null) {
    const jsdocText = match[1];
    const params = [];
    let paramMatch;
    
    // Extract function/method name from following code
    const afterJsdoc = code.substring(match.index + match[0].length, match.index + match[0].length + 200);
    const functionNameMatch = afterJsdoc.match(/(?:async\s+)?(?:function\s+)?(\w+)\s*\(/);
    const methodName = functionNameMatch ? functionNameMatch[1] : '';
    
    while ((paramMatch = paramPattern.exec(jsdocText)) !== null) {
      const [fullMatch, type, openBracket, name, closeBracket, description] = paramMatch;
      
      // Skip underscore placeholders
      if (name === '_' || name === '__') {
        continue;
      }
      
      // Check if parameter is wrapped in brackets [name] which means optional
      const isOptionalByBrackets = Boolean(openBracket && closeBracket);
      
      // Parse nested object properties (e.g., input.title, input.description)
      const isNested = name.includes('.');
      const parentName = isNested ? name.split('.')[0] : null;
      const propertyName = isNested ? name.split('.').slice(1).join('.') : name;
      
      params.push({
        type: type.trim(),
        name: propertyName,
        fullName: name,
        parentName,
        description: description?.trim() || '',
        isNested,
        isOptional: isOptionalByBrackets
      });
    }
    
    // Check for return type
    const returnMatch = jsdocText.match(returnPattern);
    const returnType = returnMatch ? returnMatch[1].trim() : null;
    
    // Check for template
    const templateMatch = jsdocText.match(templatePattern);
    const templateType = templateMatch ? templateMatch[1] : null;
    
    if (params.length > 0 || returnType) {
      results.push({
        jsdoc: match[0],
        params,
        returnType,
        templateType,
        methodName,
        rawText: jsdocText
      });
    }
  }
  
  return results;
}

/**
 * Group parameters into interfaces
 * @param {Array} params - Parsed parameters
 * @param {string} contextName - Context name (method name) for better interface naming
 * @returns {Map<string, Array>} - Map of interface name to properties
 */
function groupParametersIntoInterfaces(params, contextName = '') {
  const interfaces = new Map();
  
  for (const param of params) {
    // Find Object parameters with nested properties
    if (param.type === 'Object' && !param.isNested) {
      const nestedProps = params.filter(p => p.parentName === param.name);
      
      // Even if no nested props found, we might need to create interface for this Object
      // to allow manual enhancement later
      if (nestedProps.length > 0 || param.description) {
        // Better interface naming based on context
        let interfaceName = param.name;
        
        // If parameter name is generic like 'input', 'args', 'options', 'filter'
        // prefix it with context for uniqueness
        if (contextName && ['input', 'args', 'options', 'filter', 'data', 'params'].includes(param.name.toLowerCase())) {
          // Extract method name from context (e.g., 'createTodo' from 'Create a new todo')
          interfaceName = contextName + param.name.charAt(0).toUpperCase() + param.name.slice(1);
        }
        
        interfaces.set(interfaceName, nestedProps.length > 0 ? nestedProps : [param]);
      }
    }
  }
  
  return interfaces;
}

/**
 * Convert JSDoc type to TypeScript type
 * @param {string} jsdocType - JSDoc type string
 * @returns {string} - TypeScript type
 */
function convertJSDocTypeToTS(jsdocType) {
  const typeMap = {
    'String': 'string',
    'Number': 'number',
    'Boolean': 'boolean',
    'Object': 'object',
    'Array': 'any[]',
    'Function': 'Function',
    'Promise': 'Promise<any>',
    'void': 'void',
    'any': 'any'
  };
  
  // Handle optional types [Type]
  if (jsdocType.startsWith('[') && jsdocType.endsWith(']')) {
    const innerType = jsdocType.slice(1, -1);
    return `${convertJSDocTypeToTS(innerType)} | undefined`;
  }
  
  // Handle array types Type[]
  if (jsdocType.endsWith('[]')) {
    const elementType = jsdocType.slice(0, -2);
    return `${convertJSDocTypeToTS(elementType)}[]`;
  }
  
  // Handle union types (Type1|Type2)
  if (jsdocType.includes('|')) {
    return jsdocType.split('|').map(t => convertJSDocTypeToTS(t.trim())).join(' | ');
  }
  
  return typeMap[jsdocType] || jsdocType;
}

/**
 * Generate TypeScript interface from parameters
 * @param {string} interfaceName - Name of the interface
 * @param {Array} properties - Property definitions
 * @returns {string} - TypeScript interface code
 */
function generateTSInterface(interfaceName, properties) {
  const capitalizedName = interfaceName.charAt(0).toUpperCase() + interfaceName.slice(1);
  
  let tsCode = `/**\n * ${capitalizedName} interface\n * Auto-generated from JSDoc\n */\n`;
  tsCode += `export interface ${capitalizedName} {\n`;
  
  if (properties.length === 0) {
    tsCode += `  [key: string]: any;\n`;
  } else {
    for (const prop of properties) {
      const isOptional = prop.isOptional || prop.description.toLowerCase().includes('optional');
      const tsType = convertJSDocTypeToTS(prop.type);
      const optionalMark = isOptional ? '?' : '';
      
      if (prop.description) {
        tsCode += `  /** ${prop.description} */\n`;
      }
      tsCode += `  ${prop.name}${optionalMark}: ${tsType};\n`;
    }
  }
  
  tsCode += `}\n`;
  
  return tsCode;
}

/**
 * Scan service file and generate interfaces
 * @param {string} filePath - Path to JavaScript file
 * @param {string} serviceName - Service name (e.g., TodoService)
 * @returns {Object} - Generated interfaces info
 */
function scanFileAndGenerateInterfaces(filePath, serviceName) {
  const code = fs.readFileSync(filePath, 'utf-8');
  const jsdocs = parseJSDocComments(code);
  
  const generatedInterfaces = [];
  const seenInterfaces = new Set(); // Track unique interfaces
  
  for (const jsdoc of jsdocs) {
    const interfaces = groupParametersIntoInterfaces(jsdoc.params, jsdoc.methodName);
    
    for (const [interfaceName, properties] of interfaces) {
      // Skip if we already generated this interface
      if (seenInterfaces.has(interfaceName)) {
        continue;
      }
      seenInterfaces.add(interfaceName);
      
      // Determine interface category based on name
      let category = 'dto';
      const lowerName = interfaceName.toLowerCase();
      
      if (interfaceName === 'dependencies') category = 'internal';
      else if (lowerName.includes('response') || lowerName.includes('result')) category = 'responses';
      else if (lowerName.includes('input') || lowerName.includes('create') || lowerName.includes('update')) category = 'requests';
      else if (lowerName.includes('filter') || lowerName.includes('query')) category = 'filters';
      
      generatedInterfaces.push({
        name: interfaceName,
        category,
        properties,
        tsCode: generateTSInterface(interfaceName, properties)
      });
    }
  }
  
  return generatedInterfaces;
}

/**
 * Create types directory structure
 * @param {string} basePath - Base path for types
 * @param {string} serviceName - Service name
 */
function createTypesStructure(basePath, serviceName) {
  const typesRoot = path.join(basePath, 'types', serviceName);
  const directories = ['dto', 'entities', 'responses', 'requests', 'filters', 'internal'];
  
  for (const dir of directories) {
    const dirPath = path.join(typesRoot, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✓ Created directory: ${dirPath}`);
    }
  }
  
  return typesRoot;
}

/**
 * Write TypeScript interface file
 * @param {string} typesRoot - Types root directory
 * @param {string} category - Category (dto, responses, etc.)
 * @param {string} interfaceName - Interface name
 * @param {string} tsCode - TypeScript code
 */
function writeInterfaceFile(typesRoot, category, interfaceName, tsCode) {
  const fileName = `${interfaceName}.d.ts`;
  const filePath = path.join(typesRoot, category, fileName);
  
  fs.writeFileSync(filePath, tsCode, 'utf-8');
  console.log(`✓ Generated: ${filePath}`);
}

/**
 * Generate index.d.ts that re-exports all interfaces
 * @param {string} typesRoot - Types root directory
 * @param {Array} interfaces - Generated interfaces
 */
function generateIndexFile(typesRoot, interfaces) {
  let indexCode = `/**\n * Auto-generated type definitions\n * @generated\n */\n\n`;
  
  // Group by category
  const byCategory = new Map();
  for (const iface of interfaces) {
    if (!byCategory.has(iface.category)) {
      byCategory.set(iface.category, []);
    }
    byCategory.get(iface.category).push(iface);
  }
  
  // Export from each category (avoid duplicates)
  for (const [category, items] of byCategory) {
    if (items.length > 0) {
      indexCode += `// ${category.charAt(0).toUpperCase() + category.slice(1)}\n`;
      
      const seen = new Set();
      for (const item of items) {
        const capitalizedName = item.name.charAt(0).toUpperCase() + item.name.slice(1);
        
        if (!seen.has(capitalizedName)) {
          seen.add(capitalizedName);
          indexCode += `export type { ${capitalizedName} } from './${category}/${item.name}.js';\n`;
        }
      }
      indexCode += '\n';
    }
  }
  
  const indexPath = path.join(typesRoot, 'index.d.ts');
  fs.writeFileSync(indexPath, indexCode, 'utf-8');
  console.log(`✓ Generated: ${indexPath}`);
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node generate-types-from-jsdoc.js <servicePath>');
    console.log('Example: node bin/generate-types-from-jsdoc.js examples/todo-app-monolith/services/TodoService');
    process.exit(1);
  }
  
  const servicePath = path.resolve(PROJECT_ROOT, args[0]);
  const serviceName = path.basename(servicePath);
  
  console.log(`\n🔍 Scanning service: ${serviceName}`);
  console.log(`   Path: ${servicePath}\n`);
  
  // Find all JavaScript files in service
  const serviceDir = path.join(servicePath, 'service');
  const resolverDir = path.join(servicePath, 'resolvers');
  const modelDir = path.join(servicePath, 'model');
  
  const filesToScan = [];
  
  if (fs.existsSync(serviceDir)) {
    const serviceFiles = fs.readdirSync(serviceDir)
      .filter(f => f.endsWith('.js'))
      .map(f => path.join(serviceDir, f));
    filesToScan.push(...serviceFiles);
  }
  
  if (fs.existsSync(resolverDir)) {
    const resolverFiles = fs.readdirSync(resolverDir)
      .filter(f => f.endsWith('.js'))
      .map(f => path.join(resolverDir, f));
    filesToScan.push(...resolverFiles);
  }
  
  if (fs.existsSync(modelDir)) {
    const modelFiles = fs.readdirSync(modelDir)
      .filter(f => f.endsWith('.js'))
      .map(f => path.join(modelDir, f));
    filesToScan.push(...modelFiles);
  }
  
  if (filesToScan.length === 0) {
    console.error('❌ No JavaScript files found in service directory');
    process.exit(1);
  }
  
  // Create types structure
  const basePath = path.dirname(path.dirname(servicePath)); // Go up to examples/todo-app-monolith
  const typesRoot = createTypesStructure(basePath, serviceName);
  
  // Scan files and generate interfaces
  const allInterfaces = [];
  
  for (const filePath of filesToScan) {
    console.log(`\n📄 Processing: ${path.relative(PROJECT_ROOT, filePath)}`);
    const interfaces = scanFileAndGenerateInterfaces(filePath, serviceName);
    
    if (interfaces.length === 0) {
      console.log('   No interfaces found');
      continue;
    }
    
    for (const iface of interfaces) {
      writeInterfaceFile(typesRoot, iface.category, iface.name, iface.tsCode);
      allInterfaces.push(iface);
    }
  }
  
  // Generate index file
  if (allInterfaces.length > 0) {
    console.log('');
    generateIndexFile(typesRoot, allInterfaces);
  }
  
  console.log(`\n✅ Done! Generated ${allInterfaces.length} interfaces for ${serviceName}\n`);
}

main();
