/**
 * Rate Limit Decorators
 * 
 * @example
 * ```javascript
 * import { RateLimit } from '@microservice-framework/boilerplate/ratelimit';
 * 
 * class UserService extends Microservice {
 *   @RateLimit({ points: 10, duration: 60 })
 *   async getUser(id, context) {
 *     return this.findOne({ _id: id });
 *   }
 *   
 *   @RateLimit({ 
 *     points: 5, 
 *     duration: 60,
 *     keyGenerator: (args, context) => context.user?.id || context.ip
 *   })
 *   async createPost(data, context) {
 *     return this.createOne(data);
 *   }
 * }
 * ```
 */

import 'reflect-metadata';
import { RateLimiter } from './RateLimiter.js';

// Global rate limiter instances
const rateLimiters = new Map();

/**
 * Get or create rate limiter for configuration
 */
function getRateLimiter(config) {
  const key = JSON.stringify(config);
  
  if (!rateLimiters.has(key)) {
    rateLimiters.set(key, new RateLimiter(config));
  }
  
  return rateLimiters.get(key);
}

/**
 * @RateLimit decorator - Apply rate limiting to method
 * 
 * @param {Object} options - Rate limit options
 * @param {number} options.points - Max requests allowed
 * @param {number} options.duration - Time window in seconds
 * @param {string} options.limitType - Limit type ('perUser', 'perIP', 'global')
 * @param {Function} options.keyGenerator - Custom key generator
 * @param {string} options.message - Custom error message
 * @param {number} options.blockDuration - Block duration after limit exceeded
 * @param {string} options.storage - Storage type ('memory' or 'redis')
 * @param {Object} options.redis - Redis client (if storage='redis')
 */
export function RateLimit(options = {}) {
  return function(target, context) {
    const methodName = String(context.name);
    
    // Create rate limiter config
    const config = {
      storage: options.storage || 'memory',
      redis: options.redis,
      limits: {
        [options.limitType || 'perUser']: {
          points: options.points || 10,
          duration: options.duration || 60,
          blockDuration: options.blockDuration || 0
        }
      }
    };
    
    const limiter = getRateLimiter(config);
    const limitType = options.limitType || 'perUser';
    const message = options.message || `Rate limit exceeded for ${methodName}`;
    
    // Default key generator
    const defaultKeyGenerator = (args, context) => {
      if (limitType === 'global') {
        return 'global';
      }
      return context.user?.id || context.ip || 'anonymous';
    };
    
    const keyGenerator = options.keyGenerator || defaultKeyGenerator;
    
    return async function(...args) {
      // Extract context from arguments (usually last argument)
      const contextArg = args.find(arg => 
        arg && (arg.user || arg.ip || arg.services || arg.internalCall !== undefined)
      );
      
      if (!contextArg) {
        console.warn(`@RateLimit: Context not found in ${methodName} arguments`);
        return target.apply(this, args);
      }
      
      // Skip rate limiting for internal calls
      if (contextArg.internalCall) {
        return target.apply(this, args);
      }
      
      // Generate identifier
      const identifier = keyGenerator(args, contextArg);
      
      try {
        // Consume from rate limit
        const result = await limiter.consume(identifier, 1, limitType);
        
        if (!result.allowed) {
          const error = new Error(message);
          error.code = 'RATE_LIMIT_EXCEEDED';
          error.retryAfter = result.retryAfter;
          error.remaining = result.remaining;
          error.resetAt = result.resetAt;
          throw error;
        }
        
        // Store rate limit info in context for monitoring
        if (contextArg.rateLimit) {
          contextArg.rateLimit[methodName] = {
            remaining: result.remaining,
            total: result.total,
            resetAt: result.resetAt
          };
        }
        
        // Execute method
        return await target.apply(this, args);
      } catch (error) {
        if (error.code === 'RATE_LIMIT_EXCEEDED') {
          throw error;
        }
        
        // If rate limiter fails, log and continue
        console.error('Rate limiter error:', error);
        return target.apply(this, args);
      }
    };
  };
}

/**
 * @RateLimitByIP decorator - Rate limit by IP address
 */
export function RateLimitByIP(options = {}) {
  return RateLimit({
    ...options,
    limitType: 'perIP',
    keyGenerator: (args, context) => context.ip || 'unknown'
  });
}

/**
 * @RateLimitGlobal decorator - Global rate limit (all requests)
 */
export function RateLimitGlobal(options = {}) {
  return RateLimit({
    ...options,
    limitType: 'global',
    keyGenerator: () => 'global'
  });
}

/**
 * @RateLimitByUser decorator - Rate limit by authenticated user
 */
export function RateLimitByUser(options = {}) {
  return RateLimit({
    ...options,
    limitType: 'perUser',
    keyGenerator: (args, context) => {
      if (!context.user?.id) {
        throw new Error('Authentication required for rate limiting');
      }
      return context.user.id;
    }
  });
}

/**
 * Get rate limit metadata from method
 */
export function getRateLimitMetadata(target, methodName) {
  return Reflect.getMetadata('ratelimit:config', target, methodName);
}

/**
 * Store rate limit configuration in metadata
 */
export function setRateLimitMetadata(target, methodName, config) {
  Reflect.defineMetadata('ratelimit:config', config, target, methodName);
}

/**
 * Destroy all rate limiters (for cleanup)
 */
export async function destroyAllRateLimiters() {
  for (const limiter of rateLimiters.values()) {
    await limiter.destroy();
  }
  rateLimiters.clear();
}

export default {
  RateLimit,
  RateLimitByIP,
  RateLimitGlobal,
  RateLimitByUser,
  getRateLimitMetadata,
  setRateLimitMetadata,
  destroyAllRateLimiters
};
