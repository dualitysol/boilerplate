/**
 * TypeScript decorators for Microservice development
 * Stage 3 decorators support (Node 22+, TypeScript 5+)
 */

/**
 * GraphQL Query decorator metadata
 */
interface GraphQLQueryMetadata {
  name?: string
  description?: string
  returnType?: string
  args?: Record<string, string>
}

/**
 * GraphQL Mutation decorator metadata
 */
interface GraphQLMutationMetadata {
  name?: string
  description?: string
  returnType?: string
  args?: Record<string, string>
}

/**
 * Mark method as GraphQL Query
 * Automatically generates resolver and type definitions
 * 
 * @example
 * ```typescript
 * class UserService extends Microservice {
 *   @GraphQLQuery({ 
 *     description: 'Get user by ID',
 *     returnType: 'User'
 *   })
 *   async findById(id: string): Promise<User> {
 *     return this.model.findOne({ _id: id })
 *   }
 * }
 * ```
 */
export function GraphQLQuery(metadata?: GraphQLQueryMetadata) {
  return function (target: any, context: ClassMethodDecoratorContext) {
    const methodName = String(context.name)
    
    context.addInitializer(function() {
      if (!this.__graphqlQueries) {
        this.__graphqlQueries = new Map()
      }
      this.__graphqlQueries.set(methodName, {
        handler: target,
        metadata: metadata || {}
      })
    })
    
    return target
  }
}

/**
 * Mark method as GraphQL Mutation
 * Automatically generates resolver and type definitions
 * 
 * @example
 * ```typescript
 * class UserService extends Microservice {
 *   @GraphQLMutation({ 
 *     description: 'Create new user',
 *     returnType: 'User'
 *   })
 *   async createUser(input: CreateUserInput): Promise<User> {
 *     return this.model.insert(input)
 *   }
 * }
 * ```
 */
export function GraphQLMutation(metadata?: GraphQLMutationMetadata) {
  return function (target: any, context: ClassMethodDecoratorContext) {
    const methodName = String(context.name)
    
    context.addInitializer(function() {
      if (!this.__graphqlMutations) {
        this.__graphqlMutations = new Map()
      }
      this.__graphqlMutations.set(methodName, {
        handler: target,
        metadata: metadata || {}
      })
    })
    
    return target
  }
}

/**
 * Subscribe to event on service initialization
 * 
 * @example
 * ```typescript
 * class NotificationService extends Microservice {
 *   @Subscribe('user.created')
 *   async onUserCreated(data: { userId: string }) {
 *     await this.sendWelcomeEmail(data.userId)
 *   }
 * }
 * ```
 */
export function Subscribe(event: string) {
  return function (target: any, context: ClassMethodDecoratorContext) {
    const methodName = String(context.name)
    
    context.addInitializer(function() {
      if (!this.__eventSubscriptions) {
        this.__eventSubscriptions = new Map()
      }
      this.__eventSubscriptions.set(event, target.bind(this))
      
      // Auto-subscribe during initialization
      if (this.events) {
        this.events.subscribe(event, target.bind(this))
      }
    })
    
    return target
  }
}

/**
 * Process queue messages
 * 
 * @example
 * ```typescript
 * class EmailService extends Microservice {
 *   @QueueProcessor('email.send', { concurrency: 5 })
 *   async processEmail(message: EmailMessage) {
 *     await this.sendEmail(message)
 *   }
 * }
 * ```
 */
export function QueueProcessor(queueName: string, options?: { concurrency?: number }) {
  return function (target: any, context: ClassMethodDecoratorContext) {
    context.addInitializer(function() {
      if (!this.__queueProcessors) {
        this.__queueProcessors = new Map()
      }
      this.__queueProcessors.set(queueName, {
        handler: target.bind(this),
        options: options || {}
      })
      
      // Auto-process during initialization
      if (this.queue) {
        this.queue.process(queueName, target.bind(this), options)
      }
    })
    
    return target
  }
}

/**
 * Cache method result
 * 
 * @example
 * ```typescript
 * class ProductService extends Microservice {
 *   @Cache({ ttl: 3600 })
 *   async getProducts(): Promise<Product[]> {
 *     return this.model.find({}).toArray()
 *   }
 * }
 * ```
 */
