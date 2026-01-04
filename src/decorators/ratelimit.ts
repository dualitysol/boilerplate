/**
 * Rate limiting decorators
 */

/**
 * Rate limit decorator
 */
export function RateLimit(options: RateLimitOptions): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    const limits = new Map<string, { count: number; resetTime: number }>()
    
    descriptor.value = async function (...args: any[]) {
      const context = args[args.length - 1]
      const identifier = options.keyGenerator 
        ? options.keyGenerator(context)
        : context?.user?.id || context?.ip || 'anonymous'
      
      const key = `${target.constructor.name}:${String(propertyKey)}:${identifier}`
      const now = Date.now()
      
      let limitData = limits.get(key)
      
      if (!limitData || now > limitData.resetTime) {
        limitData = {
          count: 0,
          resetTime: now + options.window
        }
        limits.set(key, limitData)
      }
      
      if (limitData.count >= options.max) {
        const waitTime = Math.ceil((limitData.resetTime - now) / 1000)
        throw new Error(`Rate limit exceeded. Try again in ${waitTime} seconds.`)
      }
      
      limitData.count++
      
      return originalMethod.apply(this, args)
    }
  }
}

interface RateLimitOptions {
  /**
   * Maximum requests
   */
  max: number
  
  /**
   * Time window in milliseconds
   */
  window: number
  
  /**
   * Custom key generator
   */
  keyGenerator?: (context: any) => string
  
  /**
   * Error message
   */
  message?: string
}
