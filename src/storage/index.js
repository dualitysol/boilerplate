import { MongoDB } from "./databases/mongo"
import Cache from './cache'


export class Storage {
    database = {
        /** @type { MongoDB } */
        mongo: null,
    }
    /** @type { Cache } */
    cache

    /**
     * 
     * @param {import('../index').StorageConfig} config 
     */
    constructor(config = {}) {
        if (config.mongodb) {
            this.database.mongo = new MongoDB(config.mongodb.url, config.mongodb.dbName)
        }
        
        if (config.cache) {
            this.cache = new Cache(config.cache?.url || 'local')
        }
    }

    /**
     * Connect to all configured databases
     */
    async connect() {
        if (this.database.mongo) {
            await this.database.mongo.connect()
            console.log('✅ MongoDB connected')
        }
        
        return this
    }

    /**
     * Disconnect from all databases
     */
    async disconnect() {
        if (this.database.mongo) {
            await this.database.mongo.close()
            console.log('🔌 MongoDB disconnected')
        }
        
        return this
    }

    /**
     * Get a collection from MongoDB
     */
    getCollection(name) {
        if (!this.database.mongo) {
            throw new Error('MongoDB not configured')
        }
        
        return this.database.mongo.getCollection(name)
    }

    /**
     * Get cache instance
     */
    getCache(name) {
        if (!this.cache) {
            throw new Error('Cache not configured')
        }
        
        return this.cache.collection(name)
    }
}

export default Storage
