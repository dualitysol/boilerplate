import { BaseRuntime } from './base.js'

export class ContainerRuntime extends BaseRuntime {
    constructor(config = {}) {
        super({ ...config, type: 'container' })
        this.server = null
        this.service = null
        this.transport = null
        this.healthCheckInterval = null
    }

    async initialize() {
        console.log('🐳 Initializing Container Runtime')
        
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

        // Set up graceful shutdown
        this.setupGracefulShutdown()

        return this
    }

    async start() {
        const { createServer } = require('node:http')
        const { createYoga, createSchema } = require('graphql-yoga')
        const { 
            port = process.env.PORT || 3000, 
            host = '0.0.0.0',
            typeDefs,
            resolvers,
            contextBuilder,
            healthCheck = true
        } = this.config

        console.log(`\n🚀 Starting Container Server...`)

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
            graphiql: false, // Typically disabled in containers
            landingPage: false
        })

        this.server = createServer(async (req, res) => {
            // Health check endpoint for K8s/Docker
            if (healthCheck && req.url === '/health') {
                return this.handleHealthCheck(req, res)
            }

            // Readiness check
            if (healthCheck && req.url === '/ready') {
                return this.handleReadinessCheck(req, res)
            }

            // Liveness check
            if (healthCheck && req.url === '/live') {
                return this.handleLivenessCheck(req, res)
            }

            // Metrics endpoint (Prometheus compatible)
            if (req.url === '/metrics') {
                return this.handleMetrics(req, res)
            }

            // GraphQL endpoint
            return yoga(req, res)
        })

        await new Promise((resolve) => {
            this.server.listen(port, host, () => {
                console.log(`\n✅ Container server running at http://${host}:${port}/graphql`)
                console.log(`💚 Health check: http://${host}:${port}/health`)
                console.log(`📊 Metrics: http://${host}:${port}/metrics`)
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

        // Start periodic health checks if configured
        if (this.config.healthCheckInterval) {
            this.startHealthCheckMonitoring()
        }

        return this
    }

    async stop() {
        console.log('🛑 Stopping container runtime...')

        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval)
            this.healthCheckInterval = null
        }

        if (this.server) {
            await new Promise((resolve, reject) => {
                this.server.close((err) => {
                    if (err) reject(err)
                    else resolve()
                })
            })
            this.server = null
        }

        if (this.transport) {
            await this.transport.disconnect()
            this.transport = null
        }

        if (this.service && typeof this.service.cleanup === 'function') {
            await this.service.cleanup()
        }

        console.log('✅ Container runtime stopped gracefully')
        return this
    }

    handleHealthCheck(req, res) {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            service: this.service?.name || 'unknown',
            environment: this.env
        }

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(health))
    }

    handleReadinessCheck(req, res) {
        // Check if service is ready to accept traffic
        const ready = this.isReady()

        if (ready) {
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ status: 'ready' }))
        } else {
            res.writeHead(503, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ status: 'not ready' }))
        }
    }

    handleLivenessCheck(req, res) {
        // Simple liveness check
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ status: 'alive' }))
    }

    handleMetrics(req, res) {
        // Basic Prometheus-compatible metrics
        const metrics = this.collectMetrics()
        
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end(metrics)
    }

    isReady() {
        // Check various readiness conditions
        const transportReady = !this.transport || this.transport.isConnected()
        const serverReady = this.server !== null
        
        return transportReady && serverReady
    }

    collectMetrics() {
        const memUsage = process.memoryUsage()
        const cpuUsage = process.cpuUsage()

        return `
# HELP process_uptime_seconds Process uptime in seconds
# TYPE process_uptime_seconds gauge
process_uptime_seconds ${process.uptime()}

# HELP process_memory_rss_bytes Process resident memory in bytes
# TYPE process_memory_rss_bytes gauge
process_memory_rss_bytes ${memUsage.rss}

# HELP process_memory_heap_used_bytes Process heap memory used in bytes
# TYPE process_memory_heap_used_bytes gauge
process_memory_heap_used_bytes ${memUsage.heapUsed}

# HELP process_memory_heap_total_bytes Process heap memory total in bytes
# TYPE process_memory_heap_total_bytes gauge
process_memory_heap_total_bytes ${memUsage.heapTotal}

# HELP process_cpu_user_microseconds Process CPU user time in microseconds
# TYPE process_cpu_user_microseconds counter
process_cpu_user_microseconds ${cpuUsage.user}

# HELP process_cpu_system_microseconds Process CPU system time in microseconds
# TYPE process_cpu_system_microseconds counter
process_cpu_system_microseconds ${cpuUsage.system}
        `.trim()
    }

    setupGracefulShutdown() {
        const gracefulShutdown = async (signal) => {
            console.log(`\n⚠️  Received ${signal}, starting graceful shutdown...`)
            
            try {
                await this.stop()
                process.exit(0)
            } catch (error) {
                console.error('Error during graceful shutdown:', error)
                process.exit(1)
            }
        }

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
        process.on('SIGINT', () => gracefulShutdown('SIGINT'))
    }

    startHealthCheckMonitoring() {
        this.healthCheckInterval = setInterval(() => {
            if (!this.isReady()) {
                console.warn('⚠️  Service not ready!')
            }
        }, this.config.healthCheckInterval || 30000)
    }
}

export default ContainerRuntime