export function Cache(options?: { ttl?: number; key?: string }) {
  return function (target: any, context: ClassMethodDecoratorContext) {
    const methodName = String(context.name)
    
    return async function(this: any, ...args: any[]) {
      const cacheKey = options?.key || `${this.name}:${methodName}:${JSON.stringify(args)}`
      
      // Try to get from cache
      if (this.storage?.cache) {
        const cached = await this.storage.cache.get(cacheKey)
        if (cached) return cached
      }
      
      // Execute original method
      const result = await target.apply(this, args)
      
      // Store in cache
      if (this.storage?.cache) {
        await this.storage.cache.set(cacheKey, result, options?.ttl || 3600)
      }
      
      return result
    }
  }
}

/**
 * Validate method arguments
 * 
 * @example
 * ```typescript
 * class UserService extends Microservice {
 *   @Validate
 *   async createUser(@Required email: string, @Optional name?: string) {
 *     // email is guaranteed to be non-null
 *   }
 * }
 * ```
 */
export function Validate(target: any, context: ClassMethodDecoratorContext) {
  return async function(this: any, ...args: any[]) {
    // Validation logic will be auto-generated from TypeScript types
    const result = await target.apply(this, args)
    return result
  }
}

/**
 * Log method execution
 * 
 * @example
 * ```typescript
 * class UserService extends Microservice {
 *   @Log
 *   async deleteUser(id: string) {
 *     // Automatically logs: "Calling deleteUser with args: [id]"
 *   }
 * }
 * ```
 */
export function Log(target: any, context: ClassMethodDecoratorContext) {
  const methodName = String(context.name)
  
  return async function(this: any, ...args: any[]) {
    this.logger?.debug(`Calling ${methodName}`, { args })
    
    const start = Date.now()
    try {
      const result = await target.apply(this, args)
      const duration = Date.now() - start
      this.logger?.debug(`${methodName} completed in ${duration}ms`)
      return result
    } catch (error) {
      const duration = Date.now() - start
      this.logger?.error(`${methodName} failed after ${duration}ms`, error)
      throw error
    }
  }
}

/**
 * Retry failed operations
 * 
 * @example
 * ```typescript
 * class PaymentService extends Microservice {
 *   @Retry({ attempts: 3, delay: 1000 })
 *   async processPayment(orderId: string) {
 *     // Will retry up to 3 times with 1s delay
 *   }
 * }
 * ```
 */
export function Retry(options: { attempts?: number; delay?: number } = {}) {
  return function (target: any, context: ClassMethodDecoratorContext) {
    const methodName = String(context.name)
    const maxAttempts = options.attempts || 3
    const delay = options.delay || 1000
    
    return async function(this: any, ...args: any[]) {
      let lastError: Error | undefined
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await target.apply(this, args)
        } catch (error) {
          lastError = error as Error
          this.logger?.warn(`${methodName} failed (attempt ${attempt}/${maxAttempts})`, { error })
          
          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, delay))
          }
        }
      }
      
      throw lastError
    }
  }
}

export {
  GraphQLQueryMetadata,
  GraphQLMutationMetadata
}

/**
 * Legacy reflect-metadata based decorators (for compatibility)
 * These use the old decorator syntax and work with older TypeScript versions
 */
export * from './service.js'

/**
 * Guards - Authorization and Access Control Decorators
 */

/**
 * Require specific role(s) to execute method
 * Checks context.user.roles or context.callerRoleId
 * 
 * @example
 * ```typescript
 * class UserService extends Microservice {
 *   @RequireRole('admin', 'moderator')
 *   async deleteUser(id: string, context: Context) {
 *     // Only admins or moderators can call this
 *   }
 * }
 * ```
 */
export function RequireRole(...roles: string[]) {
  return function (target: any, context: ClassMethodDecoratorContext) {
    const methodName = String(context.name)
    
    return async function(this: any, ...args: any[]) {
      // Extract context from arguments (usually last argument)
      const ctx = args.find((arg: any) => arg && (arg.user || arg.callerRoleId || arg.services))
      
      if (!ctx) {
        throw new Error(`@RequireRole: Context not found in ${methodName} arguments`)
      }
      
      // Check if it's an internal call (bypass role check)
      if (ctx.internalCall) {
        this.logger?.debug(`@RequireRole bypassed for internal call: ${methodName}`)
        return target.apply(this, args)
      }
      
      const userRoles = ctx.user?.roles || []
      const callerRole = ctx.callerRoleId
      
      const hasRole = roles.some(role => 
        userRoles.includes(role) || callerRole === role
      )
      
      if (!hasRole) {
        throw new Error(`Forbidden: Required roles: ${roles.join(', ')}. User roles: ${userRoles.join(', ')}`)
      }
      
      this.logger?.debug(`@RequireRole passed for ${methodName}`, { requiredRoles: roles, userRoles })
      return target.apply(this, args)
    }
  }
}

