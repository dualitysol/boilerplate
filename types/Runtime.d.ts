/**
 * Runtime adapter type definitions
 */

export interface RuntimeOptions {
  type: 'local' | 'lambda' | 'server' | 'container' | 'google-cloud'
  options?: Record<string, unknown>
}

export declare class BaseRuntime {
  type: string
  
  constructor(options: RuntimeOptions)
  
  /**
   * Initialize runtime
   */
  initialize(): Promise<void>
  
  /**
   * Start runtime
   */
  start(): Promise<void>
  
  /**
   * Stop runtime
   */
  stop(): Promise<void>
  
  /**
   * Handle incoming request
   */
  handle(event: unknown): Promise<unknown>
}

export default BaseRuntime
