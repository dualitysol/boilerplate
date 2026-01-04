/**
 * GraphQL Context
 * 
 * This interface defines the context object passed to all GraphQL resolvers.
 * It provides access to services, authentication, and request information.
 */

export interface GraphQLContext {
  /**
   * Current authenticated user (if any)
   */
  user?: {
    id: string
    email: string
    username: string
    role: string
  }

  /**
   * Authentication token
   */
  token?: string

  /**
   * Request headers
   */
  headers: Record<string, string | string[] | undefined>

  /**
   * Services registry - access to all microservices
   */
  services: {
    [serviceName: string]: any
  }

  /**
   * Event bus for publishing events
   */
  eventBus: any

  /**
   * Queue manager for background tasks
   */
  queueManager: any

  /**
   * Database connections
   */
  db: {
    mongodb?: any
    postgres?: any
    redis?: any
  }

  /**
   * Request metadata
   */
  request: {
    id: string
    ip: string
    userAgent?: string
    timestamp: Date
  }

  /**
   * Logger instance
   */
  logger: {
    info: (...args: any[]) => void
    error: (...args: any[]) => void
    warn: (...args: any[]) => void
    debug: (...args: any[]) => void
  }

  /**
   * Data loaders for batching (optional)
   */
  loaders?: {
    [key: string]: any
  }
}

/**
 * Create GraphQL context from request
 */
export function createGraphQLContext(request: any): GraphQLContext {
  return {
    headers: request.headers || {},
    services: {},
    eventBus: null,
    queueManager: null,
    db: {},
    request: {
      id: Math.random().toString(36).substring(7),
      ip: request.ip || 'unknown',
      userAgent: request.headers?.['user-agent'],
      timestamp: new Date()
    },
    logger: console
  }
}
