import { BaseTransport } from './index'

export class NATSTransport extends BaseTransport {
    constructor(config = {}) {
        super(config)
        this.nc = null
        this.subscriptions = new Map()
    }

    async connect() {
        try {
            // Lazy load NATS to avoid requiring it if not used
            const { connect, StringCodec } = await import('nats')
            
            this.nc = await connect({
                servers: this.config.url || 'nats://localhost:4222',
                ...this.config.options
            })

            this.codec = StringCodec()
            this.connected = true

            console.log(`✅ NATS connected to ${this.config.url}`)

            // Handle connection events
            ;(async () => {
                for await (const status of this.nc.status()) {
                    console.log(`NATS status: ${status.type}: ${status.data}`)
                }
            })()

            return this
        } catch (error) {
            console.error('NATS connection error:', error)
            throw error
        }
    }

    async disconnect() {
        if (this.nc) {
            await this.nc.drain()
            this.nc = null
            this.connected = false
        }
        return this
    }

    async send(target, data, options = {}) {
        if (!this.connected) {
            throw new Error('NATS not connected')
        }

        const payload = this.codec.encode(JSON.stringify(data))
        this.nc.publish(target, payload, options)
    }

    async subscribe(subject, handler) {
        if (!this.connected) {
            throw new Error('NATS not connected')
        }

        const sub = this.nc.subscribe(subject, {
            queue: this.config.queue,
            ...this.config.subscribeOptions
        })

        this.subscriptions.set(subject, sub)

        ;(async () => {
            for await (const msg of sub) {
                try {
                    const data = JSON.parse(this.codec.decode(msg.data))
                    await handler(data, msg)
                } catch (error) {
                    console.error(`NATS subscription handler error [${subject}]:`, error)
                }
            }
        })()

        // Return unsubscribe function
        return () => {
            sub.unsubscribe()
            this.subscriptions.delete(subject)
        }
    }

    async publish(subject, data) {
        return this.send(subject, data)
    }

    /**
     * Request-Reply pattern
     */
    async request(subject, data, options = {}) {
        if (!this.connected) {
            throw new Error('NATS not connected')
        }

        const payload = this.codec.encode(JSON.stringify(data))
        const timeout = options.timeout || 30000

        try {
            const response = await this.nc.request(subject, payload, { timeout })
            return JSON.parse(this.codec.decode(response.data))
        } catch (error) {
            console.error(`NATS request error [${subject}]:`, error)
            throw error
        }
    }

    /**
     * Reply to requests (for service handlers)
     */
    async reply(subject, handler) {
        return this.subscribe(subject, async (data, msg) => {
            try {
                const result = await handler(data)
                const payload = this.codec.encode(JSON.stringify(result))
                msg.respond(payload)
            } catch (error) {
                const errorPayload = this.codec.encode(JSON.stringify({
                    error: error.message,
                    stack: error.stack
                }))
                msg.respond(errorPayload)
            }
        })
    }
}

export default NATSTransport
