/**
 * Queue Manager type definitions
 */

export type MessageHandler<T = unknown> = (message: T) => void | Promise<void>

export interface QueueOptions {
  backend?: 'memory' | 'nats' | 'rabbitmq' | 'redis'
  url?: string
  options?: Record<string, unknown>
}

export interface ProcessOptions {
  concurrency?: number
  prefetch?: number
  retry?: {
    attempts?: number
    delay?: number
  }
}

export declare class QueueManager {
  constructor(options?: QueueOptions)
  
  /**
   * Send a message to a queue
   */
  send<T = unknown>(queue: string, message: T, options?: Record<string, unknown>): Promise<void>
  
  /**
   * Send multiple messages to a queue
   */
  sendBatch<T = unknown>(queue: string, messages: T[]): Promise<void>
  
  /**
   * Process messages from a queue
   */
  process<T = unknown>(
    queue: string,
    handler: MessageHandler<T>,
    options?: ProcessOptions
  ): Promise<void>
  
  /**
   * Close queue connection
   */
  close(): Promise<void>
}

export default QueueManager
