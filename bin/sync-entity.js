#!/usr/bin/env node

/**
 * Entity Sync Tool
 * Synchronizes entity definitions with GraphQL schemas, database schemas, and TypeScript types
 * 
 * Usage:
 *   npm run sync:entity [serviceName] [entityName]
 *   npm run sync:entity UserService User
 *   npm run sync:entity --all
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Parse command line arguments
const args = process.argv.slice(2);
const syncAll = args.includes('--all');
const serviceName = args[0];
const entityName = args[1];

async function main() {
  try {
    // Find project root
    const projectRoot = await findProjectRoot();
    if (!projectRoot) {
      console.error('❌ Could not find boilerplate.config.js. Make sure you are in a project directory.');
      process.exit(1);
    }

    console.log('🔍 Project root:', projectRoot);

    // Load config
    const config = await loadConfig(projectRoot);
    const useTypeScript = fs.existsSync(path.join(projectRoot, 'tsconfig.json'));
    const fileExt = useTypeScript ? 'ts' : 'js';

    console.log(`📝 Project type: ${useTypeScript ? 'TypeScript' : 'JavaScript'}`);

    if (syncAll) {
      // Sync all services
      console.log('🔄 Syncing all services...');
      await syncAllServices(projectRoot, config, useTypeScript, fileExt);
    } else if (serviceName && entityName) {
      // Sync specific entity
      console.log(`🔄 Syncing ${serviceName} > ${entityName}...`);
      await syncEntity(projectRoot, config, serviceName, entityName, useTypeScript, fileExt);
    } else {
      console.error('❌ Usage: npm run sync:entity [serviceName] [entityName] or --all');
      process.exit(1);
    }

    console.log('✅ Sync completed successfully!');
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    process.exit(1);
  }
}

async function findProjectRoot(dir = process.cwd()) {
  const configFiles = ['boilerplate.config.ts', 'boilerplate.config.js', 'boilerplate.config.mjs'];
  
  for (const configFile of configFiles) {
    const configPath = path.join(dir, configFile);
    if (fs.existsSync(configPath)) {
      return dir;
    }
  }
  
  const parent = path.dirname(dir);
  if (parent === dir) return null;
  
  return findProjectRoot(parent);
}

async function loadConfig(projectRoot) {
  const configFiles = ['boilerplate.config.ts', 'boilerplate.config.js', 'boilerplate.config.mjs'];
  
  for (const configFile of configFiles) {
    const configPath = path.join(projectRoot, configFile);
    if (fs.existsSync(configPath)) {
      // For TypeScript config, compile it first
      if (configFile.endsWith('.ts')) {
        await execAsync(`npx ts-node -O '{"module":"commonjs"}' -e "console.log(JSON.stringify(require('${configPath}').default))"`);
      }
      delete require.cache[require.resolve(configPath)];
      const config = require(configPath);
      return config.default || config;
    }
  }
  
  throw new Error('Config file not found');
}

async function syncAllServices(projectRoot, config, useTypeScript, fileExt) {
  const servicesPath = path.join(projectRoot, config.services?.path || 'services');
  
  if (!fs.existsSync(servicesPath)) {
    console.warn('⚠️  Services directory not found');
    return;
  }
  
  const services = fs.readdirSync(servicesPath).filter(name => {
    const servicePath = path.join(servicesPath, name);
    return fs.statSync(servicePath).isDirectory();
  });
  
  for (const service of services) {
    const entityPath = path.join(servicesPath, service, 'entity');
    
    if (!fs.existsSync(entityPath)) {
      continue;
    }
    
    const entityFiles = fs.readdirSync(entityPath).filter(f => 
      f.endsWith('.ts') || f.endsWith('.js')
    );
    
    for (const entityFile of entityFiles) {
      const entityName = path.basename(entityFile, path.extname(entityFile));
      
      // Skip .d.ts files
      if (entityFile.endsWith('.d.ts')) continue;
      
      console.log(`  📦 ${service} > ${entityName}`);
      await syncEntity(projectRoot, config, service, entityName, useTypeScript, fileExt);
    }
  }
}

async function syncEntity(projectRoot, config, serviceName, entityName, useTypeScript, fileExt) {
  const servicesPath = path.join(projectRoot, config.services?.path || 'services');
  const servicePath = path.join(servicesPath, serviceName);
  const entityPath = path.join(servicePath, 'entity');
  const entityFile = path.join(entityPath, `${entityName}.${fileExt}`);
  
  if (!fs.existsSync(entityFile)) {
    throw new Error(`Entity file not found: ${entityFile}`);
  }
  
  // For JavaScript, generate/update .d.ts from JSDoc
  if (!useTypeScript) {
    console.log('  📝 Generating TypeScript definitions from JSDoc...');
    await generateDtsFromJSDoc(entityFile);
  }
  
  // Parse entity
  console.log('  🔍 Parsing entity...');
  const entityData = await parseEntity(entityFile, useTypeScript);
  
  // Generate GraphQL TypeDefs
  console.log('  📄 Generating GraphQL schema...');
  await generateGraphQLSchema(servicePath, entityName, entityData, fileExt);
  
  // Generate Database Schema
  console.log('  🗄️  Generating database schema...');
  await generateDatabaseSchema(projectRoot, servicePath, entityName, entityData, config);
  
  // Update resolvers if needed
  console.log('  🔧 Updating resolvers...');
  await updateResolvers(servicePath, entityName, entityData, fileExt);
}

async function generateDtsFromJSDoc(jsFile) {
  const dtsFile = jsFile.replace('.js', '.d.ts');
  
  // Use TypeScript compiler to generate .d.ts from JSDoc
  try {
    await execAsync(`npx tsc ${jsFile} --declaration --emitDeclarationOnly --allowJs`);
    console.log(`    ✓ Generated ${path.basename(dtsFile)}`);
  } catch (error) {
    console.warn(`    ⚠️  Could not auto-generate .d.ts: ${error.message}`);
    
    // Fallback: parse JSDoc manually
    const content = fs.readFileSync(jsFile, 'utf-8');
    const dtsContent = parseJSDocToDts(content);
    fs.writeFileSync(dtsFile, dtsContent);
    console.log(`    ✓ Generated ${path.basename(dtsFile)} from JSDoc`);
  }
}

function parseJSDocToDts(content) {
  const lines = content.split('\n');
  let dtsLines = [];
  let inClass = false;
  let className = '';
  let properties = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect class
    if (line.startsWith('class ') || line.startsWith('export class ')) {
      const match = line.match(/class\s+(\w+)/);
      if (match) {
        className = match[1];
        inClass = true;
        dtsLines.push(`export declare class ${className} {`);
      }
    }
    
    // Parse JSDoc comments
    if (line.startsWith('/**')) {
      let jsdoc = [];
      while (i < lines.length && !lines[i].includes('*/')) {
        jsdoc.push(lines[i]);
        i++;
      }
      jsdoc.push(lines[i]); // Include closing */
      
      // Look for @type annotation
      const typeMatch = jsdoc.join('\n').match(/@type\s+\{([^}]+)\}/);
      if (typeMatch && inClass) {
        const type = typeMatch[1];
        const nextLine = lines[i + 1]?.trim() || '';
        const propMatch = nextLine.match(/(?:this\.)?(\w+)\s*=/);
        if (propMatch) {
          const propName = propMatch[1];
          properties.push(`  ${propName}: ${type};`);
        }
      }
    }
    
    // End of class
    if (inClass && line === '}') {
      dtsLines.push(...properties);
      dtsLines.push('}');
      inClass = false;
      properties = [];
    }
  }
  
  return dtsLines.join('\n');
}

