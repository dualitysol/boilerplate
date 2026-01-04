/**
 * Base Runtime Class
 */
export class BaseRuntime {
    constructor(config = {}) {
        this.config = config
        this.env = process.env.NODE_ENV || 'development'
        this.type = config.type || 'local'
    }

    async initialize() {
        throw new Error('initialize() must be implemented by subclass')
    }

    async start() {
        throw new Error('start() must be implemented by subclass')
    }

    async stop() {
        throw new Error('stop() must be implemented by subclass')
    }

    getEnvironment() {
        return this.env
    }

    getType() {
        return this.type
    }

    isProduction() {
        return this.env === 'production'
    }

    isDevelopment() {
        return this.env === 'development'
    }
}

export default BaseRuntime
