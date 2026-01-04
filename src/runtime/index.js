/**
 * Runtime adapters for different deployment environments
 * Supports: Local, AWS Lambda, Server (standalone), Container (K8s/Docker), Google Cloud Functions
 */

export { BaseRuntime } from './base.js'
export { LocalRuntime } from './local.js'
export { LambdaRuntime } from './lambda.js'
export { ServerRuntime } from './server.js'
export { ContainerRuntime } from './container.js'
export { GoogleCloudRuntime } from './google-cloud.js'

export class RuntimeFactory {
    static runtimes = new Map()

    /**
     * Create runtime instance based on environment
     * @param {Object} config 
     * @returns {BaseRuntime}
     */
    static create(config = {}) {
        // Auto-detect runtime if not specified
        if (!config.type) {
            config.type = this.detectRuntime()
        }

        const { type } = config

        switch (type) {
            case 'local':
                const { LocalRuntime } = require('./local')
                return new LocalRuntime(config)
            case 'lambda':
            case 'aws-lambda':
                const { LambdaRuntime } = require('./lambda')
                return new LambdaRuntime(config)
            case 'server':
            case 'standalone':
                const { ServerRuntime } = require('./server')
                return new ServerRuntime(config)
            case 'container':
            case 'kubernetes':
            case 'docker':
                const { ContainerRuntime } = require('./container')
                return new ContainerRuntime(config)
            case 'google-cloud':
            case 'gcp':
                const { GoogleCloudRuntime } = require('./google-cloud')
                return new GoogleCloudRuntime(config)
            default:
                throw new Error(`Unknown runtime type: ${type}`)
        }
    }

    /**
     * Auto-detect runtime environment
     */
    static detectRuntime() {
        // AWS Lambda
        if (process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT) {
            return 'lambda'
        }

        // Google Cloud Functions
        if (process.env.FUNCTION_NAME || process.env.GCP_PROJECT) {
            return 'google-cloud'
        }

        // Kubernetes
        if (process.env.KUBERNETES_SERVICE_HOST) {
            return 'container'
        }

        // Docker
        if (process.env.DOCKER_CONTAINER) {
            return 'container'
        }

        // Default to local
        return 'local'
    }

    static register(name, runtime) {
        this.runtimes.set(name, runtime)
    }

    static get(name) {
        return this.runtimes.get(name)
    }
}

export default RuntimeFactory
