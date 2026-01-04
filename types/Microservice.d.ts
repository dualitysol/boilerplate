/**
 * Microservice base class type definitions
 */

import { Storage, Collection } from './Storage'
import { EventBus } from './EventBus'
import { QueueManager } from './Queue'
import { Logger } from './Logger'
import { BaseTransport } from './Transport'
import { BaseRuntime } from './Runtime'

/**
 * Service registry with typed services
 */
export interface ServiceRegistry {
  [serviceName: string]: Microservice<any>
}

/**
 * Microservice initialization options
 */
export interface MicroserviceOptions<TServices = ServiceRegistry> {
  name: string
  context?: Record<string, unknown>
  services?: TServices
  events?: EventBus
  storage?: Storage
  queue?: QueueManager
  transport?: BaseTransport
  runtime?: BaseRuntime
  registry?: any
  logger?: Logger
}

/**
 * Enhanced Microservice Base Class
 * 
 * Provides high-level abstractions for:
 * - Inter-service communication
 * - Event publishing/subscribing
 * - Queue management  
 * - Storage operations
 * - CRUD operations
 * - Logging and metrics
 * 
 * @template TServices - Service registry type with all available services
 */
export declare class Microservice<TServices extends ServiceRegistry = ServiceRegistry> {
  /** Service name */
  name: string
  
  /** Typed service registry for inter-service communication */
  services: TServices
  
  /** Storage instance */
  storage: Storage
  
  /** Event bus for pub/sub */
  events: EventBus
  
  /** Queue manager */
  queue: QueueManager
  
  /** Logger instance */
  logger: Logger
  
  /** Transport layer */
  transport: BaseTransport
  
  /** Runtime adapter */
  runtime: BaseRuntime
  
  /** MongoDB collection model */
  model: Collection
  
  /** Service context */
  context: Record<string, unknown>
  
  /** Service registry */
  registry: any

  /**
   * Create a new microservice instance
   * @param options - Service initialization options
   */
  constructor(options: MicroserviceOptions<TServices>)

  /**
   * Override this in subclasses to specify collection name
   */
  get collectionName(): string

  /**
   * Service initialization hook
   * Called when service starts
   */
  initialize?(): Promise<void>

  /**
   * Service cleanup hook
   * Called when service stops
   */
  cleanup(): Promise<void>

  /**
   * Publish an event to the event bus
   * @param event - Event name
   * @param data - Event payload
   * @param options - Publish options
   */
  publish(event: string, data: unknown, options?: Record<string, unknown>): Promise<void>

  /**
   * Subscribe to an event
   * @param event - Event name
   * @param handler - Event handler function
   */
  subscribe(event: string, handler: (data: unknown) => void | Promise<void>): Promise<void>

  /**
   * Send a message to the queue
   * @param queue - Queue name
   * @param message - Message payload
   * @param options - Queue options
   */
  enqueue(queue: string, message: unknown, options?: Record<string, unknown>): Promise<void>

  /**
   * Process messages from a queue
   * @param queue - Queue name
   * @param handler - Message handler function
   * @param options - Processing options
   */
  processQueue(
    queue: string,
    handler: (message: unknown) => void | Promise<void>,
    options?: Record<string, unknown>
  ): Promise<void>

  /**
   * Send notification
   * @param channel - Notification channel
   * @param message - Message content
   * @param options - Notification options
   */
  notify(channel: string, message: unknown, options?: Record<string, unknown>): Promise<void>

  /**
   * Log info message
   * @param message - Log message
   * @param meta - Additional metadata
   */
  info(message: string, ...meta: any[]): void

  /**
   * Log error message
   * @param message - Error message
   * @param meta - Additional metadata
   */
  error(message: string, ...meta: any[]): void

  /**
   * Log warning message
   * @param message - Warning message
   * @param meta - Additional metadata
   */
  warn(message: string, ...meta: any[]): void

  /**
   * Log debug message
   * @param message - Debug message
   * @param meta - Additional metadata
   */
  debug(message: string, ...meta: any[]): void

  /**
   * CRUD Operations - MongoDB operations
   */

  /**
   * Find one document
   * @param filter - MongoDB filter
   * @param options - Query options
   */
  findOne<T = any>(filter: Record<string, any>, options?: Record<string, any>): Promise<T | null>

  /**
   * Find multiple documents
   * @param filter - MongoDB filter
   * @param options - Query options (limit, skip, sort, projection)
   */
  findMany<T = any>(
    filter?: Record<string, any>,
    options?: {
      limit?: number
      skip?: number
      sort?: Record<string, 1 | -1>
      projection?: Record<string, 0 | 1>
    }
  ): Promise<T[]>

  /**
   * Create one document
   * @param data - Document data
   * @param options - Insert options
   */
  createOne<T = any>(data: Record<string, any>, options?: Record<string, any>): Promise<T>

  /**
   * Update one document
   * @param filter - MongoDB filter
   * @param update - Update operations
   * @param options - Update options
   */
  updateOne<T = any>(
    filter: Record<string, any>,
    update: Record<string, any>,
    options?: Record<string, any>
  ): Promise<T | null>

  /**
   * Delete one document
   * @param filter - MongoDB filter
   * @param options - Delete options
   */
  deleteOne(filter: Record<string, any>, options?: Record<string, any>): Promise<boolean>

  /**
   * Count documents
   * @param filter - MongoDB filter
   */
  count(filter?: Record<string, any>): Promise<number>

  /**
   * Check if document exists
   * @param filter - MongoDB filter
   */
  exists(filter: Record<string, any>): Promise<boolean>
}

export default Microservice
