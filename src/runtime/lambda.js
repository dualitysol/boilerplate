import { BaseRuntime } from './base.js'

export class LambdaRuntime extends BaseRuntime {
    constructor(config = {}) {
        super({ ...config, type: 'lambda' })
        this.handler = null
        this.service = null
    }

    async initialize() {
        console.log('⚡ Initializing AWS Lambda Runtime')
        
        const { ServiceClass, serviceName, storage, events } = this.config

        if (!ServiceClass) {
            throw new Error('ServiceClass is required for Lambda runtime')
        }

        // Initialize single service (Lambda = 1 function per service)
        this.service = new ServiceClass({
            name: serviceName,
            storage,
            events,
            runtime: this
        })

        console.log(`✅ Service ${serviceName} initialized for Lambda`)
        return this
    }

    async start() {
        console.log('⚡ Lambda Runtime ready')
        // Lambda doesn't "start" - it responds to events
        return this
    }

    async stop() {
        if (this.service && typeof this.service.cleanup === 'function') {
            await this.service.cleanup()
        }
        console.log('🛑 Lambda Runtime stopped')
        return this
    }

    /**
     * Create Lambda handler for GraphQL
     */
    createGraphQLHandler(resolvers, typeDefs, contextBuilder) {
        const { createYoga, createSchema } = require('graphql-yoga')

        const yoga = createYoga({
            schema: createSchema({ typeDefs, resolvers }),
            context: (requestContext) => {
                const context = contextBuilder ? contextBuilder(requestContext) : {}
                
                return {
                    ...requestContext,
                    ...context,
                    service: this.service,
                    runtime: this
                }
            },
            graphiql: false, // Disable in Lambda
            landingPage: false
        })

        return async (event, lambdaContext) => {
            try {
                // Parse Lambda event to HTTP request format
                const request = this.parseEventToRequest(event)
                
                // Execute GraphQL
                const response = await yoga.fetch(request, {
                    event,
                    lambdaContext
                })

                // Convert Response to Lambda format
                return this.convertResponseToLambda(response)
            } catch (error) {
                console.error('Lambda handler error:', error)
                return {
                    statusCode: 500,
                    body: JSON.stringify({
                        error: error.message
                    }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            }
        }
    }

    /**
     * Create Lambda handler for direct method invocation (not GraphQL)
     */
    createDirectHandler(methodName) {
        return async (event, context) => {
            try {
                const { payload = {} } = typeof event === 'string' ? JSON.parse(event) : event

                if (!this.service[methodName]) {
                    throw new Error(`Method ${methodName} not found on service`)
                }

                const result = await this.service[methodName](payload)

                return {
                    statusCode: 200,
                    body: JSON.stringify(result),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            } catch (error) {
                console.error(`Lambda direct handler error [${methodName}]:`, error)
                return {
                    statusCode: 500,
                    body: JSON.stringify({
                        error: error.message,
                        stack: this.isDevelopment() ? error.stack : undefined
                    }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            }
        }
    }

    /**
     * Universal Lambda handler
     */
    createHandler(options = {}) {
        const { type = 'graphql', method } = options

        if (type === 'graphql') {
            const { resolvers, typeDefs, contextBuilder } = this.config
            return this.createGraphQLHandler(resolvers, typeDefs, contextBuilder)
        } else if (type === 'direct' && method) {
            return this.createDirectHandler(method)
        } else {
            throw new Error(`Unknown handler type: ${type}`)
        }
    }

    /**
     * Parse AWS Lambda event to standard HTTP request
     */
    parseEventToRequest(event) {
        // Handle API Gateway v2 format
        if (event.version === '2.0' || event.requestContext?.http) {
            const { rawPath, rawQueryString, headers, body, requestContext } = event
            
            return new Request(
                `https://${headers.host || 'lambda'}${rawPath}${rawQueryString ? `?${rawQueryString}` : ''}`,
                {
                    method: requestContext.http.method,
                    headers,
                    body: body ? (event.isBase64Encoded ? Buffer.from(body, 'base64') : body) : undefined
                }
            )
        }

        // Handle API Gateway v1 format
        if (event.httpMethod) {
            const { path, queryStringParameters, headers, body, httpMethod } = event
            
            const queryString = queryStringParameters 
                ? '?' + new URLSearchParams(queryStringParameters).toString()
                : ''

            return new Request(
                `https://${headers.Host || 'lambda'}${path}${queryString}`,
                {
                    method: httpMethod,
                    headers,
                    body: body ? (event.isBase64Encoded ? Buffer.from(body, 'base64') : body) : undefined
                }
            )
        }

        // Handle direct invocation
        return new Request('https://lambda/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event)
        })
    }

    /**
     * Convert standard Response to Lambda response format
     */
    async convertResponseToLambda(response) {
        const headers = {}
        response.headers.forEach((value, key) => {
            headers[key] = value
        })

        const body = await response.text()

        return {
            statusCode: response.status,
            headers,
            body
        }
    }
}

export default LambdaRuntime
