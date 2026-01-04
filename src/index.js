// Core Components
export { Server } from './Server'
export { Microservice } from './Microservice'
export { Bootstrap, createApp, createLambdaHandler, createGoogleCloudHandler } from './Bootstrap'

// Storage
export { Storage } from './storage'
export { MongoDB, Collection } from './storage/databases/mongo'

// GraphQL
export * as graphql from './graphql'

// Events
export { pubsub, eventEmitter } from './events'
export { EventBus } from './events/EventBus'

// Transport
export * as transport from './transport'
export { TransportFactory } from './transport'

// Runtime
export * as runtime from './runtime'
export { RuntimeFactory } from './runtime'

// Queue
export { QueueManager } from './queue'

// Logger
export { Logger } from './logger'

// Registry
export { ServiceRegistry } from './registry'

// API Gateway
export { APIGateway } from './gateway'

export default {
    Server,
    Microservice,
    Bootstrap,
    Storage,
    graphql,
    pubsub,
    eventEmitter,
    EventBus,
    TransportFactory,
    RuntimeFactory,
    QueueManager,
    Logger,
    ServiceRegistry,
    createApp,
    createLambdaHandler,
    createGoogleCloudHandler,
}

/**
 * @typedef {{ host: string; port: number; mongodb: { url: string; dbName: string; } }} ServerConfig
 */

/**
 * @typedef {{ account: any; models: import('../Microservice')[] }} Context
 * @typedef {{ [ServiceName: string]: { local: true; connectionString?: string; } | { local?: false; connectionString: string; } | undefined | null }} ServicesOptions
 */

/**
 * @typedef {{
*      private readonly collection: any
*      
*      insert(payload: any, options: any): Promise<any>
* }} ICollection
* 
* @typedef { {
*      dbName: String
*      private readonly db: Db
*      connect(url: string, dbName: string): Promise<void>
*      getCollection(collectionName: string): Collection
* } } IMongoDB
*/
/**
 * @typedef { { MongoDB: MongoDB } } IDatabase
 */
/** @typedef {{ mongodb: { url: string; dbName: string; }, cache: { url: string; } }} StorageConfig */
