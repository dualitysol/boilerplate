import { BaseRuntime } from './base.js'
import { createYoga, createSchema } from 'graphql-yoga'
import { createServer } from 'node:http'

export class LocalRuntime extends BaseRuntime {
    constructor(config = {}) {
        super({ ...config, type: 'local' })
        this.server = null
        this.services = new Map()
    }

    async initialize() {
        console.log('🔧 Initializing Local Runtime (Monolith Mode)')
        
        // Initialize all services locally
        const { services = {}, storage, events } = this.config

        for (const [serviceName, ServiceClass] of Object.entries(services)) {
            console.log(`  📦 Loading service: ${serviceName}`)
            
            const service = new ServiceClass({
                name: serviceName,
                storage,
                events,
                runtime: this
            })

            this.services.set(serviceName, service)
        }

        console.log(`✅ Loaded ${this.services.size} services locally`)
        return this
    }

    async start() {
        const { 
            port = 3000, 
            host = 'localhost',
            typeDefs,
            resolvers,
            contextBuilder 
        } = this.config

        console.log('\n🚀 Starting Local Development Server...')

        // Create GraphQL Yoga server with all services
        const yoga = createYoga({
            schema: createSchema({ typeDefs, resolvers }),
            context: (requestContext) => {
                const context = contextBuilder ? contextBuilder(requestContext) : {}
                
                return {
                    ...requestContext,
                    ...context,
                    services: Object.fromEntries(this.services),
                    runtime: this
                }
            },
            graphiql: this.isDevelopment(), // Enable GraphiQL in development
            landingPage: this.isDevelopment()
        })

        this.server = createServer(yoga)

        await new Promise((resolve) => {
            this.server.listen(port, host, () => {
                console.log(`\n✅ Server running at http://${host}:${port}/graphql`)
                console.log(`📊 GraphiQL IDE: http://${host}:${port}/graphql`)
                console.log(`\n🎯 Loaded Services:`)
                for (const serviceName of this.services.keys()) {
                    console.log(`   - ${serviceName}`)
                }
                console.log('')
                resolve()
            })
        })

        return this
    }

    async stop() {
        if (this.server) {
            await new Promise((resolve, reject) => {
                this.server.close((err) => {
                    if (err) reject(err)
                    else {
                        console.log('🛑 Local server stopped')
                        resolve()
                    }
                })
            })
            this.server = null
        }

        // Cleanup services
        for (const service of this.services.values()) {
            if (typeof service.cleanup === 'function') {
                await service.cleanup()
            }
        }

        this.services.clear()
        return this
    }

    getService(name) {
        return this.services.get(name)
    }

    getAllServices() {
        return Object.fromEntries(this.services)
    }
}

export default LocalRuntime
