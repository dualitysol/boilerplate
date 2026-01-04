/**
 * Transport layer type definitions
 */

export interface TransportOptions {
  type: 'http' | 'websocket' | 'grpc' | 'nats' | 'rabbitmq' | 'redis' | 'zeromq'
  port?: number
  host?: string
  url?: string
  options?: Record<string, unknown>
}

export declare class BaseTransport {
  type: string
  
  constructor(options: TransportOptions)
  
  /**
   * Initialize transport
   */
  initialize(): Promise<void>
  
  /**
   * Start listening for requests
   */
  listen(): Promise<void>
  
  /**
   * Stop transport
   */
  stop(): Promise<void>
  
  /**
   * Send request to another service
   */
  request<T = unknown>(
    service: string,
    method: string,
    params?: Record<string, unknown>
  ): Promise<T>
}

export default BaseTransport
