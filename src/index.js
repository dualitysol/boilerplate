
export { Server } from './Server'
export { Microservice } from './Microservice'
export { Storage } from './storage'
export * as graphql from './graphql'
export { pubsub, eventEmitter } from './events'

export default {
    Server,
    Microservice,
    Storage,
    graphql,
    pubsub,
    eventEmitter,
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
