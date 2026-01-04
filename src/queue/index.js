/**
 * QueueManager - Unified queue system with multiple backend support
 * Supports: RabbitMQ, Redis, AWS SQS, NATS, Local (in-memory)
 */

export class QueueManager {
    constructor(config = {}) {
        this.config = config
        this.backend = config.backend || 'local'
        this.transport = null
        this.localQueues = new Map()
        this.processors = new Map()
    }

    async connect() {
        if (this.backend === 'local') {
            // Use local in-memory queues
            return this
        }

        // Initialize transport backend
        const { TransportFactory } = require('../transport')
        
        this.transport = TransportFactory.create({
            type: this.backend,
            ...this.config
        })

        await this.transport.connect()
        return this
    }

    async disconnect() {
        // Stop all processors
        for (const [queueName, processor] of this.processors.entries()) {
            if (processor.stop) {
                await processor.stop()
            }
        }
        this.processors.clear()

        if (this.transport) {
            await this.transport.disconnect()
            this.transport = null
        }

        this.localQueues.clear()
    }

    /**
     * Close QueueManager (alias for disconnect)
     */
    async close() {
        return this.disconnect()
    }

    /**
     * Send message to queue
     */
    async send(queueName, data, options = {}) {
        const message = {
            data,
            timestamp: Date.now(),
            id: `${Date.now()}_${Math.random()}`,
            ...options
        }

        if (this.backend === 'local') {
            if (!this.localQueues.has(queueName)) {
                this.localQueues.set(queueName, [])
            }
            this.localQueues.get(queueName).push(message)
        } else if (this.transport) {
            await this.transport.send(queueName, message, { queue: true, ...options })
        } else {
            throw new Error('QueueManager not connected')
        }
    }

    /**
     * Process messages from queue
     */
    async process(queueName, handler, options = {}) {
        if (this.backend === 'local') {
            return this.processLocalQueue(queueName, handler, options)
        } else if (this.transport) {
            return this.processRemoteQueue(queueName, handler, options)
        } else {
            throw new Error('QueueManager not connected')
        }
    }

    /**
     * Process local in-memory queue
     */
    async processLocalQueue(queueName, handler, options = {}) {
        const { interval = 100, concurrency = 1, retryAttempts = 0 } = options

        if (!this.localQueues.has(queueName)) {
            this.localQueues.set(queueName, [])
        }

        let processing = 0
        let stopped = false

        const processNext = async () => {
            if (stopped) return

            const queue = this.localQueues.get(queueName)
            
            while (processing < concurrency && queue.length > 0) {
                const message = queue.shift()
                processing++

                // Track retry attempts
                if (!message.attempts) {
                    message.attempts = 0
                }

                try {
                    await handler(message.data || message)
                } catch (error) {
                    console.error(`Queue handler error [${queueName}]:`, error)
                    
                    message.attempts++

                    // Retry logic
                    if (retryAttempts > 0 && message.attempts < retryAttempts) {
                        // Re-queue for retry
                        queue.push(message)
                    } else if (options.requeueOnError) {
                        // Re-queue on error if configured
                        queue.push(message)
                    }
                } finally {
                    processing--
                }
            }

            if (!stopped) {
                setTimeout(processNext, interval)
            }
        }

        // Start processing
        processNext()

        const processor = {
            stop: () => {
                stopped = true
            }
        }

        this.processors.set(queueName, processor)

        return () => processor.stop()
    }

    /**
     * Process remote queue
     */
    async processRemoteQueue(queueName, handler, options = {}) {
        let unsubscribe

        if (this.backend === 'rabbitmq') {
            // RabbitMQ-specific processing
            unsubscribe = await this.transport.subscribe(queueName, handler, options)
        } else if (this.backend === 'redis') {
            // Redis queue processing
            unsubscribe = await this.transport.processQueue(queueName, handler, options)
        } else if (this.backend === 'nats') {
            // NATS queue subscription
            unsubscribe = await this.transport.subscribe(queueName, handler)
        } else {
            throw new Error(`Queue processing not supported for backend: ${this.backend}`)
        }

        this.processors.set(queueName, { stop: unsubscribe })
        return unsubscribe
    }

    /**
     * Get queue size (local only)
     */
    getQueueSize(queueName) {
        if (this.backend !== 'local') {
            throw new Error('getQueueSize only supported for local backend')
        }

        const queue = this.localQueues.get(queueName)
        return queue ? queue.length : 0
    }

    /**
     * Clear queue (local only)
     */
    clearQueue(queueName) {
        if (this.backend !== 'local') {
            throw new Error('clearQueue only supported for local backend')
        }

        if (this.localQueues.has(queueName)) {
            this.localQueues.set(queueName, [])
        }
    }

    /**
     * Bulk send messages
     */
    async sendBatch(queueName, messages, options = {}) {
        const promises = messages.map(data => this.send(queueName, data, options))
        return Promise.all(promises)
    }

    /**
     * Get queue statistics (local only)
     */
    getQueueStats(queueName) {
        if (this.backend !== 'local') {
            throw new Error('getQueueStats only supported for local backend')
        }

        const queue = this.localQueues.get(queueName)
        return {
            pending: queue ? queue.length : 0,
            processing: 0 // Could track this with more complexity
        }
    }
}

export default QueueManager
