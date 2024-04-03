import { MongoDB } from "./databases"
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
    constructor(config) {
        this.database.mongo = new MongoDB(config.mongodb.url, config.mongodb.dbName)
        this.cache = new Cache(config.cache?.url || 'some')
    }
}

export default Storage
