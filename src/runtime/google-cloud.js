import { BaseRuntime } from './base.js'

export class GoogleCloudRuntime extends BaseRuntime {
    constructor(config = {}) {
        super({ ...config, type: 'google-cloud' })
        this.handler = null
        this.service = null
    }

    async initialize() {
        console.log('☁️  Initializing Google Cloud Functions Runtime')
        
        const { ServiceClass, serviceName, storage, events } = this.config

        if (!ServiceClass) {
            throw new Error('ServiceClass is required for Google Cloud runtime')
        }

        this.service = new ServiceClass({
            name: serviceName,
            storage,
            events,
            runtime: this
        })

        console.log(`✅ Service ${serviceName} initialized for Google Cloud Functions`)
        return this
    }

    async start() {
        console.log('☁️  Google Cloud Functions Runtime ready')
        return this
    }

    async stop() {
        if (this.service && typeof this.service.cleanup === 'function') {
            await this.service.cleanup()
        }
        console.log('🛑 Google Cloud Functions Runtime stopped')
        return this
    }

    /**
     * Create HTTP function handler for GraphQL
     */
    createGraphQLHandler(resolvers, typeDefs, contextBuilder) {
        const { createYoga, createSchema } = require('graphql-yoga')

        const yoga = createYoga({
            schema: createSchema({ typeDefs, resolvers }),
            context: (requestContext) => {
                const context = contextBuilder ? contextBuilder(requestContext) : {}
                
                return {
                    ...requestContext,
                    ...context,
                    service: this.service,
                    runtime: this
                }
            },
            graphiql: false,
            landingPage: false
        })

        return async (req, res) => {
            try {
                // Convert Express-like req/res to Fetch API
                const url = `https://${req.hostname}${req.path}${req.query ? '?' + new URLSearchParams(req.query).toString() : ''}`
                
                const request = new Request(url, {
                    method: req.method,
                    headers: req.headers,
                    body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined
                })

                const response = await yoga.fetch(request, { req, res })

                // Convert Response to Express format
                res.status(response.status)
                response.headers.forEach((value, key) => {
                    res.set(key, value)
                })
                res.send(await response.text())
            } catch (error) {
                console.error('Google Cloud Function error:', error)
                res.status(500).json({
                    error: error.message
                })
            }
        }
    }

    /**
     * Create direct invocation handler
     */
    createDirectHandler(methodName) {
        return async (req, res) => {
            try {
                const payload = req.body || {}

                if (!this.service[methodName]) {
                    throw new Error(`Method ${methodName} not found on service`)
                }

                const result = await this.service[methodName](payload)

                res.status(200).json(result)
            } catch (error) {
                console.error(`Google Cloud Function direct handler error [${methodName}]:`, error)
                res.status(500).json({
                    error: error.message,
                    stack: this.isDevelopment() ? error.stack : undefined
                })
            }
        }
    }

    /**
     * Create Cloud Pub/Sub handler
     */
    createPubSubHandler(methodName) {
        return async (message, context) => {
            try {
                const payload = message.data 
                    ? JSON.parse(Buffer.from(message.data, 'base64').toString())
                    : {}

                if (!this.service[methodName]) {
                    throw new Error(`Method ${methodName} not found on service`)
                }

                const result = await this.service[methodName](payload, {
                    messageId: context.eventId,
                    timestamp: context.timestamp
                })

                console.log(`Pub/Sub message processed: ${context.eventId}`)
                return result
            } catch (error) {
                console.error(`Pub/Sub handler error [${methodName}]:`, error)
                throw error // Pub/Sub will retry on error
            }
        }
    }

    /**
     * Create Cloud Storage handler
     */
    createStorageHandler(methodName) {
        return async (file, context) => {
            try {
                const payload = {
                    name: file.name,
                    bucket: file.bucket,
                    contentType: file.contentType,
                    size: file.size,
                    timeCreated: file.timeCreated,
                    updated: file.updated
                }

                if (!this.service[methodName]) {
                    throw new Error(`Method ${methodName} not found on service`)
                }

                const result = await this.service[methodName](payload, {
                    eventId: context.eventId,
                    eventType: context.eventType,
                    timestamp: context.timestamp
                })

                console.log(`Storage event processed: ${file.name}`)
                return result
            } catch (error) {
                console.error(`Storage handler error [${methodName}]:`, error)
                throw error
            }
        }
    }

    /**
     * Universal handler factory
     */
    createHandler(options = {}) {
        const { type = 'http', method, trigger = 'http' } = options

        // For GraphQL HTTP endpoints
        if (trigger === 'http' && type === 'graphql') {
            const { resolvers, typeDefs, contextBuilder } = this.config
            return this.createGraphQLHandler(resolvers, typeDefs, contextBuilder)
        }

        // For direct HTTP invocations
        if (trigger === 'http' && type === 'direct' && method) {
            return this.createDirectHandler(method)
        }

        // For Pub/Sub triggers
        if (trigger === 'pubsub' && method) {
            return this.createPubSubHandler(method)
        }

        // For Cloud Storage triggers
        if (trigger === 'storage' && method) {
            return this.createStorageHandler(method)
        }

        throw new Error(`Unknown handler configuration: trigger=${trigger}, type=${type}`)
    }
}

export default GoogleCloudRuntime
