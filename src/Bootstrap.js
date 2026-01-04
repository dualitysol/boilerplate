/**
 * Bootstrap - Entry point for configuring and launching microservices
 * Supports multiple deployment modes: local, lambda, server, container
 */

import { RuntimeFactory } from './runtime'
import { TransportFactory } from './transport'
import { EventBus } from './events/EventBus'
import { QueueManager } from './queue'
import { ServiceRegistry } from './registry'
import { Logger } from './logger'
import { Storage } from './storage'
import { ConfigLoader } from './config/ConfigLoader.js'

export class Bootstrap {
    constructor(config = {}) {
        this.config = config
        this.runtime = null
        this.services = new Map()
        this.storage = null
        this.eventBus = null
        this.queueManager = null
        this.serviceRegistry = null
        this.logger = null
        this.initialized = false
    }

    /**
     * Create Bootstrap instance with unified config loading
     * @param {string|Object} config - Path to config file or config object
     * @returns {Promise<Bootstrap>}
     */
    static async create(config) {
        let loadedConfig
        
        if (typeof config === 'string') {
            // Load config from file path
            loadedConfig = await ConfigLoader.load(config)
        } else if (typeof config === 'object') {
            // Use provided config object (still validates and merges with defaults)
            loadedConfig = ConfigLoader.validate(config)
        } else {
            throw new Error('Config must be a file path (string) or config object')
        }
        
        return new Bootstrap(loadedConfig)
    }

    /**
     * Initialize all components
     */
    async initialize() {
        if (this.initialized) {
            throw new Error('Bootstrap already initialized')
        }

        this.logger = new Logger(this.config.logger)
        this.logger.info('🚀 Initializing Bootstrap...')

        // Initialize Storage
        if (this.config.storage) {
            this.storage = new Storage(this.config.storage)
            await this.storage.connect()
            this.logger.info('✅ Storage initialized')
        }

        // Initialize EventBus
        if (this.config.eventBus) {
            this.eventBus = new EventBus(this.config.eventBus)
            await this.eventBus.connect()
            this.logger.info('✅ EventBus initialized')
        }

        // Initialize QueueManager
        if (this.config.queue) {
            this.queueManager = new QueueManager(this.config.queue)
            await this.queueManager.connect()
            this.logger.info('✅ QueueManager initialized')
        }

        // Initialize ServiceRegistry
        this.serviceRegistry = new ServiceRegistry(this.config.registry)
        this.logger.info('✅ ServiceRegistry initialized')

        // Load services
        await this.loadServices()

        // Initialize Runtime
        this.runtime = RuntimeFactory.create({
            ...this.config.runtime,
            services: Object.fromEntries(this.services),
            storage: this.storage,
            events: this.eventBus,
            queue: this.queueManager,
            registry: this.serviceRegistry,
            logger: this.logger
        })

        await this.runtime.initialize()
        this.logger.info('✅ Runtime initialized')

        this.initialized = true
        return this
    }

    /**
     * Load service classes
     */
    async loadServices() {
        const { services = {} } = this.config

        for (const [serviceName, serviceConfig] of Object.entries(services)) {
            let ServiceClass

            if (typeof serviceConfig === 'function') {
                // Service class provided directly
                ServiceClass = serviceConfig
            } else if (typeof serviceConfig === 'string') {
                // Path to service module
                ServiceClass = require(serviceConfig).default || require(serviceConfig)
            } else if (serviceConfig.class) {
                ServiceClass = serviceConfig.class
            } else {
                throw new Error(`Invalid service configuration for ${serviceName}`)
            }

            this.services.set(serviceName, ServiceClass)
            this.logger.info(`📦 Loaded service: ${serviceName}`)
        }
    }

    /**
     * Start the application
     */
    async start() {
        if (!this.initialized) {
            await this.initialize()
        }

        await this.runtime.start()
        this.logger.info('✅ Application started successfully')

        return this
    }

    /**
     * Stop the application gracefully
     */
    async stop() {
        this.logger.info('🛑 Stopping application...')

        if (this.runtime) {
            await this.runtime.stop()
        }

        if (this.queueManager) {
            await this.queueManager.disconnect()
        }

        if (this.eventBus) {
            await this.eventBus.disconnect()
        }

        if (this.storage) {
            await this.storage.disconnect()
        }

        this.logger.info('✅ Application stopped gracefully')
    }

    /**
     * Get runtime instance
     */
    getRuntime() {
        return this.runtime
    }

    /**
     * Get storage instance
     */
    getStorage() {
        return this.storage
    }

    /**
     * Get event bus instance
     */
    getEventBus() {
        return this.eventBus
    }

    /**
     * Get queue manager instance
     */
    getQueueManager() {
        return this.queueManager
    }

    /**
     * Get service registry instance
     */
    getServiceRegistry() {
        return this.serviceRegistry
    }

    /**
     * Get logger instance
     */
    getLogger() {
        return this.logger
    }
}

/**
 * Helper function to create and start application
 */
export async function createApp(config) {
    const bootstrap = new Bootstrap(config)
    await bootstrap.start()
    return bootstrap
}

/**
 * Helper for Lambda handlers
 */
export function createLambdaHandler(config, options = {}) {
    let bootstrap
    
    return async (event, context) => {
        // Initialize on cold start
        if (!bootstrap) {
            bootstrap = new Bootstrap({
                ...config,
                runtime: {
                    type: 'lambda',
                    ...config.runtime
                }
            })
            await bootstrap.initialize()
        }

        const runtime = bootstrap.getRuntime()
        const handler = runtime.createHandler(options)
        
        return handler(event, context)
    }
}

/**
 * Helper for Google Cloud Functions
 */
export function createGoogleCloudHandler(config, options = {}) {
    let bootstrap
    
    return async (req, res) => {
        // Initialize on cold start
        if (!bootstrap) {
            bootstrap = new Bootstrap({
                ...config,
                runtime: {
                    type: 'google-cloud',
                    ...config.runtime
                }
            })
            await bootstrap.initialize()
        }

        const runtime = bootstrap.getRuntime()
        const handler = runtime.createHandler(options)
        
        return handler(req, res)
    }
}

export default Bootstrap
