import { join } from 'path'
import axios from 'axios'



/**
 * 
 * @param {string} path 
 * @param {import('../index').ServicesOptions} servicesOptions 
 * @returns { (options: any) => import('../index').Context }
 */
export const createContextBuilder = (path = __dirname, servicesOptions = {}) => (options = {}) => {
    const context = {
        ...options,
        account: {},
        models: {},
    }

    const services = {}

    Object.keys(servicesOptions)
        .forEach((modelName) => {
            const Microservice = require(join(path, `../../${modelName}/model`)).default

            if (servicesOptions[modelName].local) {
                services[modelName] = new Microservice({
                    ...options,
                    context,
                    name: modelName,
                })
            } else {
                const serviceContext = {
                    queryMutations: require(join(path, `../../${modelName}/qm`)),
                    headers: { 'Content-Type': 'application/json' },
                }

                services[modelName] = new Proxy(serviceContext, {
                    get(ctx, methodName) {
                        axios.post(servicesOptions[modelName].connectionString, {
                            query: ctx.queryMutations[methodName],
                            variables: { ...arguments[0] },
                        }, ctx.headers)
                            .then(({ data }) => data)
                            .catch(err => console.log(`Remote service call ${modelName}.${methodName} error:`, err))
                    },

                    set(ctx, prop, providedContext) {
                        if (prop === 'context') {
                            ctx.headers = { ...ctx.headers, ...providedContext }
                        } else throw new Error('Remote service mutation denied!')
                    }
                })
            }

            services[modelName] = servicesOptions[modelName].local ? new Microservice({
                ...options,
                context,
                name: modelName,
            }) : new Proxy({}, {
                get(_, methodName) {
                    const headers = { 'Content-Type': 'application/json' }
                    axios.post(servicesOptions[modelName].connectionString, {
                        query: require(join(path, `../../${modelName}/qm`))[methodName],
                        variables: { ...arguments[0] },
                    }, headers) 
                }
            })
        })

    Object.assign(context.models, services)
    for (const service in services) {
        services[service].context = context
        services[service].services = services
    }
    // Object.assign(context.models, services.map(service => {
    //     service.context.
    // }))
    context.services = services

    return context
}

export default createContextBuilder
