export default class Cache {
    /** @type {{ [K: string]: CacheCollection }} */
    #cacheStorage = {}

    constructor(connectionUrl = '') {
        this.connectionUrl = connectionUrl;
    }

    collection(name = '') {
        return this.#cacheStorage[name] || new CacheCollection(name)
    }

    dropCollection(name) {
        delete this.#cacheStorage[name]
    }
}

class CacheCollection {
    #memory = {}

    constructor(name = '') {
        this.name = name
    }

    async setKey(key = '', value) {
        this.#memory[key] = value
        return this
    }

    async delete(key = '') {
        delete this.#memory[key]
        return this
    }

    async getValue(key = '') {
        return this.#memory[key]
    }
}