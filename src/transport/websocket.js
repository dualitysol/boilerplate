import WebSocket from 'ws'
import { BaseTransport } from './base.js'
import { EventEmitter } from 'events'

export class WebSocketTransport extends BaseTransport {
    constructor(config = {}) {
        super(config)
        this.ws = null
        this.emitter = new EventEmitter()
        this.messageQueue = []
        this.subscriptions = new Map()
    }

    async connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.config.url, this.config.options)

                this.ws.on('open', () => {
                    this.connected = true
                    console.log(`✅ WebSocket connected to ${this.config.url}`)
                    
                    // Send queued messages
                    while (this.messageQueue.length > 0) {
                        const msg = this.messageQueue.shift()
                        this.ws.send(msg)
                    }
                    
                    resolve(this)
                })

                this.ws.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString())
                        this.handleMessage(message)
                    } catch (error) {
                        console.error('WebSocket message parse error:', error)
                    }
                })

                this.ws.on('error', (error) => {
                    console.error('WebSocket error:', error)
                    reject(error)
                })

                this.ws.on('close', () => {
                    this.connected = false
                    console.log('WebSocket disconnected')
                    this.emitter.emit('disconnect')
                })
            } catch (error) {
                reject(error)
            }
        })
    }

    async disconnect() {
        if (this.ws) {
            this.ws.close()
            this.ws = null
            this.connected = false
        }
        return this
    }

    handleMessage(message) {
        const { channel, event, data, id, error } = message

        // Handle RPC responses
        if (id && this.emitter.listenerCount(`rpc:${id}`) > 0) {
            this.emitter.emit(`rpc:${id}`, error || data)
            return
        }

        // Handle channel subscriptions
        if (channel && this.subscriptions.has(channel)) {
            const handlers = this.subscriptions.get(channel)
            handlers.forEach(handler => handler(data, message))
        }

        // Emit event
        if (event) {
            this.emitter.emit(event, data, message)
        }
    }

    async send(target, data, options = {}) {
        const message = JSON.stringify({
            target,
            data,
            timestamp: Date.now(),
            ...options
        })

        if (this.connected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(message)
        } else {
            this.messageQueue.push(message)
        }
    }

    async subscribe(channel, handler) {
        if (!this.subscriptions.has(channel)) {
            this.subscriptions.set(channel, new Set())
            
            // Send subscription message to server
            await this.send('subscribe', { channel })
        }

        this.subscriptions.get(channel).add(handler)

        // Return unsubscribe function
        return () => {
            const handlers = this.subscriptions.get(channel)
            if (handlers) {
                handlers.delete(handler)
                if (handlers.size === 0) {
                    this.subscriptions.delete(channel)
                    this.send('unsubscribe', { channel })
                }
            }
        }
    }

    async publish(channel, data) {
        return this.send('publish', { channel, data })
    }

    /**
     * Make RPC-style request over WebSocket
     */
    async request(target, method, params, options = {}) {
        return new Promise((resolve, reject) => {
            const id = `${Date.now()}_${Math.random()}`
            const timeout = options.timeout || 30000

            const timer = setTimeout(() => {
                this.emitter.removeAllListeners(`rpc:${id}`)
                reject(new Error(`Request timeout: ${method}`))
            }, timeout)

            this.emitter.once(`rpc:${id}`, (response) => {
                clearTimeout(timer)
                if (response instanceof Error) {
                    reject(response)
                } else {
                    resolve(response)
                }
            })

            this.send(target, {
                id,
                method,
                params
            }, options)
        })
    }
}

export default WebSocketTransport
