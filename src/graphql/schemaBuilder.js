import { join } from 'path'
import { getDir, getFileContent } from './utils'

/**
 * @param {string} dirname 
 * @param {Record<string, string} services 
 * @returns {string} Collected Type Defs Schema
 */
export const typeDefsBuilder = async (dirname, services) => {
    let schema = ''

    console.log('📝 ', "\x1b[44m", 'BUILDING ', "\x1b[0m", 'Start building schema')

    for (const serviceName in services) {
        const initialPath = join(dirname, `../../${serviceName}/typeDefs`)
        const typeDefFiles = await getDir(initialPath, ['🆘 ', "\x1b[37m\x1b[41m", 'ERROR ', "\x1b[0m", 'Cannot read typeDefs directory'])

        for (const typeDefsFile of typeDefFiles.filter(fileName => fileName.includes('.gql'))) {
            /** @type {String} */
            const typeDefs = await getFileContent(
                `${initialPath}/${typeDefsFile}`, 
                ['🆘 ', "\x1b[37m\x1b[41m", 'ERROR ', "\x1b[0m", `Cannot read ${serviceName} ${typeDefsFile} type definitions`],
            )

            schema += typeDefs + '\n'
        }

        console.log("\x1b[32m", serviceName, "\x1b[0m", 'Schema has been succefully built', '✔️')

    }

    return schema
}

export default typeDefsBuilder