async function parseEntity(entityFile, useTypeScript) {
  const content = fs.readFileSync(entityFile, 'utf-8');
  
  if (useTypeScript) {
    // Parse TypeScript with decorators
    return parseTypeScriptEntity(content);
  } else {
    // Parse JSDoc or .d.ts
    const dtsFile = entityFile.replace('.js', '.d.ts');
    if (fs.existsSync(dtsFile)) {
      const dtsContent = fs.readFileSync(dtsFile, 'utf-8');
      return parseTypeDefinition(dtsContent);
    } else {
      return parseJSDoc(content);
    }
  }
}

function parseTypeScriptEntity(content) {
  const entity = {
    name: '',
    description: '',
    fields: [],
    relations: []
  };
  
  // Extract class name
  const classMatch = content.match(/@Entity\([^)]*\)[\s\S]*?class\s+(\w+)/);
  if (classMatch) {
    entity.name = classMatch[1];
  }
  
  // Extract fields with @Field decorator
  const fieldRegex = /@Field\(([^)]*)\)[\s\S]*?(\w+):\s*([^;]+)/g;
  let match;
  
  while ((match = fieldRegex.exec(content)) !== null) {
    const options = match[1];
    const name = match[2];
    const type = match[3].trim();
    
    entity.fields.push({
      name,
      type,
      options: parseDecoratorOptions(options)
    });
  }
  
  return entity;
}

