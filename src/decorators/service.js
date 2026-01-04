/**
 * Service Registration Decorators
 * 
 * NestJS-style decorators for service metadata and auto-registration:
 * - @Service() - Mark class as a service with metadata
 * - @GraphQLResolver() - Mark service as GraphQL resolver provider
 * - @EventHandler() - Auto-subscribe to events
 * - @QueueProcessor() - Auto-register queue processors
 * - @Scheduled() - Auto-register scheduled tasks
 */

import 'reflect-metadata';

/**
 * Metadata keys
 */
export const METADATA_KEYS = {
  SERVICE: 'boilerplate:service',
  GRAPHQL_RESOLVER: 'boilerplate:graphql:resolver',
  EVENT_HANDLERS: 'boilerplate:event:handlers',
  QUEUE_PROCESSORS: 'boilerplate:queue:processors',
  SCHEDULED_TASKS: 'boilerplate:scheduled:tasks',
  SUBSCRIPTIONS: 'boilerplate:graphql:subscriptions',
  MUTATIONS: 'boilerplate:graphql:mutations',
  QUERIES: 'boilerplate:graphql:queries'
};

/**
 * Service Registry - stores all decorated services
 */
const serviceRegistry = new Map();

/**
 * @Service decorator
 * 
 * Marks a class as a service and stores metadata
 * 
 * @param {Object} options - Service options
 * @param {string} options.name - Service name (defaults to class name)
 * @param {string} options.version - Service version
 * @param {string} options.description - Service description
 * @param {string[]} options.dependencies - Service dependencies
 * @param {boolean} options.singleton - Is singleton (default: true)
 * 
 * @example
 * @Service({
 *   name: 'UserService',
 *   version: '1.0.0',
 *   description: 'User management service',
 *   dependencies: ['NotificationService']
 * })
 * export class UserService extends Microservice {
 *   // ...
 * }
 */
export function Service(options = {}) {
  return function (target) {
    const metadata = {
      name: options.name || target.name,
      version: options.version || '1.0.0',
      description: options.description || '',
      dependencies: options.dependencies || [],
      singleton: options.singleton !== false,
      class: target
    };
    
    // Store metadata
    Reflect.defineMetadata(METADATA_KEYS.SERVICE, metadata, target);
    
    // Register in global registry
    serviceRegistry.set(metadata.name, metadata);
    
    return target;
  };
}

/**
 * @GraphQLResolver decorator
 * 
 * Marks service as GraphQL resolver provider
 * 
 * @param {Object} options - Resolver options
 * @param {string} options.typeName - GraphQL type name
 * @param {boolean} options.autoRegister - Auto-register resolvers (default: true)
 * 
 * @example
 * @GraphQLResolver({ typeName: 'User' })
 * export class UserService extends Microservice {
 *   @Query('getUser')
 *   async getUser(id) { }
 *   
 *   @Mutation('createUser')
 *   async createUser(input) { }
 * }
 */
export function GraphQLResolver(options = {}) {
  return function (target) {
    const metadata = {
      typeName: options.typeName || '',
      autoRegister: options.autoRegister !== false
    };
    
    Reflect.defineMetadata(METADATA_KEYS.GRAPHQL_RESOLVER, metadata, target);
    
    return target;
  };
}

/**
 * @EventHandler decorator
 * 
 * Auto-subscribe to events on service initialization
 * 
 * @param {string|string[]} events - Event names or patterns
 * @param {Object} options - Handler options
 * 
 * @example
 * @EventHandler(['user.*', 'order.created'])
 * export class NotificationService extends Microservice {
 *   @Subscribe('user.created')
 *   async onUserCreated(data) { }
 * }
 */
export function EventHandler(events, options = {}) {
  return function (target) {
    const metadata = {
      events: Array.isArray(events) ? events : [events],
      options
    };
    
    Reflect.defineMetadata(METADATA_KEYS.EVENT_HANDLERS, metadata, target);
    
    return target;
  };
}

