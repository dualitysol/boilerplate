import { join } from 'path'
import { getDir } from './utils'

const resolvers = { Query: {}, Mutation: {}, Subscription: {} }

/**
 * @param {string} dirname 
 * @param {Record<string, string} services 
 * @returns {string} Collected Services resolvers
 */
export const resolversBuilder = async (dirname, services) => {
    console.log('🛠️ ', "\x1b[44m", 'BUILDING ', "\x1b[0m", 'Started building resolvers')

    for (const serviceName in services) {
        const initialPath = join(dirname, `../../${serviceName}/resolvers`)
        const resolversTypes = await getDir(initialPath, ['🆘 ', "\x1b[37m\x1b[41m", 'ERROR ', "\x1b[0m", 'Cannot read resolvers directory']);

        for (const resolversType of resolversTypes) {
            const resolversFiles = await getDir(`${initialPath}/${resolversType}`, ['🆘 ', "\x1b[37m\x1b[41m", 'ERROR ', "\x1b[0m", `Cannot read ${serviceName} ${resolversType} resolvers files`]);

            for (const resolversFileName of resolversFiles) {
                const serviceResolvers = require(`${initialPath}/${resolversType}/${resolversFileName}`).default
                
                Object.assign(resolvers.Query, serviceResolvers.Query)
                Object.assign(resolvers.Mutation, serviceResolvers.Mutation)
                Object.assign(resolvers.Subscription, serviceResolvers.Subscription)
            }
        }

        console.log("\x1b[32m", serviceName, "\x1b[0m", 'Resolvers have been succefully built', '✔️')

    }

    return resolvers
}

export default resolversBuilder
