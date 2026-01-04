/**
 * GraphQL to TypeScript code generation utilities
 * Generates .d.ts files from .gql schemas for JSDoc type hints
 */

import fs from 'fs-extra'
import path from 'path'
import { parse, buildSchema } from 'graphql'

/**
 * @typedef {Object} TypeDefinition
 * @property {string} name - Type name
 * @property {string} kind - Type kind (ObjectType, InputType, etc)
 * @property {Array<FieldDefinition>} fields - Type fields
 */

/**
 * @typedef {Object} FieldDefinition
 * @property {string} name - Field name
 * @property {string} type - Field type
 * @property {boolean} required - Is field required
 * @property {boolean} list - Is field a list
 */

/**
 * Generate TypeScript definitions from GraphQL schema
 * @param {string} schemaPath - Path to .gql file or directory
 * @param {string} outputPath - Output path for .d.ts file
 * @returns {Promise<void>}
 */
export async function generateTypes(schemaPath, outputPath) {
  const schemaContent = await loadGraphQLSchema(schemaPath)
  const schema = buildSchema(schemaContent)
  
  const typeMap = schema.getTypeMap()
  const types = []
  
  // Generate types
  for (const [typeName, type] of Object.entries(typeMap)) {
    // Skip internal GraphQL types
    if (typeName.startsWith('__')) continue
    
    if (type.astNode?.kind === 'ObjectTypeDefinition') {
      types.push(generateObjectType(type))
    } else if (type.astNode?.kind === 'InputObjectTypeDefinition') {
      types.push(generateInputType(type))
    } else if (type.astNode?.kind === 'EnumTypeDefinition') {
      types.push(generateEnumType(type))
    }
  }
  
  // Generate resolver types
  const resolverTypes = generateResolverTypes(schema)
  
  const content = `// Auto-generated TypeScript definitions from GraphQL schema
// Do not edit manually - run 'npm run generate:types' to regenerate

${types.join('\n\n')}

${resolverTypes}

// Context type for resolvers
export interface Context {
  services: ServiceRegistry
  user?: any
  session?: any
  dataSources?: any
}

// Service registry with all available services
export interface ServiceRegistry {
  [serviceName: string]: any
}
`
  
  await fs.ensureDir(path.dirname(outputPath))
  await fs.writeFile(outputPath, content)
  
  console.log(`✅ Generated types: ${outputPath}`)
}

/**
 * Load GraphQL schema from file or directory
 * @param {string} schemaPath - Path to schema
 * @returns {Promise<string>}
 */
async function loadGraphQLSchema(schemaPath) {
  const stats = await fs.stat(schemaPath)
  
  if (stats.isFile()) {
    return fs.readFile(schemaPath, 'utf-8')
  }
  
  // Load all .gql files from directory
  const files = await fs.readdir(schemaPath, { recursive: true })
  const gqlFiles = files.filter(f => f.endsWith('.gql'))
  
  const schemas = await Promise.all(
    gqlFiles.map(f => fs.readFile(path.join(schemaPath, f), 'utf-8'))
  )
  
  return schemas.join('\n\n')
}

/**
 * Generate TypeScript interface from GraphQL ObjectType
 * @param {any} type - GraphQL type
 * @returns {string}
 */
function generateObjectType(type) {
  const fields = Object.values(type.getFields()).map(field => {
    const tsType = graphqlTypeToTS(field.type)
    const optional = field.type.toString().endsWith('!') ? '' : '?'
    return `  ${field.name}${optional}: ${tsType}`
  })
  
  return `export interface ${type.name} {
${fields.join('\n')}
}`
}

/**
 * Generate TypeScript interface from GraphQL InputType
 * @param {any} type - GraphQL input type
 * @returns {string}
 */
function generateInputType(type) {
  const fields = Object.values(type.getFields()).map(field => {
    const tsType = graphqlTypeToTS(field.type)
    const optional = field.type.toString().endsWith('!') ? '' : '?'
    return `  ${field.name}${optional}: ${tsType}`
  })
  
  return `export interface ${type.name} {
${fields.join('\n')}
}`
}

/**
 * Generate TypeScript enum from GraphQL EnumType
 * @param {any} type - GraphQL enum type
 * @returns {string}
 */