/**
 * @Subscribe decorator
 * 
 * Mark method as event subscriber
 * 
 * @param {string} eventName - Event name or pattern
 * @param {Object} options - Subscription options
 * 
 * @example
 * @Subscribe('user.created')
 * async onUserCreated(data) {
 *   await this.sendWelcomeEmail(data);
 * }
 */
export function Subscribe(eventName, options = {}) {
  return function (target, propertyKey, descriptor) {
    const handlers = Reflect.getMetadata(METADATA_KEYS.EVENT_HANDLERS, target.constructor) || {};
    
    if (!handlers[eventName]) {
      handlers[eventName] = [];
    }
    
    handlers[eventName].push({
      method: propertyKey,
      options
    });
    
    Reflect.defineMetadata(METADATA_KEYS.EVENT_HANDLERS, handlers, target.constructor);
    
    return descriptor;
  };
}

/**
 * @QueueProcessor decorator
 * 
 * Auto-register queue processor
 * 
 * @param {string} queueName - Queue name
 * @param {Object} options - Processor options
 * 
 * @example
 * @QueueProcessor('email-queue', { concurrency: 5 })
 * export class EmailService extends Microservice {
 *   @ProcessJob('send-email')
 *   async sendEmail(job) { }
 * }
 */
export function QueueProcessor(queueName, options = {}) {
  return function (target) {
    const metadata = {
      queueName,
      options
    };
    
    Reflect.defineMetadata(METADATA_KEYS.QUEUE_PROCESSORS, metadata, target);
    
    return target;
  };
}

/**
 * @ProcessJob decorator
 * 
 * Mark method as queue job processor
 * 
 * @param {string} jobName - Job name
 * @param {Object} options - Job options
 * 
 * @example
 * @ProcessJob('send-email', { priority: 10 })
 * async sendEmail(job) {
 *   await this.mailer.send(job.data);
 * }
 */
export function ProcessJob(jobName, options = {}) {
  return function (target, propertyKey, descriptor) {
    const processors = Reflect.getMetadata(METADATA_KEYS.QUEUE_PROCESSORS, target.constructor) || {};
    
    if (!processors.jobs) {
      processors.jobs = [];
    }
    
    processors.jobs.push({
      name: jobName,
      method: propertyKey,
      options
    });
    
    Reflect.defineMetadata(METADATA_KEYS.QUEUE_PROCESSORS, processors, target.constructor);
    
    return descriptor;
  };
}

/**
 * @Scheduled decorator
 * 
 * Schedule method execution with cron or interval
 * 
 * @param {string|Object} schedule - Cron expression or options
 * 
 * @example
 * @Scheduled('0 0 * * *')  // Every day at midnight
 * async cleanupOldData() { }
 * 
 * @Scheduled({ interval: '5m', immediate: true })
 * async syncData() { }
 */
export function Scheduled(schedule) {
  return function (target, propertyKey, descriptor) {
    const tasks = Reflect.getMetadata(METADATA_KEYS.SCHEDULED_TASKS, target.constructor) || [];
    
    const taskConfig = typeof schedule === 'string'
      ? { cron: schedule }
      : schedule;
    
    tasks.push({
      method: propertyKey,
      schedule: taskConfig
    });
    
    Reflect.defineMetadata(METADATA_KEYS.SCHEDULED_TASKS, tasks, target.constructor);
    
    return descriptor;
  };
}

/**
 * @Query decorator
 * 
 * Mark method as GraphQL query resolver
 * 
 * @param {string} queryName - Query name
 * @param {Object} options - Query options
 * 
 * @example
 * @Query('getUser')
 * @RequireAuth()
 * async getUser(id) {
 *   return await this.findOne({ _id: id });
 * }
 */
export function Query(queryName, options = {}) {
  return function (target, propertyKey, descriptor) {
    const queries = Reflect.getMetadata(METADATA_KEYS.QUERIES, target.constructor) || {};
    
    queries[queryName] = {
      method: propertyKey,
      options
    };
    
    Reflect.defineMetadata(METADATA_KEYS.QUERIES, queries, target.constructor);
    
    return descriptor;
  };
}

