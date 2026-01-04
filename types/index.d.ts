/**
 * @dualitysol/boilerplate type definitions
 * Main entry point for TypeScript types
 */

// Core framework types
export { Microservice, MicroserviceOptions, ServiceRegistry } from './Microservice'
export { Storage, Collection } from './Storage'
export { EventBus, EventHandler, EventBusOptions } from './EventBus'
export { QueueManager, QueueOptions, MessageHandler } from './Queue'
export { Logger, LogLevel, LoggerOptions } from './Logger'
export { BaseTransport, TransportOptions } from './Transport'
export { BaseRuntime, RuntimeOptions } from './Runtime'
export { Bootstrap, BootstrapOptions } from './Bootstrap'

// Configuration types
export * from './config'

// Service types
export * from './service'

// GraphQL types
export * from './graphql'

// Infrastructure types
export * from './infrastructure'

// Re-export decorators for TypeScript projects
export * from './decorators'