function parseTypeDefinition(content) {
  const entity = {
    name: '',
    description: '',
    fields: []
  };
  
  // Extract class name
  const classMatch = content.match(/class\s+(\w+)/);
  if (classMatch) {
    entity.name = classMatch[1];
  }
  
  // Extract properties
  const propRegex = /(\w+):\s*([^;]+);/g;
  let match;
  
  while ((match = propRegex.exec(content)) !== null) {
    entity.fields.push({
      name: match[1],
      type: match[2].trim()
    });
  }
  
  return entity;
}

function parseJSDoc(content) {
  // Similar to parseTypeDefinition but from JSDoc comments
  return parseTypeDefinition(content);
}

function parseDecoratorOptions(optionsStr) {
  try {
    // Simple parser for decorator options
    return eval(`(${optionsStr})`);
  } catch {
    return {};
  }
}

async function generateGraphQLSchema(servicePath, entityName, entityData, fileExt) {
  const typeDefsPath = path.join(servicePath, 'typeDefinitions');
  if (!fs.existsSync(typeDefsPath)) {
    fs.mkdirSync(typeDefsPath, { recursive: true });
  }
  
  const schemaFile = path.join(typeDefsPath, `${entityName}.${fileExt}`);
  
  let schema = `export const ${entityName}TypeDefs = \`
  type ${entityName} {
`;
  
  for (const field of entityData.fields) {
    const graphqlType = mapTypeToGraphQL(field.type);
    const nullable = field.options?.nullable !== false ? '' : '!';
    schema += `    ${field.name}: ${graphqlType}${nullable}\n`;
  }
  
  schema += `  }
  
  extend type Query {
    ${entityName.toLowerCase()}(id: ID!): ${entityName}
    ${entityName.toLowerCase()}s(
      limit: Int = 10
      offset: Int = 0
    ): [${entityName}!]!
  }
  
  extend type Mutation {
    create${entityName}(input: Create${entityName}Input!): ${entityName}!
    update${entityName}(id: ID!, input: Update${entityName}Input!): ${entityName}!
    delete${entityName}(id: ID!): Boolean!
  }
  
  input Create${entityName}Input {
${entityData.fields.filter(f => f.name !== 'id').map(f => 
    `    ${f.name}: ${mapTypeToGraphQL(f.type)}${f.options?.nullable === false ? '!' : ''}`
  ).join('\n')}
  }
  
  input Update${entityName}Input {
${entityData.fields.filter(f => f.name !== 'id').map(f => 
    `    ${f.name}: ${mapTypeToGraphQL(f.type)}`
  ).join('\n')}
  }
\`;
`;
  
  fs.writeFileSync(schemaFile, schema);
  console.log(`    ✓ Generated ${path.basename(schemaFile)}`);
}

function mapTypeToGraphQL(type) {
  const typeMap = {
    'string': 'String',
    'number': 'Int',
    'boolean': 'Boolean',
    'Date': 'String',
    'ID': 'ID'
  };
  
  // Handle arrays
  if (type.includes('[]')) {
    const baseType = type.replace('[]', '').trim();
    return `[${typeMap[baseType] || baseType}]`;
  }
  
  return typeMap[type] || type;
}

async function generateDatabaseSchema(projectRoot, servicePath, entityName, entityData, config) {
  const migrationsPath = path.join(projectRoot, 'migrations');
  if (!fs.existsSync(migrationsPath)) {
    fs.mkdirSync(migrationsPath, { recursive: true });
  }
  
  const dbType = config.databases?.primary?.type || 'mongodb';
  
  if (dbType === 'mongodb') {
    await generateMongoSchema(migrationsPath, entityName, entityData);
  } else if (dbType === 'postgres' || dbType === 'mysql') {
    await generateSQLMigration(migrationsPath, entityName, entityData, dbType);
  }
}

