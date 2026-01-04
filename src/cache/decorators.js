/**
 * Cache Decorators
 * 
 * Automatically cache method results with @Cache decorator
 * 
 * @example
 * ```javascript
 * import { Cached, Cache, CacheInvalidate } from '@microservice-framework/boilerplate/cache';
 * 
 * @Cached()
 * class ProductService {
 *   @Cache({ ttl: 3600, key: (id) => `product:${id}` })
 *   async getProduct(id) {
 *     return await db.products.findOne({ id });
 *   }
 *   
 *   @CacheInvalidate({ pattern: 'product:*' })
 *   async updateProduct(id, data) {
 *     return await db.products.update({ id }, data);
 *   }
 * }
 * ```
 */

import 'reflect-metadata';

// Global cache manager instance
let globalCacheManager = null;

/**
 * Set global cache manager
 */
export function setGlobalCacheManager(manager) {
  globalCacheManager = manager;
}

/**
 * Get global cache manager
 */
export function getGlobalCacheManager() {
  return globalCacheManager;
}

/**
 * @Cached decorator - Mark class as cached
 */
export function Cached(options = {}) {
  return function(target) {
    Reflect.defineMetadata('cache:enabled', true, target);
    Reflect.defineMetadata('cache:options', options, target);
    return target;
  };
}

/**
 * Generate cache key from arguments
 */
function generateCacheKey(methodName, args, keyGenerator) {
  if (keyGenerator) {
    return keyGenerator(...args);
  }
  
  // Default: method name + JSON args
  const argsKey = args.length > 0 ? JSON.stringify(args) : '';
  return `${methodName}:${argsKey}`;
}

/**
 * @Cache decorator - Cache method results
 */
export function Cache(options = {}) {
  return function(target, context) {
    const methodName = String(context.name);
    
    return async function(...args) {
      const classOptions = Reflect.getMetadata('cache:options', this.constructor) || {};
      
      // Get cache manager
      const cacheManager = globalCacheManager || this.cacheManager;
      
      if (!cacheManager) {
        console.warn(`@Cache: No cache manager configured for ${methodName}`);
        return await target.apply(this, args);
      }
      
      // Generate cache key
      const cacheKey = generateCacheKey(
        methodName,
        args,
        options.key || classOptions.key
      );
      
      // Get TTL
      const ttl = options.ttl !== undefined ? options.ttl : classOptions.ttl;
      
      // Check if should bypass cache (internal calls)
      const context = args.find(arg => arg && typeof arg === 'object' && arg.internal);
      if (context?.internal) {
        return await target.apply(this, args);
      }
      
      try {
        // Try cache-aside pattern
        const value = await cacheManager.get(cacheKey, async () => {
          return await target.apply(this, args);
        }, ttl);
        
        return value;
      } catch (error) {
        console.error(`Cache error in ${methodName}:`, error);
        // Fallback to direct execution
        return await target.apply(this, args);
      }
    };
  };
}

/**
 * @CacheInvalidate decorator - Invalidate cache after method execution
 */
export function CacheInvalidate(options = {}) {
  return function(target, context) {
    const methodName = String(context.name);
    
    return async function(...args) {
      // Execute original method first
      const result = await target.apply(this, args);
      
      // Get cache manager
      const cacheManager = globalCacheManager || this.cacheManager;
      
      if (!cacheManager) {
        return result;
      }
      
      try {
        // Invalidate by pattern
        if (options.pattern) {
          const pattern = typeof options.pattern === 'function' 
            ? options.pattern(...args)
            : options.pattern;
          
          await cacheManager.deletePattern(pattern);
        }
        
        // Invalidate by key
        if (options.key) {
          const key = typeof options.key === 'function'
            ? options.key(...args)
            : options.key;
          
          await cacheManager.delete(key);
        }
        
        // Invalidate by tags
        if (options.tags) {
          const tags = typeof options.tags === 'function'
            ? options.tags(...args)
            : options.tags;
          
          await cacheManager.deleteTags(tags);
        }
      } catch (error) {
        console.error(`Cache invalidation error in ${methodName}:`, error);
      }
      
      return result;
    };
  };
}

/**
 * @CacheWarm decorator - Warm cache after method execution
 */
export function CacheWarm(options = {}) {
  return function(target, context) {
    const methodName = String(context.name);
    
    return async function(...args) {
      // Execute original method
      const result = await target.apply(this, args);
      
      // Get cache manager
      const cacheManager = globalCacheManager || this.cacheManager;
      
      if (!cacheManager) {
        return result;
      }
      
      try {
        // Generate cache key
        const cacheKey = generateCacheKey(
          methodName,
          args,
          options.key
        );
        
        // Warm cache
        await cacheManager.set(cacheKey, result, options.ttl);
      } catch (error) {
        console.error(`Cache warm error in ${methodName}:`, error);
      }
      
      return result;
    };
  };
}

/**
 * @CacheEvict decorator - Evict all cache
 */
export function CacheEvict() {
  return function(target, context) {
    const methodName = String(context.name);
    
    return async function(...args) {
      // Execute original method
      const result = await target.apply(this, args);
      
      // Get cache manager
      const cacheManager = globalCacheManager || this.cacheManager;
      
      if (!cacheManager) {
        return result;
      }
      
      try {
        await cacheManager.clear();
      } catch (error) {
        console.error(`Cache evict error in ${methodName}:`, error);
      }
      
      return result;
    };
  };
}

/**
 * Create cache middleware for HTTP
 */
export function createCacheMiddleware(cacheManager, options = {}) {
  const {
    methods = ['GET'],
    skipPaths = ['/health', '/metrics', '/graphql'],
    ttl = 60,
    keyGenerator = (req) => `http:${req.method}:${req.path}:${JSON.stringify(req.query)}`
  } = options;
  
  return async function cacheMiddleware(req, res, next) {
    // Skip certain paths
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }
    
    // Only cache specified methods
    if (!methods.includes(req.method)) {
      return next();
    }
    
    // Generate cache key
    const cacheKey = keyGenerator(req);
    
    try {
      // Try to get from cache
      const cached = await cacheManager.get(cacheKey);
      
      if (cached !== null) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
      }
      
      // Capture original json method
      const originalJson = res.json.bind(res);
      
      // Override res.json to cache response
      res.json = function(data) {
        // Cache the response
        cacheManager.set(cacheKey, data, ttl).catch(err => {
          console.error('Cache set error:', err);
        });
        
        res.setHeader('X-Cache', 'MISS');
        return originalJson(data);
      };
      
      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
}

export default {
  Cached,
  Cache,
  CacheInvalidate,
  CacheWarm,
  CacheEvict,
  setGlobalCacheManager,
  getGlobalCacheManager,
  createCacheMiddleware
};
