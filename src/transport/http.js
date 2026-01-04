import axios from 'axios'
import { BaseTransport } from './base.js'

export class HTTPTransport extends BaseTransport {
    constructor(config = {}) {
        super(config)
        this.client = axios.create({
            baseURL: config.url,
            timeout: config.timeout || 30000,
            headers: config.headers || {},
            ...config.options
        })
    }

    async connect() {
        // HTTP doesn't require persistent connection
        this.connected = true
        return this
    }

    async disconnect() {
        this.connected = false
        return this
    }

    /**
     * Send HTTP request to another service
     * @param {string} target - Service name or URL
     * @param {Object} data - Request payload
     * @param {Object} options - Request options (method, headers, etc.)
     */
    async send(target, data, options = {}) {
        const { method = 'POST', headers = {}, ...rest } = options
        
        try {
            const response = await this.client.request({
                url: target,
                method,
                data,
                headers: { ...this.config.headers, ...headers },
                ...rest
            })
            return response.data
        } catch (error) {
            console.error(`HTTP Transport Error [${target}]:`, error.message)
            throw error
        }
    }

    /**
     * Make GraphQL request
     * @param {string} target - Service endpoint
     * @param {string} query - GraphQL query
     * @param {Object} variables - Query variables
     */
    async request(target, query, variables = {}, options = {}) {
        return this.send(target, { query, variables }, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            ...options
        })
    }

    async subscribe(channel, handler) {
        throw new Error('HTTP transport does not support subscriptions. Use WebSocket instead.')
    }

    async publish(channel, data) {
        // HTTP publish is essentially a POST request
        return this.send(channel, data)
    }
}

export default HTTPTransport