async function generateMongoSchema(migrationsPath, entityName, entityData) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const migrationFile = path.join(migrationsPath, `${timestamp}-create-${entityName.toLowerCase()}.js`);
  
  let schema = `/**
 * Migration: Create ${entityName} collection
 * Generated: ${new Date().toISOString()}
 */

module.exports = {
  async up(db) {
    await db.createCollection('${entityName.toLowerCase()}s', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: [${entityData.fields.filter(f => f.options?.nullable === false).map(f => `'${f.name}'`).join(', ')}],
          properties: {
`;
  
  for (const field of entityData.fields) {
    const bsonType = mapTypeToBSON(field.type);
    schema += `            ${field.name}: { bsonType: '${bsonType}' },\n`;
  }
  
  schema += `          }
        }
      }
    });
    
    // Create indexes
`;
  
  for (const field of entityData.fields) {
    if (field.options?.db?.index || field.options?.db?.unique) {
      schema += `    await db.collection('${entityName.toLowerCase()}s').createIndex(
      { ${field.name}: 1 },
      { unique: ${field.options.db.unique || false} }
    );\n`;
    }
  }
  
  schema += `  },
  
  async down(db) {
    await db.collection('${entityName.toLowerCase()}s').drop();
  }
};
`;
  
  fs.writeFileSync(migrationFile, schema);
  console.log(`    ✓ Generated migration: ${path.basename(migrationFile)}`);
}

function mapTypeToBSON(type) {
  const typeMap = {
    'string': 'string',
    'number': 'number',
    'boolean': 'bool',
    'Date': 'date',
    'ID': 'string'
  };
  
  return typeMap[type] || 'string';
}

async function generateSQLMigration(migrationsPath, entityName, entityData, dbType) {
  const timestamp = Date.now();
  const migrationFile = path.join(migrationsPath, `${timestamp}-create-${entityName.toLowerCase()}.sql`);
  
  let sql = `-- Migration: Create ${entityName} table
-- Generated: ${new Date().toISOString()}

CREATE TABLE ${entityName.toLowerCase()}s (
`;
  
  const columns = [];
  for (const field of entityData.fields) {
    const sqlType = mapTypeToSQL(field.type, dbType);
    const nullable = field.options?.nullable === false ? 'NOT NULL' : '';
    const unique = field.options?.db?.unique ? 'UNIQUE' : '';
    const primary = field.options?.db?.primary || field.name === 'id' ? 'PRIMARY KEY' : '';
    
    columns.push(`  ${field.name} ${sqlType} ${primary} ${unique} ${nullable}`.trim());
  }
  
  sql += columns.join(',\n');
  sql += `\n);\n`;
  
  // Add indexes
  for (const field of entityData.fields) {
    if (field.options?.db?.index && !field.options?.db?.primary) {
      sql += `\nCREATE INDEX idx_${entityName.toLowerCase()}_${field.name} ON ${entityName.toLowerCase()}s(${field.name});`;
    }
  }
  
  fs.writeFileSync(migrationFile, sql);
  console.log(`    ✓ Generated migration: ${path.basename(migrationFile)}`);
}

function mapTypeToSQL(type, dbType) {
  const typeMap = {
    postgres: {
      'string': 'VARCHAR(255)',
      'number': 'INTEGER',
      'boolean': 'BOOLEAN',
      'Date': 'TIMESTAMP',
      'ID': 'SERIAL'
    },
    mysql: {
      'string': 'VARCHAR(255)',
      'number': 'INT',
      'boolean': 'BOOLEAN',
      'Date': 'DATETIME',
      'ID': 'INT AUTO_INCREMENT'
    }
  };
  
  return typeMap[dbType]?.[type] || 'VARCHAR(255)';
}

async function updateResolvers(servicePath, entityName, entityData, fileExt) {
  const resolversPath = path.join(servicePath, 'resolvers');
  const resolverFile = path.join(resolversPath, `${entityName}.${fileExt}`);
  
  // Only update if file doesn't exist
  if (fs.existsSync(resolverFile)) {
    console.log(`    ℹ️  Resolver already exists, skipping`);
    return;
  }
  
  if (!fs.existsSync(resolversPath)) {
    fs.mkdirSync(resolversPath, { recursive: true });
  }
  
  const resolverContent = `export const ${entityName}Resolvers = {
  Query: {
    ${entityName.toLowerCase()}: async (_, { id }, { services }) => {
      return await services.${entityName}Service.get${entityName}(id);
    },
    ${entityName.toLowerCase()}s: async (_, { limit, offset }, { services }) => {
      return await services.${entityName}Service.list${entityName}s({ limit, offset });
    }
  },
  
  Mutation: {
    create${entityName}: async (_, { input }, { services }) => {
      return await services.${entityName}Service.create${entityName}(input);
    },
    update${entityName}: async (_, { id, input }, { services }) => {
      return await services.${entityName}Service.update${entityName}(id, input);
    },
    delete${entityName}: async (_, { id }, { services }) => {
      return await services.${entityName}Service.delete${entityName}(id);
    }
  }
};
`;
  
  fs.writeFileSync(resolverFile, resolverContent);
  console.log(`    ✓ Generated ${path.basename(resolverFile)}`);
}

main();
