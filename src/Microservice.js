/**
 * Enhanced Microservice Base Class
 * 
 * Provides high-level abstractions for:
 * - Inter-service communication
 * - Event publishing/subscribing
 * - Queue management  
 * - Storage operations
 * - Logging and metrics
 * - Notifications
 * 
 * @template {Record<string, Microservice>} [TServices=Record<string, Microservice>]
 * @typedef {import('../types/Microservice').Microservice<TServices>} MicroserviceType
 * @typedef {import('../types/Microservice').MicroserviceOptions<TServices>} MicroserviceOptions
 * @typedef {import('../types/Storage').Storage} Storage
 * @typedef {import('../types/Storage').Collection} Collection
 * @typedef {import('../types/EventBus').EventBus} EventBus
 * @typedef {import('../types/EventBus').EventHandler} EventHandler
 */

/**
 * @implements {MicroserviceType}
 */
export class Microservice {
    /** @type {string} */
    name
    
    /** 
     * Typed service registry for inter-service communication
     * Import service registry types: @typedef {import('../../types/service-registry').ServiceRegistry} ServiceRegistry
     * @type {TServices}
     */
    services
    
    /** @type {import('./storage').Storage} */
    storage
    
    /** @type {import('./events/EventBus').EventBus} */
    events
    
    /** @type {import('./queue').QueueManager} */
    queue
    
    /** @type {import('./logger').Logger} */
    logger
    
    /** @type {import('./transport').BaseTransport} */
    transport
    
    /** @type {import('./runtime').BaseRuntime} */
    runtime
    
    /**
     * MongoDB collection model with typed methods
     * @type {import('./storage/databases/mongo').Collection}
     */
    model
    
    /** @type {Record<string, unknown>} */
    context
    
    /** @type {import('./registry').ServiceRegistry} */
    registry

    constructor({ name, context = {}, services = {}, events, storage, queue, transport, runtime, registry, logger }) {
        this.name = name
        this.context = context
        this.storage = storage
        this.events = events
        this.queue = queue
        this.transport = transport
        this.runtime = runtime
        this.registry = registry
        this.logger = logger || this.createDefaultLogger()
        
        // Set up service proxies for type-safe inter-service communication
        this.services = this.createServiceProxies(services)
        
        // Initialize model if storage is available
        if (this.storage && this.collectionName) {
            this.model = this.storage.getCollection(this.collectionName)
        }
    }

    /**
     * Override this in subclasses to specify collection name
     */
    get collectionName() {
        return this.name?.toLowerCase()
    }

    /**
     * Create typed service proxies for inter-service calls
     */
    createServiceProxies(services) {
        const proxies = {}

        for (const [serviceName, ServiceClass] of Object.entries(services)) {
            proxies[serviceName] = this.createServiceProxy(serviceName, ServiceClass)
        }

        return proxies
    }

    /**
     * Create a proxy for calling another service's methods
     */
    createServiceProxy(serviceName, ServiceClass) {
        const isLocal = this.runtime?.type === 'local'

        if (isLocal && ServiceClass) {
            // Local call - direct instance
            return new ServiceClass({
                name: serviceName,
                storage: this.storage,
                events: this.events,
                queue: this.queue,
                transport: this.transport,
                runtime: this.runtime,
                registry: this.registry,
                logger: this.logger
            })
        }

        // Remote call - create proxy
        return new Proxy({}, {
            get: (target, methodName) => {
                if (typeof methodName !== 'string') return undefined

                return async (...args) => {
                    return this.callRemoteService(serviceName, methodName, ...args)
                }
            }
        })
    }

    /**
     * Call a method on a remote service
     */
    async callRemoteService(serviceName, methodName, ...args) {
        const serviceInfo = this.registry?.getService(serviceName)

        if (!serviceInfo) {
            throw new Error(`Service ${serviceName} not found in registry`)
        }

        const { url, transport: transportType = 'http' } = serviceInfo

        // Use configured transport or default
        if (this.transport) {
            return this.transport.request(serviceName, methodName, args[0], args[1])
        }

        // Fallback to HTTP
        const axios = require('axios')
        const response = await axios.post(url, {
            query: `mutation { ${methodName}(${this.buildGraphQLArgs(args[0])}) }`,
            variables: args[0]
        })

        return response.data
    }

    /**
     * Publish an event
     */
    async publish(eventName, data, options = {}) {
        if (!this.events) {
            this.logger?.warn(`EventBus not configured, cannot publish event: ${eventName}`)
            return
        }

        await this.events.publish(eventName, {
            ...data,
            _service: this.name,
            _timestamp: Date.now()
        }, options)

        this.logger?.debug(`Published event: ${eventName}`, data)
    }

    /**
     * Subscribe to an event
     */
    async subscribe(eventName, handler) {
        if (!this.events) {
            throw new Error('EventBus not configured')
        }

        return this.events.subscribe(eventName, async (data) => {
            try {
                await handler(data)
            } catch (error) {
                this.logger?.error(`Event handler error for ${eventName}:`, error)
            }
        })
    }

