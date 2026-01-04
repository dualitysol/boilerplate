import { createSchema, createYoga } from 'graphql-yoga'
import { createServer, typeDefsBuilder, resolversBuilder, createContextBuilder } from './graphql'
import { Storage } from './storage';
import { eventEmitter as events } from './events'



/** @type {import('./index').ServerConfig} */
const defaultConfig = {
    host: 'localhost',
    port: 3000,
    mongodb: {
        url: 'mongodb://localhost:27017',
        dbName: 'slon',
    },
}

export class Server {
    /** @type {string} */
    #host
    /** @type {number} */
    #port

    #server

    /**
     * 
     * @param {import('./index').ServerConfig} config
     * @param {string} path 
     * @param {import('./index').ServicesOptions} services 
     */
    constructor(config = defaultConfig, path = __dirname, services = {}) {
        const typeDefs = typeDefsBuilder(path, services)
        const resolvers = resolversBuilder(path, services)
        const contextBuilder = createContextBuilder(path, services)
        const storage = new Storage(config)
        const context = contextBuilder({ storage, events })

        this.#host = config.host
        this.#port = config.port
        this.#server = createServer(
            createYoga({
                schema: createSchema({ resolvers, typeDefs }),
                context: (requestContext) => {
                    const ctx = { ...requestContext, ...context }
    
                    return ctx
                },
            })
        )
    }

    listen(callback = () => console.log(`🚀 Server is running on port ${this.#port}`)) {
        this.#server.listen(this.#port, callback)
    }
}

export default Server