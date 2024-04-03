import { PubSub } from 'graphql-subscriptions'
import { EventEmitter as DefaultEmitter } from 'node:events'

class EventEmitter extends DefaultEmitter {
    /**
     * @param {string} name
     * @param {EventEmitterOptions | undefined} options 
     */
    constructor(name = `${Math.random()}`, options) {
        super(options)
        this.name = name

        this.on('error', (...args) => console.log(
            '\x1b[31m',
            'EventEmitter',
            this.name,
            'Error:',
            '\x1b[0m',
            ...args,
        ))

    }
}

export const eventEmitter = new EventEmitter()

export const pubsub = new PubSub({ eventEmitter })

export default eventEmitter