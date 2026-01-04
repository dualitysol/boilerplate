import { BaseTransport } from './index'

export class ZeroMQTransport extends BaseTransport {
    constructor(config = {}) {
        super(config)
        this.sockets = new Map()
        this.subscriptions = new Map()
    }

    async connect() {
        try {
            // Lazy load zeromq
            this.zmq = await import('zeromq')
            this.connected = true
            console.log(`✅ ZeroMQ initialized`)
            return this
        } catch (error) {
            console.error('ZeroMQ initialization error:', error)
            throw error
        }
    }

    async disconnect() {
        for (const [name, socket] of this.sockets.entries()) {
            await socket.close()
        }
        this.sockets.clear()
        this.subscriptions.clear()
        this.connected = false
        return this
    }

    getOrCreateSocket(name, type, mode = 'connect') {
        if (this.sockets.has(name)) {
            return this.sockets.get(name)
        }

        let socket
        switch (type) {
            case 'pub':
                socket = new this.zmq.Publisher()
                break
            case 'sub':
                socket = new this.zmq.Subscriber()
                break
            case 'push':
                socket = new this.zmq.Push()
                break
            case 'pull':
                socket = new this.zmq.Pull()
                break
            case 'req':
                socket = new this.zmq.Request()
                break
            case 'rep':
                socket = new this.zmq.Reply()
                break
            case 'dealer':
                socket = new this.zmq.Dealer()
                break
            case 'router':
                socket = new this.zmq.Router()
                break
            default:
                throw new Error(`Unknown ZeroMQ socket type: ${type}`)
        }

        this.sockets.set(name, socket)
        return socket
    }

    async send(target, data, options = {}) {
        if (!this.connected) {
            throw new Error('ZeroMQ not initialized')
        }

        const { socketType = 'push', address = target } = options
        const socket = this.getOrCreateSocket(address, socketType)

        if (!socket.connected) {
            await socket.connect(address)
        }

        const message = JSON.stringify(data)
        await socket.send(message)
    }

    async subscribe(topic, handler, options = {}) {
        if (!this.connected) {
            throw new Error('ZeroMQ not initialized')
        }

        const { address = this.config.url || 'tcp://localhost:5555' } = options
        const socketName = `sub_${address}`
        const socket = this.getOrCreateSocket(socketName, 'sub')

        if (!socket.connected) {
            await socket.connect(address)
            socket.subscribe(topic)
        }

        // Start receiving messages
        if (!this.subscriptions.has(socketName)) {
            this.subscriptions.set(socketName, new Map())
            
            ;(async () => {
                for await (const [topicBuffer, msgBuffer] of socket) {
                    const receivedTopic = topicBuffer.toString()
                    const handlers = this.subscriptions.get(socketName)
                    
                    if (handlers && handlers.has(receivedTopic)) {
                        try {
                            const data = JSON.parse(msgBuffer.toString())
                            for (const handler of handlers.get(receivedTopic)) {
                                await handler(data, { topic: receivedTopic })
                            }
                        } catch (error) {
                            console.error(`ZeroMQ subscription handler error [${receivedTopic}]:`, error)
                        }
                    }
                }
            })()
        }

        const handlers = this.subscriptions.get(socketName)
        if (!handlers.has(topic)) {
            handlers.set(topic, new Set())
        }
        handlers.get(topic).add(handler)

        // Return unsubscribe function
        return () => {
            const topicHandlers = handlers.get(topic)
            if (topicHandlers) {
                topicHandlers.delete(handler)
                if (topicHandlers.size === 0) {
                    handlers.delete(topic)
                    socket.unsubscribe(topic)
                }
            }
        }
    }

    async publish(topic, data, options = {}) {
        if (!this.connected) {
            throw new Error('ZeroMQ not initialized')
        }

        const { address = this.config.url || 'tcp://*:5555', bind = true } = options
        const socketName = `pub_${address}`
        const socket = this.getOrCreateSocket(socketName, 'pub')

        if (!socket.connected) {
            if (bind) {
                await socket.bind(address)
            } else {
                await socket.connect(address)
            }
        }

        const message = JSON.stringify(data)
        await socket.send([topic, message])
    }

    /**
     * Request-Reply pattern (REQ/REP)
     */
    async request(address, data, options = {}) {
        if (!this.connected) {
            throw new Error('ZeroMQ not initialized')
        }

        const timeout = options.timeout || 30000
        const socketName = `req_${address}_${Date.now()}`
        const socket = this.getOrCreateSocket(socketName, 'req')

        try {
            await socket.connect(address)

            const message = JSON.stringify(data)
            await socket.send(message)

            // Wait for reply with timeout
            const reply = await Promise.race([
                socket.receive(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Request timeout')), timeout)
                )
            ])

            const result = JSON.parse(reply[0].toString())
            
            // Close and cleanup
            await socket.close()
            this.sockets.delete(socketName)

            return result
        } catch (error) {
            await socket.close()
            this.sockets.delete(socketName)
            throw error
        }
    }

    /**
     * Reply handler (REP socket)
     */
    async reply(address, handler, options = {}) {
        if (!this.connected) {
            throw new Error('ZeroMQ not initialized')
        }

        const { bind = true } = options
        const socketName = `rep_${address}`
        const socket = this.getOrCreateSocket(socketName, 'rep')

        if (bind) {
            await socket.bind(address)
        } else {
            await socket.connect(address)
        }

        ;(async () => {
            for await (const [msgBuffer] of socket) {
                try {
                    const data = JSON.parse(msgBuffer.toString())
                    const result = await handler(data)
                    const reply = JSON.stringify(result)
                    await socket.send(reply)
                } catch (error) {
                    console.error('ZeroMQ reply handler error:', error)
                    const errorReply = JSON.stringify({
                        error: error.message,
                        stack: error.stack
                    })
                    await socket.send(errorReply)
                }
            }
        })()

        return () => {
            socket.close()
            this.sockets.delete(socketName)
        }
    }

    /**
     * Push-Pull pattern (for load balancing)
     */
    async push(address, data, options = {}) {
        return this.send(address, data, { ...options, socketType: 'push' })
    }

    async pull(address, handler, options = {}) {
        if (!this.connected) {
            throw new Error('ZeroMQ not initialized')
        }

        const { bind = true } = options
        const socketName = `pull_${address}`
        const socket = this.getOrCreateSocket(socketName, 'pull')

        if (bind) {
            await socket.bind(address)
        } else {
            await socket.connect(address)
        }

        ;(async () => {
            for await (const [msgBuffer] of socket) {
                try {
                    const data = JSON.parse(msgBuffer.toString())
                    await handler(data)
                } catch (error) {
                    console.error('ZeroMQ pull handler error:', error)
                }
            }
        })()

        return () => {
            socket.close()
            this.sockets.delete(socketName)
        }
    }
}

export default ZeroMQTransport