    /**
     * Send a message to a queue
     */
    async enqueue(queueName, data, options = {}) {
        if (!this.queue) {
            throw new Error('QueueManager not configured')
        }

        await this.queue.send(queueName, {
            ...data,
            _service: this.name,
            _timestamp: Date.now()
        }, options)

        this.logger?.debug(`Enqueued message to ${queueName}`, data)
    }

    /**
     * Process messages from a queue
     */
    async processQueue(queueName, handler, options = {}) {
        if (!this.queue) {
            throw new Error('QueueManager not configured')
        }

        return this.queue.process(queueName, async (data) => {
            try {
                await handler(data)
            } catch (error) {
                this.logger?.error(`Queue handler error for ${queueName}:`, error)
                throw error // Re-throw to allow queue retry logic
            }
        }, options)
    }

    /**
     * Send notification (abstracted)
     */
    async notify(channel, message, options = {}) {
        // Delegate to events for now, can be extended to support SNS, etc.
        return this.publish(`notification:${channel}`, message, options)
    }

    /**
     * Log helper methods
     */
    log(level, message, ...args) {
        this.logger?.[level](`[${this.name}] ${message}`, ...args)
    }

    info(message, ...args) {
        this.log('info', message, ...args)
    }

    error(message, ...args) {
        this.log('error', message, ...args)
    }

    warn(message, ...args) {
        this.log('warn', message, ...args)
    }

    debug(message, ...args) {
        this.log('debug', message, ...args)
    }

    /**
     * Create default logger if none provided
     */
    createDefaultLogger() {
        return {
            info: console.log,
            error: console.error,
            warn: console.warn,
            debug: console.debug
        }
    }

    /**
     * Build GraphQL arguments string
     */
    buildGraphQLArgs(args) {
        if (!args) return ''
        return Object.entries(args)
            .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
            .join(', ')
    }

    /**
     * CRUD Operations - Thin wrappers around MongoDB operations
     * These provide standardized interface for service methods
     */

    /**
     * Find one document
     * @param {Object} filter - MongoDB filter
     * @param {Object} options - Query options
     * @returns {Promise<any>}
     */
    async findOne(filter, options = {}) {
        if (!this.model) {
            throw new Error(`Model not initialized for ${this.name}. Set collectionName getter.`)
        }
        return this.model.findOne(filter, options)
    }

    /**
     * Find multiple documents
     * @param {Object} filter - MongoDB filter
     * @param {Object} options - Query options (limit, skip, sort, etc)
     * @returns {Promise<Array>}
     */
    async findMany(filter = {}, options = {}) {
        if (!this.model) {
            throw new Error(`Model not initialized for ${this.name}. Set collectionName getter.`)
        }
        
        let query = this.model.find(filter)
        
        if (options.limit) query = query.limit(options.limit)
        if (options.skip) query = query.skip(options.skip)
        if (options.sort) query = query.sort(options.sort)
        if (options.projection) query = query.project(options.projection)
        
        return query.toArray()
    }

    /**
     * Create one document
     * @param {Object} data - Document data
     * @param {Object} options - Insert options
     * @returns {Promise<any>}
     */
    async createOne(data, options = {}) {
        if (!this.model) {
            throw new Error(`Model not initialized for ${this.name}. Set collectionName getter.`)
        }
        
        const document = {
            ...data,
            createdAt: new Date(),
            updatedAt: new Date()
        }
        
        const result = await this.model.insertOne(document, options)
        return { ...document, _id: result.insertedId }
    }

    /**
     * Update one document
     * @param {Object} filter - MongoDB filter
     * @param {Object} update - Update operations
     * @param {Object} options - Update options
     * @returns {Promise<any>}
     */
    async updateOne(filter, update, options = {}) {
        if (!this.model) {
            throw new Error(`Model not initialized for ${this.name}. Set collectionName getter.`)
        }
        
        // Ensure updatedAt is set
        if (update.$set) {
            update.$set.updatedAt = new Date()
        } else {
            update.$set = { updatedAt: new Date() }
        }
        
        const result = await this.model.findOneAndUpdate(
            filter,
            update,
            { returnDocument: 'after', ...options }
        )
        
        return result.value || result
    }

    /**
     * Delete one document
     * @param {Object} filter - MongoDB filter
     * @param {Object} options - Delete options
     * @returns {Promise<boolean>}
     */
    async deleteOne(filter, options = {}) {
        if (!this.model) {
            throw new Error(`Model not initialized for ${this.name}. Set collectionName getter.`)
        }
        
        const result = await this.model.deleteOne(filter, options)
        return result.deletedCount > 0
    }

    /**
     * Count documents
     * @param {Object} filter - MongoDB filter
     * @returns {Promise<number>}
     */
    async count(filter = {}) {
        if (!this.model) {
            throw new Error(`Model not initialized for ${this.name}. Set collectionName getter.`)
        }
        return this.model.countDocuments(filter)
    }

    /**
     * Check if document exists
     * @param {Object} filter - MongoDB filter
     * @returns {Promise<boolean>}
     */
    async exists(filter) {
        if (!this.model) {
            throw new Error(`Model not initialized for ${this.name}. Set collectionName getter.`)
        }
        const count = await this.model.countDocuments(filter, { limit: 1 })
        return count > 0
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        this.logger?.info(`Cleaning up service: ${this.name}`)
        // Override in subclasses if needed
    }
}

export default Microservice