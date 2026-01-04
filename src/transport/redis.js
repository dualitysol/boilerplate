import { BaseTransport } from './index'

export class RedisTransport extends BaseTransport {
    constructor(config = {}) {
        super(config)
        this.client = null
        this.subscriber = null
        this.subscriptions = new Map()
    }

    async connect() {
        try {
            // Lazy load Redis to avoid requiring it if not used
            const { createClient } = await import('redis')

            this.client = createClient({
                url: this.config.url || 'redis://localhost:6379',
                ...this.config.options
            })

            this.subscriber = this.client.duplicate()

            await this.client.connect()
            await this.subscriber.connect()

            this.connected = true
            console.log(`✅ Redis connected to ${this.config.url}`)

            return this
        } catch (error) {
            console.error('Redis connection error:', error)
            throw error
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.quit()
            await this.subscriber.quit()
            this.client = null
            this.subscriber = null
            this.connected = false
        }
        return this
    }

    async send(target, data, options = {}) {
        if (!this.connected) {
            throw new Error('Redis not connected')
        }

        const payload = JSON.stringify(data)

        // Use list for queue-like behavior
        if (options.queue) {
            await this.client.rPush(target, payload)
        } else {
            // Use pub/sub
            await this.client.publish(target, payload)
        }
    }

    async subscribe(channel, handler) {
        if (!this.connected) {
            throw new Error('Redis not connected')
        }

        const wrappedHandler = (message) => {
            try {
                const data = JSON.parse(message)
                handler(data, { channel, message })
            } catch (error) {
                console.error(`Redis subscription handler error [${channel}]:`, error)
            }
        }

        await this.subscriber.subscribe(channel, wrappedHandler)
        this.subscriptions.set(channel, wrappedHandler)

        // Return unsubscribe function
        return async () => {
            await this.subscriber.unsubscribe(channel)
            this.subscriptions.delete(channel)
        }
    }

    async publish(channel, data) {
        return this.send(channel, data)
    }

    /**
     * Pattern-based subscription
     */
    async psubscribe(pattern, handler) {
        if (!this.connected) {
            throw new Error('Redis not connected')
        }

        const wrappedHandler = (message, channel) => {
            try {
                const data = JSON.parse(message)
                handler(data, { channel, pattern, message })
            } catch (error) {
                console.error(`Redis psubscribe handler error [${pattern}]:`, error)
            }
        }

        await this.subscriber.pSubscribe(pattern, wrappedHandler)

        return async () => {
            await this.subscriber.pUnsubscribe(pattern)
        }
    }

    /**
     * Queue-based request (BLPOP for blocking queue)
     */
    async request(queue, data, options = {}) {
        if (!this.connected) {
            throw new Error('Redis not connected')
        }

        const requestId = `${Date.now()}_${Math.random()}`
        const replyQueue = `${queue}:reply:${requestId}`
        const timeout = options.timeout || 30

        await this.send(queue, { ...data, replyQueue }, { queue: true })

        // Wait for response
        const response = await this.client.blPop(replyQueue, timeout)
        
        if (!response) {
            throw new Error(`Request timeout: ${queue}`)
        }

        await this.client.del(replyQueue)
        return JSON.parse(response.element)
    }

    /**
     * Process queue messages
     */
    async processQueue(queue, handler, options = {}) {
        const timeout = options.timeout || 0 // 0 = block indefinitely

        const process = async () => {
            while (this.connected) {
                try {
                    const result = await this.client.blPop(queue, timeout)
                    if (result) {
                        const data = JSON.parse(result.element)
                        await handler(data)
                    }
                } catch (error) {
                    console.error(`Redis queue process error [${queue}]:`, error)
                }
            }
        }

        process()

        return () => {
            // Stop processing (controlled by this.connected)
        }
    }
}

export default RedisTransport
