export class Microservice {
    /** @type { String } */
    name;
    context;
    /** @type {{ [K: string]: typeof Microservice }} */
    services;
    /** @type { import('./storage').Storage } */
    storage;
    /** @type { import('graphql-subscriptions').PubSub } */
    events;
    /**
     * @type { import('./storage/databases/mongo').Collection }
     */
    model;

    constructor({ name, context, services, events, storage }) {
        this.name = name
        this.context = context
        this.services = services
        this.events = events
        this.storage = storage
    }
}

export default Microservice