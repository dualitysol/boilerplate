/**
 * EventBus - Unified event system with multiple backend support
 * Supports: Local (EventEmitter), AWS SNS/SQS, WebSockets, NATS, ZeroMQ, HTTP, Redis
 */

import { EventEmitter } from 'events'

export class EventBus {
    constructor(config = {}) {
        this.config = config
        this.backend = config.backend || 'local'
        this.transport = null
        this.localEmitter = new EventEmitter()
        this.subscriptions = new Map()
    }

    async connect() {
        if (this.backend === 'local') {
            // Use local EventEmitter
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
        if (this.transport) {
            await this.transport.disconnect()
            this.transport = null
        }

        this.localEmitter.removeAllListeners()
        this.subscriptions.clear()
    }

    /**
     * Close EventBus (alias for disconnect)
     */
    async close() {
        return this.disconnect()
    }

    /**
     * Publish an event
     */
    async publish(eventName, data, options = {}) {
        const payload = {
            event: eventName,
            data,
            timestamp: Date.now(),
            ...options
        }

        if (this.backend === 'local') {
            this.localEmitter.emit(eventName, payload)
        } else if (this.transport) {
            await this.transport.publish(eventName, payload)
        } else {
            throw new Error('EventBus not connected')
        }
    }

    /**
     * Subscribe to an event
     */
    async subscribe(eventName, handler) {
        if (this.backend === 'local') {
            // Support wildcard patterns for local backend
            if (eventName.includes('*')) {
                const pattern = new RegExp('^' + eventName.replace(/\*/g, '.*') + '$')
                const wrappedHandler = (payload) => {
                    handler(payload.data || payload)
                }
                
                // Store pattern subscription
                const patternKey = `__pattern__${eventName}`
                if (!this.subscriptions.has(patternKey)) {
                    this.subscriptions.set(patternKey, new Set())
                }
                this.subscriptions.get(patternKey).add({ pattern, handler: wrappedHandler })

                // Override emit to check patterns
                const originalEmit = this.localEmitter.emit.bind(this.localEmitter)
                this.localEmitter.emit = (event, ...args) => {
                    // Call pattern handlers
                    this.subscriptions.forEach((handlers, key) => {
                        if (key.startsWith('__pattern__')) {
                            handlers.forEach(({ pattern, handler: h }) => {
                                if (pattern.test(event)) {
                                    h(...args)
                                }
                            })
                        }
                    })
                    // Call original emit
                    return originalEmit(event, ...args)
                }

                return () => {
                    const handlers = this.subscriptions.get(patternKey)
                    if (handlers) {
                        for (const item of handlers) {
                            if (item.handler === wrappedHandler) {
                                handlers.delete(item)
                                break
                            }
                        }
                    }
                }
            }

            const wrappedHandler = (payload) => {
                try {
                    handler(payload.data || payload)
                } catch (error) {
                    console.error(`EventBus handler error for ${eventName}:`, error)
                }
            }
            this.localEmitter.on(eventName, wrappedHandler)

            // Store for cleanup
            if (!this.subscriptions.has(eventName)) {
                this.subscriptions.set(eventName, new Set())
            }
            this.subscriptions.get(eventName).add(wrappedHandler)

            // Return unsubscribe function
            return () => {
                this.localEmitter.off(eventName, wrappedHandler)
                this.subscriptions.get(eventName)?.delete(wrappedHandler)
            }
        } else if (this.transport) {
            const wrappedHandler = (payload) => handler(payload.data || payload)
            return this.transport.subscribe(eventName, wrappedHandler)
        } else {
            throw new Error('EventBus not connected')
        }
    }

    /**
     * Emit event (alias for publish)
     */
    async emit(eventName, data, options) {
        return this.publish(eventName, data, options)
    }

    /**
     * Listen to event (alias for subscribe)
     */
    async on(eventName, handler) {
        return this.subscribe(eventName, handler)
    }

    /**
     * Subscribe once
     */
    async once(eventName, handler) {
        const unsubscribe = await this.subscribe(eventName, async (data) => {
            unsubscribe()
            await handler(data)
        })
        return unsubscribe
    }

    /**
     * Pattern-based subscription (for supported backends)
     */
    async subscribePattern(pattern, handler) {
        if (this.backend === 'local') {
            throw new Error('Pattern subscription not supported for local backend')
        }

        if (this.transport && typeof this.transport.psubscribe === 'function') {
            return this.transport.psubscribe(pattern, (payload) => handler(payload.data || payload))
        }

        throw new Error(`Pattern subscription not supported for backend: ${this.backend}`)
    }
}

export default EventBus
