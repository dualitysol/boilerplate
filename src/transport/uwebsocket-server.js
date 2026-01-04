/**
 * UWebSocketServer - High-performance WebSocket server for inter-service communication
 * 
 * Features:
 * - Ultra-fast message handling
 * - Request/Reply pattern
 * - Pub/Sub support
 * - Backpressure handling
 * - Connection pooling
 */

import uws from 'uWebSockets.js'

export class UWebSocketServer {
    constructor(config = {}) {
        this.config = config
        this.port = config.port || 3000
        this.app = null
        this.clients = new Map() // clientId -> { ws, subscriptions }
        this.handlers = new Map() // method -> handler function
        this.channels = new Map() // channel -> Set of clientIds
    }

    /**
     * Start WebSocket server
     */
    async start() {
        this.app = uws.App()

        this.app.ws('/*', {
            /* WebSocket options */
            compression: uws.SHARED_COMPRESSOR,
            maxPayloadLength: 16 * 1024 * 1024,
            idleTimeout: 120,
            maxBackpressure: 1024 * 1024,

            /* Handlers */
            open: (ws) => {
                const clientId = this.generateClientId()
                ws.clientId = clientId
                
                this.clients.set(clientId, {
                    ws,
                    subscriptions: new Set()
                })
                
                console.log(`[UWebSocketServer] Client connected: ${clientId}`)
            },

            message: (ws, message, isBinary) => {
                try {
                    const data = Buffer.from(message).toString()
                    const msg = JSON.parse(data)
                    this.handleMessage(ws, msg)
                } catch (error) {
                    console.error('[UWebSocketServer] Failed to parse message:', error)
                    this.sendError(ws, null, 'Invalid message format')
                }
            },

            drain: (ws) => {
                console.log('[UWebSocketServer] WebSocket backpressure: ' + ws.getBufferedAmount())
            },

            close: (ws, code, message) => {
                const clientId = ws.clientId
                const client = this.clients.get(clientId)
                
                if (client) {
                    // Remove from all channels
                    for (const channel of client.subscriptions) {
                        const subscribers = this.channels.get(channel)
                        if (subscribers) {
                            subscribers.delete(clientId)
                        }
                    }
                    this.clients.delete(clientId)
                }
                
                console.log(`[UWebSocketServer] Client disconnected: ${clientId}`)
            }
        })

        return new Promise((resolve) => {
            this.app.listen(this.port, (token) => {
                if (token) {
                    console.log(`[UWebSocketServer] Listening on port ${this.port}`)
                    this.listenSocket = token
                    resolve()
                } else {
                    throw new Error(`Failed to listen on port ${this.port}`)
                }
            })
        })
    }

    /**
     * Handle incoming message
     */
    async handleMessage(ws, message) {
        const { id, type, method, params, channel, data } = message

        switch (type) {
            case 'subscribe':
                this.handleSubscribe(ws, channel)
                break

            case 'unsubscribe':
                this.handleUnsubscribe(ws, channel)
                break

            case 'publish':
                await this.handlePublish(ws, channel, data)
                break

            case 'message':
                // One-way message (no response)
                this.emit('message', { clientId: ws.clientId, data })
                break

            default:
                // RPC request
                if (method) {
                    await this.handleRequest(ws, id, method, params)
                }
        }
    }

    /**
     * Handle RPC request
     */
    async handleRequest(ws, requestId, method, params) {
        const handler = this.handlers.get(method)

        if (!handler) {
            this.sendError(ws, requestId, `Method not found: ${method}`)
            return
        }

        try {
            const result = await handler(params, { clientId: ws.clientId })
            this.sendResponse(ws, requestId, result)
        } catch (error) {
            console.error(`[UWebSocketServer] Error handling ${method}:`, error)
            this.sendError(ws, requestId, error.message)
        }
    }

    /**
     * Handle subscribe
     */
    handleSubscribe(ws, channel) {
        const clientId = ws.clientId
        const client = this.clients.get(clientId)
        
        if (!client) return

        // Add to channel
        if (!this.channels.has(channel)) {
            this.channels.set(channel, new Set())
        }
        this.channels.get(channel).add(clientId)
        client.subscriptions.add(channel)

        console.log(`[UWebSocketServer] Client ${clientId} subscribed to ${channel}`)
    }

    /**
     * Handle unsubscribe
     */
    handleUnsubscribe(ws, channel) {
        const clientId = ws.clientId
        const client = this.clients.get(clientId)
        
        if (!client) return

        const subscribers = this.channels.get(channel)
        if (subscribers) {
            subscribers.delete(clientId)
        }
        client.subscriptions.delete(channel)

        console.log(`[UWebSocketServer] Client ${clientId} unsubscribed from ${channel}`)
    }

    /**
     * Handle publish
     */
    async handlePublish(ws, channel, data) {
        const subscribers = this.channels.get(channel)
        if (!subscribers || subscribers.size === 0) return

        const message = JSON.stringify({
            type: 'channel-message',
            channel,
            data,
            timestamp: Date.now()
        })

        // Broadcast to all subscribers
        for (const clientId of subscribers) {
            const client = this.clients.get(clientId)
            if (client && client.ws !== ws) {
                this.send(client.ws, message)
            }
        }
    }

    /**
     * Register RPC method handler
     */
    registerHandler(method, handler) {
        this.handlers.set(method, handler)
        console.log(`[UWebSocketServer] Registered handler: ${method}`)
    }

    /**
     * Register multiple handlers
     */
    registerHandlers(handlers) {
        for (const [method, handler] of Object.entries(handlers)) {
            this.registerHandler(method, handler)
        }
    }

    /**
     * Send response
     */
    sendResponse(ws, requestId, result) {
        const message = JSON.stringify({
            id: requestId,
            result,
            timestamp: Date.now()
        })
        this.send(ws, message)
    }

    /**
     * Send error
     */
    sendError(ws, requestId, error) {
        const message = JSON.stringify({
            id: requestId,
            error: error.toString(),
            timestamp: Date.now()
        })
        this.send(ws, message)
    }

    /**
     * Send message with backpressure handling
     */
    send(ws, message) {
        const buffered = ws.getBufferedAmount()
        
        // Check backpressure
        if (buffered > this.config.maxBackpressure || 1024 * 1024) {
            console.warn('[UWebSocketServer] High backpressure, message dropped')
            return false
        }

        const result = ws.send(message, false, false)
        return result === 1 // 1 = success, 2 = dropped
    }

    /**
     * Broadcast to all clients
     */
    broadcast(message) {
        const msg = typeof message === 'string' ? message : JSON.stringify(message)
        
        for (const client of this.clients.values()) {
            this.send(client.ws, msg)
        }
    }

    /**
     * Stop server
     */
    async stop() {
        if (this.listenSocket) {
            uws.us_listen_socket_close(this.listenSocket)
            this.listenSocket = null
        }

        // Close all client connections
        for (const client of this.clients.values()) {
            client.ws.close()
        }

        this.clients.clear()
        this.channels.clear()
        this.handlers.clear()

        console.log('[UWebSocketServer] Server stopped')
    }

    /**
     * Generate unique client ID
     */
    generateClientId() {
        return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    /**
     * Get server stats
     */
    getStats() {
        return {
            clients: this.clients.size,
            channels: this.channels.size,
            handlers: this.handlers.size,
            channelStats: Array.from(this.channels.entries()).map(([channel, subscribers]) => ({
                channel,
                subscribers: subscribers.size
            }))
        }
    }
}

export default UWebSocketServer
