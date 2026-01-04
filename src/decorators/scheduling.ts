/**
 * Scheduling decorators
 */

import 'reflect-metadata'

/**
 * Cron job decorator
 */
export function Cron(pattern: string, options?: CronOptions): MethodDecorator {
  return function (target: any, propertyKey: string | symbol) {
    const jobs = Reflect.getMetadata('cron:jobs', target.constructor) || []
    jobs.push({
      method: propertyKey,
      pattern,
      ...options
    })
    Reflect.defineMetadata('cron:jobs', jobs, target.constructor)
  }
}

interface CronOptions {
  /**
   * Job name
   */
  name?: string
  
  /**
   * Timezone
   */
  timezone?: string
  
  /**
   * Run on start
   */
  runOnInit?: boolean
}

/**
 * Interval decorator
 */
export function Interval(ms: number): MethodDecorator {
  return function (target: any, propertyKey: string | symbol) {
    const intervals = Reflect.getMetadata('cron:intervals', target.constructor) || []
    intervals.push({
      method: propertyKey,
      interval: ms
    })
    Reflect.defineMetadata('cron:intervals', intervals, target.constructor)
  }
}

/**
 * Timeout decorator
 */
export function Timeout(ms: number): MethodDecorator {
  return function (target: any, propertyKey: string | symbol) {
    const timeouts = Reflect.getMetadata('cron:timeouts', target.constructor) || []
    timeouts.push({
      method: propertyKey,
      timeout: ms
    })
    Reflect.defineMetadata('cron:timeouts', timeouts, target.constructor)
  }
}
