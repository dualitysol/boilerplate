/**
 * API Gateway - Aggregates GraphQL schemas from multiple services
 * Routes requests to appropriate microservices
 */

import { createYoga, createSchema } from 'graphql-yoga'
import { createServer } from 'node:http'
import { stitchSchemas } from '@graphql-tools/stitch'
import { makeExecutableSchema } from '@graphql-tools/schema'

export class APIGateway {
    constructor(config = {}) {
        this.config = config
        this.server = null
        this.services = new Map()
        this.schema = null
        this.yoga = null
    }

    /**
     * Register a service with its schema and resolvers
     */
    registerService(serviceName, serviceConfig) {
        const { typeDefs, resolvers, url, executor } = serviceConfig

        this.services.set(serviceName, {
            name: serviceName,
            typeDefs,
            resolvers,
            url,
            executor,
            schema: typeDefs && resolvers 
                ? makeExecutableSchema({ typeDefs, resolvers })
                : null
        })

        console.log(`📡 Registered service in gateway: ${serviceName}`)
    }

    /**
     * Build combined schema from all services
     */
    buildGlobalSchema() {
        const schemas = []

        for (const [serviceName, service] of this.services.entries()) {
            if (service.schema) {
                schemas.push(service.schema)
            }
        }

        if (schemas.length === 0) {
            throw new Error('No service schemas registered')
        }

        // Stitch schemas together
        this.schema = stitchSchemas({
            subschemas: schemas.map(schema => ({
                schema
            }))
        })

        console.log(`✅ Built global schema with ${schemas.length} services`)
        return this.schema
    }

    /**
     * Build schema from separate typeDefs and resolvers
     */
    buildSchemaFromParts(typeDefs, resolvers) {
        this.schema = createSchema({
            typeDefs,
            resolvers
        })

        return this.schema
    }

    /**
     * Start the gateway server
     */
    async start() {
        const {
            port = 4000,
            host = '0.0.0.0',
            contextBuilder,
            schema
        } = this.config

        // Use provided schema or build from services
        const finalSchema = schema || this.buildGlobalSchema()

        this.yoga = createYoga({
            schema: finalSchema,
            context: contextBuilder,
            graphiql: process.env.NODE_ENV !== 'production',
            landingPage: process.env.NODE_ENV !== 'production'
        })

        this.server = createServer(this.yoga)

        await new Promise((resolve) => {
            this.server.listen(port, host, () => {
                console.log(`\n🌐 API Gateway running at http://${host}:${port}/graphql`)
                console.log(`📊 GraphiQL IDE: http://${host}:${port}/graphql`)
                console.log(`\n📡 Registered Services:`)
                for (const serviceName of this.services.keys()) {
                    console.log(`   - ${serviceName}`)
                }
                console.log('')
                resolve()
            })
        })

        return this
    }

    /**
     * Stop the gateway server
     */
    async stop() {
        if (this.server) {
            await new Promise((resolve, reject) => {
                this.server.close((err) => {
                    if (err) reject(err)
                    else {
                        console.log('🛑 API Gateway stopped')
                        resolve()
                    }
                })
            })
            this.server = null
        }

        return this
    }

    /**
     * Get service information
     */
    getService(serviceName) {
        return this.services.get(serviceName)
    }

    /**
     * Get all registered services
     */
    getAllServices() {
        return Array.from(this.services.values())
    }

    /**
     * Create remote executor for a service
     */
    createRemoteExecutor(serviceUrl) {
        return async ({ document, variables, context }) => {
            const axios = require('axios')
            
            try {
                const response = await axios.post(serviceUrl, {
                    query: document,
                    variables
                }, {
                    headers: context?.headers || {}
                })

                return response.data
            } catch (error) {
                console.error(`Remote executor error for ${serviceUrl}:`, error)
                throw error
            }
        }
    }

    /**
     * Auto-discover and register services
     */
    async discoverServices(serviceRegistry) {
        const services = serviceRegistry.getAllServices()

        for (const service of services) {
            if (service.graphql) {
                const { typeDefs, resolvers, url } = service.graphql

                this.registerService(service.name, {
                    typeDefs,
                    resolvers,
                    url,
                    executor: url ? this.createRemoteExecutor(url) : null
                })
            }
        }

        console.log(`✅ Discovered ${services.length} services from registry`)
    }
}

export default APIGateway
