/**
 * Caching decorators
 */

/**
 * Cache method result
 */
export function Cache(options?: CacheOptions): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      const cache = this.cache
      
      if (!cache) {
        return originalMethod.apply(this, args)
      }
      
      // Generate cache key
      const key = options?.key 
        ? typeof options.key === 'function'
          ? options.key(...args)
          : options.key
        : `${target.constructor.name}:${String(propertyKey)}:${JSON.stringify(args)}`
      
      // Check cache
      const cached = await cache.get(key)
      if (cached !== null && cached !== undefined) {
        return cached
      }
      
      // Execute method
      const result = await originalMethod.apply(this, args)
      
      // Store in cache
      await cache.set(key, result, options?.ttl || 3600)
      
      return result
    }
  }
}

interface CacheOptions {
  /**
   * Cache key (can be function)
   */
  key?: string | ((...args: any[]) => string)
  
  /**
   * Time to live in seconds
   */
  ttl?: number
  
  /**
   * Cache conditions
   */
  condition?: (...args: any[]) => boolean
}

/**
 * Invalidate cache
 */
export function InvalidateCache(keys: string | string[] | ((...args: any[]) => string | string[])): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args)
      
      const cache = this.cache
      if (cache) {
        const keysToInvalidate = typeof keys === 'function'
          ? keys(...args)
          : keys
        
        const keyArray = Array.isArray(keysToInvalidate) ? keysToInvalidate : [keysToInvalidate]
        
        for (const key of keyArray) {
          await cache.del(key)
        }
      }
      
      return result
    }
  }
}
