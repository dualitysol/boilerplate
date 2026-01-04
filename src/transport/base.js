/**
 * Base Transport Class
 */
export class BaseTransport {
    constructor(config = {}) {
        this.config = config
        this.connected = false
    }

    async connect() {
        throw new Error('connect() must be implemented by subclass')
    }

    async disconnect() {
        throw new Error('disconnect() must be implemented by subclass')
    }

    async send(target, data, options = {}) {
        throw new Error('send() must be implemented by subclass')
    }

    async subscribe(channel, handler) {
        throw new Error('subscribe() must be implemented by subclass')
    }

    async publish(channel, data) {
        throw new Error('publish() must be implemented by subclass')
    }

    async request(target, method, params, options = {}) {
        throw new Error('request() must be implemented by subclass')
    }

    isConnected() {
        return this.connected
    }
}

export default BaseTransport