/**
 * Require specific permission(s) to execute method
 * Checks context.user.permissions
 * 
 * @example
 * ```typescript
 * class ArticleService extends Microservice {
 *   @RequirePermission('articles.write', 'articles.publish')
 *   async publishArticle(id: string, context: Context) {
 *     // User must have articles.write AND articles.publish permissions
 *   }
 * }
 * ```
 */
export function RequirePermission(...permissions: string[]) {
  return function (target: any, context: ClassMethodDecoratorContext) {
    const methodName = String(context.name)
    
    return async function(this: any, ...args: any[]) {
      const ctx = args.find((arg: any) => arg && (arg.user || arg.callerRoleId || arg.services))
      
      if (!ctx) {
        throw new Error(`@RequirePermission: Context not found in ${methodName} arguments`)
      }
      
      // Bypass for internal calls
      if (ctx.internalCall) {
        this.logger?.debug(`@RequirePermission bypassed for internal call: ${methodName}`)
        return target.apply(this, args)
      }
      
      const userPermissions = ctx.user?.permissions || []
      
      const hasAllPermissions = permissions.every(perm => userPermissions.includes(perm))
      
      if (!hasAllPermissions) {
        throw new Error(`Forbidden: Required permissions: ${permissions.join(', ')}`)
      }
      
      this.logger?.debug(`@RequirePermission passed for ${methodName}`, { requiredPermissions: permissions, userPermissions })
      return target.apply(this, args)
    }
  }
}

/**
 * Only allow internal service-to-service calls
 * Rejects external API calls
 * 
 * @example
 * ```typescript
 * class UserService extends Microservice {
 *   @InternalOnly
 *   async getInternalUserData(id: string, context: Context) {
 *     // Only accessible from other services
 *   }
 * }
 * ```
 */
export function InternalOnly(target: any, context: ClassMethodDecoratorContext) {
  const methodName = String(context.name)
  
  return async function(this: any, ...args: any[]) {
    const ctx = args.find((arg: any) => arg && (arg.user || arg.callerRoleId || arg.services || arg.internalCall !== undefined))
    
    if (!ctx) {
      throw new Error(`@InternalOnly: Context not found in ${methodName} arguments`)
    }
    
    if (!ctx.internalCall) {
      throw new Error(`Forbidden: ${methodName} is only accessible for internal service calls`)
    }
    
    this.logger?.debug(`@InternalOnly check passed for ${methodName}`)
    return target.apply(this, args)
  }
}

/**
 * Require authentication (user must be logged in)
 * 
 * @example
 * ```typescript
 * class ProfileService extends Microservice {
 *   @RequireAuth
 *   async getMyProfile(context: Context) {
 *     return context.user
 *   }
 * }
 * ```
 */
export function RequireAuth(target: any, context: ClassMethodDecoratorContext) {
  const methodName = String(context.name)
  
  return async function(this: any, ...args: any[]) {
    const ctx = args.find((arg: any) => arg && (arg.user || arg.callerRoleId || arg.services))
    
    if (!ctx) {
      throw new Error(`@RequireAuth: Context not found in ${methodName} arguments`)
    }
    
    // Bypass for internal calls
    if (ctx.internalCall) {
      this.logger?.debug(`@RequireAuth bypassed for internal call: ${methodName}`)
      return target.apply(this, args)
    }
    
    if (!ctx.user || !ctx.user.id) {
      throw new Error('Unauthorized: User must be authenticated')
    }
    
    this.logger?.debug(`@RequireAuth passed for ${methodName}`, { userId: ctx.user.id })
    return target.apply(this, args)
  }
}

/**
 * Custom guard with validation function
 * 
 * @example
 * ```typescript
 * class OrderService extends Microservice {
 *   @Guard((context: Context, orderId: string) => {
 *     return context.user?.id === orderId.userId
 *   })
 *   async cancelOrder(orderId: string, context: Context) {
 *     // Only order owner can cancel
 *   }
 * }
 * ```
 */
export function Guard(validator: (...args: any[]) => boolean | Promise<boolean>, errorMessage?: string) {
  return function (target: any, context: ClassMethodDecoratorContext) {
    const methodName = String(context.name)
    
    return async function(this: any, ...args: any[]) {
      const isValid = await validator(...args)
      
      if (!isValid) {
        throw new Error(errorMessage || `Guard validation failed for ${methodName}`)
      }
      
      return target.apply(this, args)
    }
  }
}
