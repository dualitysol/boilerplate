#!/usr/bin/env node

/**
 * Generate TypeScript definitions from GraphQL schemas
 * Usage: node bin/generate-types.js [services-path]
 */

import path from 'path'
import fs from 'fs-extra'
import { fileURLToPath } from 'url'
import { generateTypes, generateServiceRegistryTypes } from '../src/codegen/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const servicesPath = process.argv[2] || path.join(process.cwd(), 'services')
const typesPath = path.join(process.cwd(), 'types')

async function main() {
  console.log('🔧 Generating TypeScript definitions...\n')
  
  if (!await fs.pathExists(servicesPath)) {
    console.error(`❌ Services directory not found: ${servicesPath}`)
    process.exit(1)
  }
  
  const services = await fs.readdir(servicesPath)
  
  // Generate types for each service
  for (const service of services) {
    const servicePath = path.join(servicesPath, service)
    const stats = await fs.stat(servicePath)
    
    if (!stats.isDirectory()) continue
    
    // Check for both old and new naming conventions
    const typeDefsPath = path.join(servicePath, 'typeDefinitions')
    const oldTypeDefsPath = path.join(servicePath, 'typeDefs')
    
    let actualTypeDefsPath = null
    if (await fs.pathExists(typeDefsPath)) {
      actualTypeDefsPath = typeDefsPath
    } else if (await fs.pathExists(oldTypeDefsPath)) {
      actualTypeDefsPath = oldTypeDefsPath
    }
    
    if (!actualTypeDefsPath) {
      console.log(`⏭️  Skipping ${service} (no typeDefinitions)`)
      continue
    }
    
    const outputPath = path.join(typesPath, `${service}.d.ts`)
    
    try {
      await generateTypes(actualTypeDefsPath, outputPath)
    } catch (error) {
      console.error(`❌ Failed to generate types for ${service}:`, error.message)
    }
  }
  
  // Generate service registry types
  await generateServiceRegistryTypes(
    servicesPath,
    path.join(typesPath, 'service-registry.d.ts')
  )
  
  // Generate global types
  await generateGlobalTypes(typesPath)
  
  console.log('\n✅ Type generation complete!')
}

/**
 * Generate global type definitions
 */
async function generateGlobalTypes(typesPath) {
  const content = `// Global type definitions for the project

import type { ServiceRegistry } from './service-registry'

declare global {
  /**
   * GraphQL resolver context
   */
  interface Context {
    services: ServiceRegistry
    user?: {
      id: string
      email: string
      roles: string[]
      permissions?: string[]
    }
    /** 
     * Role ID of the caller (for internal service-to-service calls or external API calls)
     * Used for fine-grained access control and Guards
     */
    callerRoleId?: string
    /**
     * Indicates if this is an internal service-to-service call
     * When true, some guards may be bypassed
     */
    internalCall?: boolean
    /**
     * Additional metadata for request tracking and debugging
     */
    metadata?: {
      requestId?: string
      traceId?: string
      timestamp?: number
      source?: string
      [key: string]: any
    }
    session?: Record<string, unknown>
    request?: any
    response?: any
  }
  
  /**
   * Resolver parent type
   */
  type ResolverParent<T = any> = T
  
  /**
   * Resolver function signature
   */
  type ResolverFn<TResult, TParent = any, TArgs = any> = (
    parent: TParent,
    args: TArgs,
    context: Context,
    info?: any
  ) => Promise<TResult> | TResult
}

export {}
`
  
  await fs.writeFile(path.join(typesPath, 'global.d.ts'), content)
  console.log(`✅ Generated global types: ${path.join(typesPath, 'global.d.ts')}`)
}

main().catch(error => {
  console.error('❌ Error:', error)
  process.exit(1)
})
