import { Db } from "mongodb"
import { MongoClient, ObjectId } from "mongodb"

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
export class MongoDB extends MongoClient {
    /** @type { string } */
    dbName
    /** @type { Db } */
    #db
    /** @type {ObjectId}*/
    ObjectId = ObjectId

    constructor(url = 'mongodb://localhost:27017', dbName = 'slon') {
        super(url)
        this.dbName = dbName
    }

    async connect() {
        await super.connect()
        this.#db = super.db(this.dbName)
        return this
    }

    getCollection(collectionName = "") {
        return new Collection(this.#db.collection(collectionName))
    }

    close() {
        super.close()
    }
}

export class Collection {
    /** @type { import('mongodb').Collection } */
    #collection = null
    /** @type { import('mongodb').AnyBulkWriteOperation<TSchema>[] } */
    #tasks = null
    /** @type { import('mongodb').BulkWriteOptions }*/
    #bulkOptions
    /** @type {number} */
    #bulkTasksTimerId

    constructor(collection, bulkOptions = {ordered: false}) {
        this.#collection = collection
        this.#bulkOptions = bulkOptions
    }

    /**
     * @param {{ [Key: string]: any }} payload 
     * @param {import('mongodb').BulkWriteOptions} options 
     */
    async insert(payload, options = {}) {
        return payload && this.#collection.insertOne(payload, options)
    }

    /**
     * @param {Array<{ [Key: string]: any }>} payload 
     * @param {import('mongodb').BulkWriteOptions} options 
     */
    async insertMany(payload, options) {
        return payload && this.#collection.insertMany(payload, options)
    }

    async find(payload = {}, options) {
        return this.#collection.find(payload, options)
    }

    async findOne(payload = {}, options = {}) {
        return this.#collection.findOne(payload, options)
    }

    async updateMany(query, payload = {}, options = {}) {
        return this.#collection.findOneAndUpdate(query, payload, { ...options, new: true })
    }

    /**
     * 
     * @param {import('mongodb').IndexSpecification} keys 
     * @param {import('mongodb').CreateIndexesOptions} options
     * @returns {Promise<string>}
     */
    async createIndex(keys, options) {
        return this.#collection.createIndex(keys, options)
    }

    /** @param {import('mongodb').AnyBulkWriteOperation<TSchema>[]} oprations */
    async #bulkWrite(oprations) {
        return this.#collection.bulkWrite(oprations, this.#bulkOptions)
    }

    async #checkTasks() {
        if (!this.#tasks) this.#tasks = []
        if (this.#tasks.length === 100000) {
            await this.#bulkWrite(this.#tasks.splice(0))
        }

        this.#bulkTasksTimerId = this.#setBulkWriteTimeout()
    }

    #setBulkWriteTimeout(timeout = 500) {
        return setTimeout(async () => {
            !!this.#tasks?.length && await this.#bulkWrite(this.#tasks.splice(0))
            clearTimeout(this.#bulkTasksTimerId)
            this.#bulkTasksTimerId = null
        }, timeout)
    }

    /**
     * @param {{ [Key: string]: any }} document 
     */
    async sendInsert(document) {
        await this.#checkTasks()

        this.#tasks.push({ insertOne: { document } })
    }

    async sendUpdateOne(filter, update, options = { upsert: false }) {
        await this.#checkTasks()

        options.filter = filter // not obvious, but here make options object as a payload object for
        options.update = update // updateOne bulk operatoion regarding to bulkWrite API

        this.#tasks.push({ updateOne : options })
    }

    async sendUpdateMany(filter, update) {
        await this.#checkTasks()

        options.filter = filter // not obvious, but here make options object as a payload object for
        options.update = update // updateOne bulk operatoion regarding to bulkWrite API

        this.#tasks.push({ updateMany : options })
    }

    async sendDeleteOne(filter) {
        await this.#checkTasks()
        
        this.#tasks.push({ deleteOne: { filter } })
    }

    async sendDeleteMany(filter) {
        await this.#checkTasks()

        this.#tasks.push({ deleteMany: { filter } })
    }
}