import { BaseRuntime } from './base.js'
import { createYoga, createSchema } from 'graphql-yoga'

export class ServerRuntime extends BaseRuntime {
    constructor(config = {}) {
        super({ ...config, type: 'server' })
        this.server = null
        this.service = null
        this.transport = null
    }

    async initialize() {
        console.log('🖥️  Initializing Standalone Server Runtime')
        
        const { 
            ServiceClass, 
            serviceName, 
            storage, 
            events,
            transport 
        } = this.config

        // Initialize service
        if (ServiceClass) {
            this.service = new ServiceClass({
                name: serviceName,
                storage,
                events,
                runtime: this
            })
            console.log(`✅ Service ${serviceName} initialized`)
        }

        // Initialize transport if specified
        if (transport) {
            const { TransportFactory } = require('../transport')
            this.transport = TransportFactory.create(transport)
            await this.transport.connect()
            console.log(`✅ Transport ${transport.type} connected`)
        }

        return this
    }

    async start() {
        const { 
            port = 3000, 
            host = '0.0.0.0',
            serverType = 'node:http',
            typeDefs,
            resolvers,
            contextBuilder 
        } = this.config

        console.log(`\n🚀 Starting Standalone Server (${serverType})...`)

        if (serverType === 'uWebSockets' || serverType === 'uws') {
            await this.startUWebSocketsServer()
        } else {
            await this.startNodeHTTPServer()
        }

        return this
    }

    async startNodeHTTPServer() {
        const { createServer } = require('node:http')
        const { port = 3000, host = '0.0.0.0', typeDefs, resolvers, contextBuilder } = this.config

        const yoga = createYoga({
            schema: createSchema({ typeDefs, resolvers }),
            context: (requestContext) => {
                const context = contextBuilder ? contextBuilder(requestContext) : {}
                
                return {
                    ...requestContext,
                    ...context,
                    service: this.service,
                    transport: this.transport,
                    runtime: this
                }
            },
            graphiql: this.isDevelopment()
        })

        this.server = createServer(yoga)

        await new Promise((resolve) => {
            this.server.listen(port, host, () => {
                console.log(`\n✅ Server running at http://${host}:${port}/graphql`)
                if (this.service) {
                    console.log(`🎯 Service: ${this.service.name}`)
                }
                if (this.transport) {
                    console.log(`🔌 Transport: ${this.transport.config.type}`)
                }
                console.log('')
                resolve()
            })
        })
    }

    async startUWebSocketsServer() {
        // Lazy load uWebSockets
        const uWS = await import('uWebSockets.js')
        const { port = 3000, host = '0.0.0.0', typeDefs, resolvers, contextBuilder } = this.config

        const yoga = createYoga({
            schema: createSchema({ typeDefs, resolvers }),
            context: (requestContext) => {
                const context = contextBuilder ? contextBuilder(requestContext) : {}
                
                return {
                    ...requestContext,
                    ...context,
                    service: this.service,
                    transport: this.transport,
                    runtime: this
                }
            },
            graphiql: this.isDevelopment()
        })

        this.server = uWS.default.App()

        // Handle all HTTP methods for GraphQL
        this.server.any('/graphql', async (res, req) => {
            // Convert uWS request to standard Request
            const url = `http://${host}:${port}${req.getUrl()}`
            const method = req.getMethod().toUpperCase()
            const headers = {}
            
            req.forEach((key, value) => {
                headers[key] = value
            })

            let body
            if (method === 'POST' || method === 'PUT') {
                body = await new Promise((resolve) => {
                    let buffer
                    res.onData((chunk, isLast) => {
                        const chunkArray = new Uint8Array(chunk)
                        if (!buffer) {
                            buffer = chunkArray
                        } else {
                            const newBuffer = new Uint8Array(buffer.length + chunkArray.length)
                            newBuffer.set(buffer)
                            newBuffer.set(chunkArray, buffer.length)
                            buffer = newBuffer
                        }
                        
                        if (isLast) {
                            resolve(Buffer.from(buffer).toString())
                        }
                    })
                })
            }

            const request = new Request(url, {
                method,
                headers,
                body
            })

            try {
                const response = await yoga.fetch(request)
                const responseText = await response.text()
                
                res.cork(() => {
                    res.writeStatus(`${response.status} ${response.statusText}`)
                    response.headers.forEach((value, key) => {
                        res.writeHeader(key, value)
                    })
                    res.end(responseText)
                })
            } catch (error) {
                res.cork(() => {
                    res.writeStatus('500 Internal Server Error')
                    res.writeHeader('Content-Type', 'application/json')
                    res.end(JSON.stringify({ error: error.message }))
                })
            }
        })

        // WebSocket support
        this.server.ws('/graphql', {
            compression: uWS.default.SHARED_COMPRESSOR,
            maxPayloadLength: 16 * 1024 * 1024,
            idleTimeout: 60,
            
            open: (ws) => {
                console.log('WebSocket client connected')
            },
            
            message: async (ws, message, isBinary) => {
                const text = Buffer.from(message).toString()
                // Handle GraphQL subscriptions
                // Implementation depends on graphql-ws or similar
            },
            
            close: (ws, code, message) => {
                console.log('WebSocket client disconnected')
            }
        })

        await new Promise((resolve) => {
            this.server.listen(host, port, (token) => {
                if (token) {
                    console.log(`\n✅ uWebSockets server running at http://${host}:${port}/graphql`)
                    console.log(`🎯 Service: ${this.service?.name || 'N/A'}`)
                    console.log(`⚡ High-performance mode enabled`)
                    console.log('')
                    resolve()
                } else {
                    throw new Error(`Failed to start uWebSockets server on port ${port}`)
                }
            })
        })
    }

    async stop() {
        if (this.server) {
            if (typeof this.server.close === 'function') {
                await new Promise((resolve, reject) => {
                    this.server.close((err) => {
                        if (err) reject(err)
                        else resolve()
                    })
                })
            } else if (typeof this.server.shutdown === 'function') {
                this.server.shutdown()
            }
            this.server = null
            console.log('🛑 Server stopped')
        }

        if (this.transport) {
            await this.transport.disconnect()
            this.transport = null
        }

        if (this.service && typeof this.service.cleanup === 'function') {
            await this.service.cleanup()
        }

        return this
    }

    getService() {
        return this.service
    }

    getTransport() {
        return this.transport
    }
}

export default ServerRuntime
