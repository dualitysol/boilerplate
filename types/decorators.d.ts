/**
 * TypeScript decorators for Microservice development
 */

/**
 * Context type for Guards
 */
export interface Context {
  services?: any
  user?: {
    id: string
    email?: string
    roles?: string[]
    permissions?: string[]
  }
  callerRoleId?: string
  internalCall?: boolean
  metadata?: Record<string, any>
  [key: string]: any
}

/**
 * GraphQL Query decorator metadata
 */
export interface GraphQLQueryMetadata {
  name?: string
  description?: string
  returnType?: string
  args?: Record<string, string>
}

/**
 * GraphQL Mutation decorator metadata
 */
export interface GraphQLMutationMetadata {
  name?: string
  description?: string
  returnType?: string
  args?: Record<string, string>
}

/**
 * Mark method as GraphQL Query
 */
export function GraphQLQuery(metadata?: GraphQLQueryMetadata): MethodDecorator

/**
 * Mark method as GraphQL Mutation
 */
export function GraphQLMutation(metadata?: GraphQLMutationMetadata): MethodDecorator

/**
 * Subscribe to event on service initialization
 */
export function Subscribe(event: string): MethodDecorator

/**
 * Process queue messages
 */
export function QueueProcessor(queueName: string, options?: { concurrency?: number }): MethodDecorator

/**
 * Cache method result
 */
export function Cache(options?: { ttl?: number; key?: string }): MethodDecorator

/**
 * Validate method arguments
 */
export function Validate(target: any, context: ClassMethodDecoratorContext): any

/**
 * Log method execution
 */
export function Log(target: any, context: ClassMethodDecoratorContext): any

/**
 * Retry failed operations
 */
export function Retry(options?: { attempts?: number; delay?: number }): MethodDecorator

/**
 * Guards - Authorization and Access Control
 */

/**
 * Require specific role(s) to execute method
 */
export function RequireRole(...roles: string[]): MethodDecorator

/**
 * Require specific permission(s) to execute method
 */
export function RequirePermission(...permissions: string[]): MethodDecorator

/**
 * Only allow internal service-to-service calls
 */
export function InternalOnly(target: any, context: ClassMethodDecoratorContext): any

/**
 * Require authentication (user must be logged in)
 */
export function RequireAuth(target: any, context: ClassMethodDecoratorContext): any

/**
 * Custom guard with validation function
 */
export function Guard(
  validator: (...args: any[]) => boolean | Promise<boolean>,
  errorMessage?: string
): MethodDecorator