/**
 * @Mutation decorator
 * 
 * Mark method as GraphQL mutation resolver
 * 
 * @param {string} mutationName - Mutation name
 * @param {Object} options - Mutation options
 * 
 * @example
 * @Mutation('createUser')
 * @ValidateInput('CreateUserInput')
 * async createUser(input) {
 *   return await this.createOne(input);
 * }
 */
export function Mutation(mutationName, options = {}) {
  return function (target, propertyKey, descriptor) {
    const mutations = Reflect.getMetadata(METADATA_KEYS.MUTATIONS, target.constructor) || {};
    
    mutations[mutationName] = {
      method: propertyKey,
      options
    };
    
    Reflect.defineMetadata(METADATA_KEYS.MUTATIONS, mutations, target.constructor);
    
    return descriptor;
  };
}

/**
 * @Subscription decorator
 * 
 * Mark method as GraphQL subscription resolver
 * 
 * @param {string} subscriptionName - Subscription name
 * @param {Object} options - Subscription options
 * 
 * @example
 * @Subscription('userUpdated')
 * async* onUserUpdated(userId) {
 *   for await (const update of this.subscribe(`user:${userId}`)) {
 *     yield update;
 *   }
 * }
 */
export function Subscription(subscriptionName, options = {}) {
  return function (target, propertyKey, descriptor) {
    const subscriptions = Reflect.getMetadata(METADATA_KEYS.SUBSCRIPTIONS, target.constructor) || {};
    
    subscriptions[subscriptionName] = {
      method: propertyKey,
      options
    };
    
    Reflect.defineMetadata(METADATA_KEYS.SUBSCRIPTIONS, subscriptions, target.constructor);
    
    return descriptor;
  };
}

/**
 * Get service metadata
 */
export function getServiceMetadata(target) {
  return Reflect.getMetadata(METADATA_KEYS.SERVICE, target);
}

/**
 * Get GraphQL resolver metadata
 */
export function getGraphQLResolverMetadata(target) {
  return Reflect.getMetadata(METADATA_KEYS.GRAPHQL_RESOLVER, target);
}

/**
 * Get event handlers metadata
 */
export function getEventHandlersMetadata(target) {
  return Reflect.getMetadata(METADATA_KEYS.EVENT_HANDLERS, target);
}

/**
 * Get queue processors metadata
 */
export function getQueueProcessorsMetadata(target) {
  return Reflect.getMetadata(METADATA_KEYS.QUEUE_PROCESSORS, target);
}

/**
 * Get scheduled tasks metadata
 */
export function getScheduledTasksMetadata(target) {
  return Reflect.getMetadata(METADATA_KEYS.SCHEDULED_TASKS, target);
}

/**
 * Get GraphQL queries metadata
 */
export function getQueriesMetadata(target) {
  return Reflect.getMetadata(METADATA_KEYS.QUERIES, target);
}

/**
 * Get GraphQL mutations metadata
 */
export function getMutationsMetadata(target) {
  return Reflect.getMetadata(METADATA_KEYS.MUTATIONS, target);
}

/**
 * Get GraphQL subscriptions metadata
 */
export function getSubscriptionsMetadata(target) {
  return Reflect.getMetadata(METADATA_KEYS.SUBSCRIPTIONS, target);
}

/**
 * Get all registered services
 */
export function getRegisteredServices() {
  return Array.from(serviceRegistry.values());
}

/**
 * Get service by name
 */
export function getRegisteredService(name) {
  return serviceRegistry.get(name);
}

export default {
  Service,
  GraphQLResolver,
  EventHandler,
  Subscribe,
  QueueProcessor,
  ProcessJob,
  Scheduled,
  Query,
  Mutation,
  Subscription,
  getServiceMetadata,
  getGraphQLResolverMetadata,
  getEventHandlersMetadata,
  getQueueProcessorsMetadata,
  getScheduledTasksMetadata,
  getQueriesMetadata,
  getMutationsMetadata,
  getSubscriptionsMetadata,
  getRegisteredServices,
  getRegisteredService
};
