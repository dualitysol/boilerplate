/**
 * EventBus type definitions
 */

export type EventHandler<T = unknown> = (data: T) => void | Promise<void>

export interface EventBusOptions {
  backend?: 'memory' | 'nats' | 'redis' | 'websocket'
  url?: string
  options?: Record<string, unknown>
}

export declare class EventBus {
  constructor(options?: EventBusOptions)
  
  /**
   * Publish an event
   */
  publish<T = unknown>(event: string, data: T): Promise<void>
  
  /**
   * Subscribe to an event
   */
  subscribe<T = unknown>(event: string, handler: EventHandler<T>): Promise<void>
  
  /**
   * Subscribe to an event once
   */
  once<T = unknown>(event: string, handler: EventHandler<T>): Promise<void>
  
  /**
   * Unsubscribe from an event
   */
  unsubscribe<T = unknown>(event: string, handler?: EventHandler<T>): Promise<void>
  
  /**
   * Subscribe to events matching a pattern
   */
  subscribePattern<T = unknown>(pattern: string, handler: EventHandler<T>): Promise<void>
  
  /**
   * Clear all subscriptions
   */
  clear(): Promise<void>
  
  /**
   * Close event bus connection
   */
  close(): Promise<void>
}

export default EventBus
