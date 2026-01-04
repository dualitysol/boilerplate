/**
 * Bootstrap type definitions
 */

import { Microservice } from './Microservice'
import { Storage } from './Storage'
import { EventBus } from './EventBus'
import { QueueManager } from './Queue'
import { Logger } from './Logger'

export interface BootstrapOptions {
  services: Array<typeof Microservice>
  config?: {
    storage?: {
      type: 'mongodb' | 'postgres' | 'redis'
      uri: string
      options?: Record<string, unknown>
    }
    events?: {
      backend?: 'memory' | 'nats' | 'redis' | 'websocket'
      url?: string
    }
    queue?: {
      backend?: 'memory' | 'nats' | 'rabbitmq' | 'redis'
      url?: string
    }
    transport?: {
      type: 'http' | 'websocket' | 'grpc' | 'nats' | 'rabbitmq' | 'redis' | 'zeromq'
      port?: number
      host?: string
    }
    runtime?: {
      type: 'local' | 'lambda' | 'server' | 'container' | 'google-cloud'
    }
    logger?: {
      level?: 'debug' | 'info' | 'warn' | 'error'
      service?: string
    }
  }
}

export declare class Bootstrap {
  storage?: Storage
  events?: EventBus
  queue?: QueueManager
  logger?: Logger
  services: Map<string, Microservice>
  
  constructor(options: BootstrapOptions)
  
  /**
   * Initialize all services
   */
  initialize(): Promise<void>
  
  /**
   * Start application
   */
  start(): Promise<void>
  
  /**
   * Stop application
   */
  stop(): Promise<void>
  
  /**
   * Create app with services
   */
  static createApp(
    services: Array<typeof Microservice>,
    config?: BootstrapOptions['config']
  ): Bootstrap
}

export default Bootstrap
