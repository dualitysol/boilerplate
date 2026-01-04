/**
 * Transport layer abstraction for inter-service communication
 * Supports: HTTP, WebSocket, RabbitMQ, Redis, ZeroMQ, gRPC, NATS
 */

/**
 * @typedef {Object} TransportConfig
 * @property {string} type - Transport type: 'http' | 'websocket' | 'rabbitmq' | 'redis' | 'zeromq' | 'grpc' | 'nats'
 * @property {string} [url] - Connection URL
 * @property {Object} [options] - Transport-specific options
 */

/**
 * @typedef {Object} ITransport
 * @property {Function} connect - Connect to transport
 * @property {Function} disconnect - Disconnect from transport
 * @property {Function} send - Send message
 * @property {Function} subscribe - Subscribe to messages
 * @property {Function} publish - Publish message
 */

export { BaseTransport } from './base.js'
export { HTTPTransport } from './http.js'
export { WebSocketTransport } from './websocket.js'
export { NATSTransport } from './nats.js'
export { RedisTransport } from './redis.js'
export { RabbitMQTransport } from './rabbitmq.js'
export { ZeroMQTransport } from './zeromq.js'
export { GRPCTransport } from './grpc.js'

export class TransportFactory {
    static transports = new Map()

    /**
     * Create transport instance based on config
     * @param {TransportConfig} config 
     * @returns {BaseTransport}
     */
    static create(config) {
        const { type } = config

        switch (type) {
            case 'http':
                const { HTTPTransport } = require('./http')
                return new HTTPTransport(config)
            case 'websocket':
                const { WebSocketTransport } = require('./websocket')
                return new WebSocketTransport(config)
            case 'nats':
                const { NATSTransport } = require('./nats')
                return new NATSTransport(config)
            case 'redis':
                const { RedisTransport } = require('./redis')
                return new RedisTransport(config)
            case 'rabbitmq':
                const { RabbitMQTransport } = require('./rabbitmq')
                return new RabbitMQTransport(config)
            case 'zeromq':
                const { ZeroMQTransport } = require('./zeromq')
                return new ZeroMQTransport(config)
            case 'grpc':
                const { GRPCTransport } = require('./grpc')
                return new GRPCTransport(config)
            default:
                throw new Error(`Unknown transport type: ${type}`)
        }
    }

    static register(name, transport) {
        this.transports.set(name, transport)
    }

    static get(name) {
        return this.transports.get(name)
    }
}

export default TransportFactory
