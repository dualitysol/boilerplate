import { BaseTransport } from './index'

export class GRPCTransport extends BaseTransport {
    constructor(config = {}) {
        super(config)
        this.clients = new Map()
        this.servers = new Map()
        this.protoDefinitions = new Map()
    }

    async connect() {
        try {
            // Lazy load grpc
            this.grpc = await import('@grpc/grpc-js')
            this.protoLoader = await import('@grpc/proto-loader')
            
            this.connected = true
            console.log(`✅ gRPC initialized`)
            return this
        } catch (error) {
            console.error('gRPC initialization error:', error)
            throw error
        }
    }

    async disconnect() {
        // Close all client connections
        for (const [name, client] of this.clients.entries()) {
            client.close()
        }
        this.clients.clear()

        // Shutdown all servers
        for (const [name, server] of this.servers.entries()) {
            await new Promise((resolve) => {
                server.tryShutdown(resolve)
            })
        }
        this.servers.clear()

        this.connected = false
        return this
    }

    /**
     * Load proto definition file
     */
    async loadProto(protoPath, options = {}) {
        if (!this.connected) {
            throw new Error('gRPC not initialized')
        }

        const packageDefinition = await this.protoLoader.load(protoPath, {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
            ...options
        })

        const protoDescriptor = this.grpc.loadPackageDefinition(packageDefinition)
        this.protoDefinitions.set(protoPath, protoDescriptor)
        
        return protoDescriptor
    }

    /**
     * Create gRPC client
     */
    async createClient(serviceName, address, protoPath, packageName) {
        if (!this.connected) {
            throw new Error('gRPC not initialized')
        }

        if (this.clients.has(serviceName)) {
            return this.clients.get(serviceName)
        }

        let proto = this.protoDefinitions.get(protoPath)
        if (!proto) {
            proto = await this.loadProto(protoPath)
        }

        // Navigate to service definition
        const serviceDefinition = packageName
            ? packageName.split('.').reduce((obj, key) => obj[key], proto)
            : proto

        const ServiceClient = serviceDefinition[serviceName]
        
        if (!ServiceClient) {
            throw new Error(`Service ${serviceName} not found in proto definition`)
        }

        const client = new ServiceClient(
            address,
            this.grpc.credentials.createInsecure(), // Use SSL in production
            this.config.clientOptions
        )

        this.clients.set(serviceName, client)
        return client
    }

    /**
     * Make unary gRPC call
     */
    async request(serviceName, method, data, options = {}) {
        const { address, protoPath, packageName } = options
        
        const client = await this.createClient(
            serviceName,
            address || this.config.url,
            protoPath || this.config.protoPath,
            packageName || this.config.packageName
        )

        return new Promise((resolve, reject) => {
            client[method](data, (error, response) => {
                if (error) {
                    console.error(`gRPC request error [${serviceName}.${method}]:`, error)
                    reject(error)
                } else {
                    resolve(response)
                }
            })
        })
    }

    /**
     * Server streaming call
     */
    async requestStream(serviceName, method, data, handler, options = {}) {
        const { address, protoPath, packageName } = options
        
        const client = await this.createClient(
            serviceName,
            address || this.config.url,
            protoPath || this.config.protoPath,
            packageName || this.config.packageName
        )

        const call = client[method](data)

        call.on('data', (response) => {
            handler(response)
        })

        call.on('error', (error) => {
            console.error(`gRPC stream error [${serviceName}.${method}]:`, error)
        })

        call.on('end', () => {
            console.log(`gRPC stream ended [${serviceName}.${method}]`)
        })

        return () => call.cancel()
    }

    /**
     * Create gRPC server
     */
    async createServer(protoPath, packageName, serviceName, implementation, address) {
        if (!this.connected) {
            throw new Error('gRPC not initialized')
        }

        const serverName = `${serviceName}_${address}`
        
        if (this.servers.has(serverName)) {
            return this.servers.get(serverName)
        }

        let proto = this.protoDefinitions.get(protoPath)
        if (!proto) {
            proto = await this.loadProto(protoPath)
        }

        const serviceDefinition = packageName
            ? packageName.split('.').reduce((obj, key) => obj[key], proto)
            : proto

        const server = new this.grpc.Server(this.config.serverOptions)

        server.addService(
            serviceDefinition[serviceName].service,
            implementation
        )

        await new Promise((resolve, reject) => {
            server.bindAsync(
                address,
                this.grpc.ServerCredentials.createInsecure(), // Use SSL in production
                (error, port) => {
                    if (error) {
                        reject(error)
                    } else {
                        server.start()
                        console.log(`✅ gRPC server started on ${address}`)
                        resolve(port)
                    }
                }
            )
        })

        this.servers.set(serverName, server)
        return server
    }

    async send(target, data, options = {}) {
        // For compatibility with base transport interface
        const { method = 'Call', ...requestOptions } = options
        return this.request(target, method, data, requestOptions)
    }

    async subscribe(serviceName, method, handler, options = {}) {
        // For compatibility - treating as server streaming
        return this.requestStream(serviceName, method, {}, handler, options)
    }

    async publish(serviceName, data, options = {}) {
        // For compatibility - treating as unary call
        return this.send(serviceName, data, options)
    }
}

export default GRPCTransport