function generateEnumType(type) {
  const values = type.getValues().map(v => `  ${v.name} = '${v.value}'`)
  
  return `export enum ${type.name} {
${values.join(',\n')}
}`
}

/**
 * Generate resolver type definitions
 * @param {any} schema - GraphQL schema
 * @returns {string}
 */
function generateResolverTypes(schema) {
  const queryType = schema.getQueryType()
  const mutationType = schema.getMutationType()
  
  let resolvers = '// Resolver types\n'
  resolvers += 'export interface Resolvers {\n'
  
  if (queryType) {
    resolvers += '  Query?: QueryResolvers\n'
  }
  
  if (mutationType) {
    resolvers += '  Mutation?: MutationResolvers\n'
  }
  
  resolvers += '}\n\n'
  
  if (queryType) {
    resolvers += generateResolverInterface('Query', queryType)
  }
  
  if (mutationType) {
    resolvers += generateResolverInterface('Mutation', mutationType)
  }
  
  return resolvers
}

/**
 * Generate resolver interface for Query or Mutation
 * @param {string} name - Resolver name
 * @param {any} type - GraphQL type
 * @returns {string}
 */
function generateResolverInterface(name, type) {
  const fields = Object.values(type.getFields()).map(field => {
    const returnType = graphqlTypeToTS(field.type)
    const args = field.args.length > 0 
      ? `args: { ${field.args.map(arg => {
          const argType = graphqlTypeToTS(arg.type)
          const optional = arg.type.toString().endsWith('!') ? '' : '?'
          return `${arg.name}${optional}: ${argType}`
        }).join(', ')} }` 
      : 'args: Record<string, never>'
    
    return `  ${field.name}?: (parent: any, ${args}, context: Context) => Promise<${returnType}> | ${returnType}`
  })
  
  return `export interface ${name}Resolvers {
${fields.join('\n')}
}\n\n`
}

/**
 * Convert GraphQL type to TypeScript type
 * @param {any} type - GraphQL type
 * @returns {string}
 */
function graphqlTypeToTS(type) {
  const typeStr = type.toString()
  
  // Handle list types
  if (typeStr.includes('[')) {
    const innerType = typeStr.replace(/[\[\]!]/g, '')
    return `Array<${graphqlScalarToTS(innerType)}>`
  }
  
  // Handle non-null types
  const cleanType = typeStr.replace('!', '')
  return graphqlScalarToTS(cleanType)
}

/**
 * Convert GraphQL scalar to TypeScript type
 * @param {string} type - GraphQL scalar type
 * @returns {string}
 */
function graphqlScalarToTS(type) {
  const scalarMap = {
    'String': 'string',
    'Int': 'number',
    'Float': 'number',
    'Boolean': 'boolean',
    'ID': 'string',
    'DateTime': 'Date',
    'JSON': 'Record<string, unknown>'
  }
  
  return scalarMap[type] || type
}

/**
 * Generate service registry types based on available services
 * @param {string} servicesPath - Path to services directory
 * @param {string} outputPath - Output path for service-registry.d.ts
 * @returns {Promise<void>}
 */
export async function generateServiceRegistryTypes(servicesPath, outputPath) {
  const services = await fs.readdir(servicesPath)
  const serviceImports = []
  const serviceRegistry = []
  
  for (const service of services) {
    const servicePath = path.join(servicesPath, service)
    const stats = await fs.stat(servicePath)
    
    if (!stats.isDirectory()) continue
    
    // Check for both .js and .ts files
    const modelPathJS = path.join(servicePath, 'model', 'index.js')
    const modelPathTS = path.join(servicePath, 'model', 'index.ts')
    const hasModel = await fs.pathExists(modelPathJS) || await fs.pathExists(modelPathTS)
    
    if (!hasModel) continue
    
    serviceImports.push(`import type { ${service} } from '../services/${service}/model'`)
    serviceRegistry.push(`  ${service}: ${service}`)
  }
  
  const content = `// Auto-generated service registry types
// Do not edit manually

${serviceImports.join('\n')}

export interface ServiceRegistry {
${serviceRegistry.join('\n')}
}
`
  
  await fs.ensureDir(path.dirname(outputPath))
  await fs.writeFile(outputPath, content)
  
  console.log(`✅ Generated service registry types: ${outputPath}`)
}

export default {
  generateTypes,
  generateServiceRegistryTypes
}
