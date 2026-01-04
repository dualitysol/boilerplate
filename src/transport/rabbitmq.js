import { BaseTransport } from './index'

export class RabbitMQTransport extends BaseTransport {
    constructor(config = {}) {
        super(config)
        this.connection = null
        this.channel = null
        this.subscriptions = new Map()
    }

    async connect() {
        try {
            // Lazy load amqplib
            const amqp = await import('amqplib')

            this.connection = await amqp.connect(
                this.config.url || 'amqp://localhost',
                this.config.options
            )

            this.channel = await this.connection.createChannel()
            
            // Set prefetch for fair dispatch
            if (this.config.prefetch) {
                await this.channel.prefetch(this.config.prefetch)
            }

            this.connected = true
            console.log(`✅ RabbitMQ connected to ${this.config.url}`)

            this.connection.on('error', (error) => {
                console.error('RabbitMQ connection error:', error)
                this.connected = false
            })

            this.connection.on('close', () => {
                console.log('RabbitMQ connection closed')
                this.connected = false
            })

            return this
        } catch (error) {
            console.error('RabbitMQ connection error:', error)
            throw error
        }
    }

    async disconnect() {
        if (this.channel) {
            await this.channel.close()
            this.channel = null
        }
        if (this.connection) {
            await this.connection.close()
            this.connection = null
        }
        this.connected = false
        return this
    }

    async send(target, data, options = {}) {
        if (!this.connected) {
            throw new Error('RabbitMQ not connected')
        }

        const { exchange = '', routingKey = target, persistent = true } = options

        if (exchange) {
            await this.channel.assertExchange(exchange, options.exchangeType || 'topic', {
                durable: options.durable !== false
            })
        }

        const buffer = Buffer.from(JSON.stringify(data))

        return this.channel.publish(
            exchange,
            routingKey,
            buffer,
            {
                persistent,
                contentType: 'application/json',
                ...options.publishOptions
            }
        )
    }

    async subscribe(queue, handler, options = {}) {
        if (!this.connected) {
            throw new Error('RabbitMQ not connected')
        }

        const { exchange, routingKey, queueOptions = {}, consumeOptions = {} } = options

        // Assert queue
        await this.channel.assertQueue(queue, {
            durable: queueOptions.durable !== false,
            exclusive: queueOptions.exclusive || false,
            autoDelete: queueOptions.autoDelete || false,
            ...queueOptions
        })

        // Bind to exchange if specified
        if (exchange) {
            await this.channel.assertExchange(exchange, options.exchangeType || 'topic', {
                durable: true
            })
            await this.channel.bindQueue(queue, exchange, routingKey || '#')
        }

        // Consume messages
        const consumer = await this.channel.consume(
            queue,
            async (msg) => {
                if (!msg) return

                try {
                    const data = JSON.parse(msg.content.toString())
                    await handler(data, msg)
                    
                    // Auto-ack if not disabled
                    if (consumeOptions.noAck !== true && consumeOptions.manualAck !== true) {
                        this.channel.ack(msg)
                    }
                } catch (error) {
                    console.error(`RabbitMQ subscription handler error [${queue}]:`, error)
                    
                    // Reject and requeue on error (or send to DLX if configured)
                    if (consumeOptions.noAck !== true) {
                        this.channel.nack(msg, false, options.requeueOnError !== false)
                    }
                }
            },
            {
                noAck: consumeOptions.noAck || false,
                ...consumeOptions
            }
        )

        this.subscriptions.set(queue, consumer.consumerTag)

        // Return unsubscribe function
        return async () => {
            await this.channel.cancel(consumer.consumerTag)
            this.subscriptions.delete(queue)
        }
    }

    async publish(exchange, data, routingKey = '', options = {}) {
        return this.send(routingKey, data, {
            exchange,
            routingKey,
            ...options
        })
    }

    /**
     * RPC pattern - Request with reply
     */
    async request(queue, data, options = {}) {
        if (!this.connected) {
            throw new Error('RabbitMQ not connected')
        }

        const timeout = options.timeout || 30000
        const correlationId = `${Date.now()}_${Math.random()}`

        return new Promise(async (resolve, reject) => {
            // Create exclusive reply queue
            const { queue: replyQueue } = await this.channel.assertQueue('', {
                exclusive: true,
                autoDelete: true
            })

            // Set up consumer for reply
            const timer = setTimeout(() => {
                this.channel.cancel(consumer.consumerTag)
                reject(new Error(`Request timeout: ${queue}`))
            }, timeout)

            const consumer = await this.channel.consume(
                replyQueue,
                (msg) => {
                    if (msg.properties.correlationId === correlationId) {
                        clearTimeout(timer)
                        this.channel.cancel(consumer.consumerTag)
                        
                        try {
                            const result = JSON.parse(msg.content.toString())
                            resolve(result)
                        } catch (error) {
                            reject(error)
                        }
                    }
                },
                { noAck: true }
            )

            // Send request
            await this.send(queue, data, {
                ...options,
                publishOptions: {
                    correlationId,
                    replyTo: replyQueue,
                    ...options.publishOptions
                }
            })
        })
    }

    /**
     * RPC pattern - Reply handler (for services)
     */
    async reply(queue, handler, options = {}) {
        return this.subscribe(queue, async (data, msg) => {
            try {
                const result = await handler(data)
                
                if (msg.properties.replyTo) {
                    const buffer = Buffer.from(JSON.stringify(result))
                    this.channel.sendToQueue(
                        msg.properties.replyTo,
                        buffer,
                        {
                            correlationId: msg.properties.correlationId,
                            contentType: 'application/json'
                        }
                    )
                }
                
                this.channel.ack(msg)
            } catch (error) {
                console.error('RabbitMQ reply handler error:', error)
                
                if (msg.properties.replyTo) {
                    const errorBuffer = Buffer.from(JSON.stringify({
                        error: error.message,
                        stack: error.stack
                    }))
                    this.channel.sendToQueue(
                        msg.properties.replyTo,
                        errorBuffer,
                        {
                            correlationId: msg.properties.correlationId,
                            contentType: 'application/json'
                        }
                    )
                }
                
                this.channel.nack(msg, false, false)
            }
        }, {
            ...options,
            consumeOptions: {
                ...options.consumeOptions,
                manualAck: true
            }
        })
    }
}

export default RabbitMQTransport
