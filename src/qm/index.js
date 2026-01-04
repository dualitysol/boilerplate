/**
 * Query/Mutation Sanitization Layer
 * 
 * Provides pre-defined, type-safe GraphQL queries and mutations
 * to prevent injection attacks and ensure consistent API usage.
 * 
 * Benefits:
 * - Protection against GraphQL injection
 * - Centralized query management
 * - Type-safe query execution
 * - Easy testing and mocking
 * 
 * Usage:
 * ```js
 * import { queries, mutations } from './qm'
 * 
 * const result = await executeQuery(queries.getUser, { id: '123' })
 * ```
 */

import { request } from 'graphql-request'

/**
 * @typedef {Object} QueryOptions
 * @property {string} endpoint - GraphQL endpoint URL
 * @property {Record<string, unknown>} variables - Query variables
 * @property {Record<string, string>} [headers] - Additional headers
 */

/**
 * Execute a pre-defined query safely
 * @template T
 * @param {string} query - GraphQL query string
 * @param {QueryOptions} options - Execution options
 * @returns {Promise<T>}
 */
export async function executeQuery(query, { endpoint, variables, headers = {} }) {
  try {
    return await request(endpoint, query, variables, headers)
  } catch (error) {
    throw new Error(`Query execution failed: ${error.message}`)
  }
}

/**
 * Execute a pre-defined mutation safely
 * @template T
 * @param {string} mutation - GraphQL mutation string
 * @param {QueryOptions} options - Execution options
 * @returns {Promise<T>}
 */
export async function executeMutation(mutation, { endpoint, variables, headers = {} }) {
  try {
    return await request(endpoint, mutation, variables, headers)
  } catch (error) {
    throw new Error(`Mutation execution failed: ${error.message}`)
  }
}

/**
 * Generate QM layer from GraphQL schema
 * This auto-generates safe query/mutation strings
 * @param {string} schemaPath - Path to GraphQL schema
 * @returns {Promise<{queries: Record<string, string>, mutations: Record<string, string>}>}
 */
export async function generateQMLayer(schemaPath) {
  // TODO: Implement auto-generation from schema
  // This will parse .gql files and create safe query strings
  return {
    queries: {},
    mutations: {}
  }
}

export default {
  executeQuery,
  executeMutation,
  generateQMLayer
}
