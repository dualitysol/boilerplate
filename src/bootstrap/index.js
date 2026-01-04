/**
 * Universal Bootstrap
 * 
 * Single entry point for all project types (monolith, microservices, serverless).
 * Reads boilerplate.config.js and automatically configures all dependencies.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class Bootstrap {
  constructor(config = {}) {
    this.config = config;
    this.services = new Map();
    this.dependencies = {};
    this.logger = console;
  }

  /**
   * Load configuration from file
   */
  static async loadConfig(configPath = './boilerplate.config.js') {
    try {
      const fullPath = join(process.cwd(), configPath);
      const configModule = await import(pathToFileURL(fullPath).href);
      return configModule.default;
    } catch (error) {
      console.warn(`⚠️  Config file not found: ${configPath}, using defaults`);
      return {};
    }
  }

  /**
   * Initialize EventBus based on configuration
   */
  async initializeEventBus() {
    const { eventBus: config } = this.config;
    const backend = config?.backend || 'local';

    this.logger.info(`🔌 Initializing EventBus [${backend}]...`);

    let EventBusClass;
    
    switch (backend) {
      case 'local':
        const { default: LocalEventBus } = await import('./events/EventBus.js');
        EventBusClass = LocalEventBus;
        break;
      
      case 'nats':
        const { NATSEventBus } = await import('./events/NATSEventBus.js');
        EventBusClass = NATSEventBus;
        break;
      
      case 'redis':
        const { RedisEventBus } = await import('./events/RedisEventBus.js');
        EventBusClass = RedisEventBus;
        break;
      
      default:
        throw new Error(`Unknown EventBus backend: ${backend}`);
    }

    this.dependencies.eventBus = new EventBusClass(config[backend] || {});
    await this.dependencies.eventBus.connect();
    
    this.logger.info(`✅ EventBus initialized`);
    return this.dependencies.eventBus;
  }

  /**
   * Initialize QueueManager based on configuration
   */
  async initializeQueue() {
    const { queue: config, eventBus: eventBusConfig } = this.config;
    const backend = config?.backend || 'local';

    this.logger.info(`📨 Initializing Queue [${backend}]...`);

    let QueueClass;
    
    switch (backend) {
      case 'local':
        const { default: LocalQueue } = await import('./queue/index.js');
        QueueClass = LocalQueue;
        break;
      
      case 'redis':
        const { RedisQueue } = await import('./queue/RedisQueue.js');
        QueueClass = RedisQueue;
        break;
      
      case 'rabbitmq':
        const { RabbitMQQueue } = await import('./queue/RabbitMQQueue.js');
        QueueClass = RabbitMQQueue;
        break;
      
      default:
        throw new Error(`Unknown Queue backend: ${backend}`);
    }

    this.dependencies.queueManager = new QueueClass({
      eventBus: this.dependencies.eventBus,
      ...config[backend]
    });
    
    this.logger.info(`✅ Queue initialized`);
    return this.dependencies.queueManager;
  }

  /**
   * Initialize Database based on configuration
   */
  async initializeDatabase() {
    const { databases } = this.config;
    const primaryConfig = databases?.primary;
    
    if (!primaryConfig) {
      this.logger.warn('⚠️  No database configuration found, skipping...');
      return null;
    }

    const type = primaryConfig.type || 'memory';
    this.logger.info(`💾 Initializing Database [${type}]...`);

    let StorageClass;
    
    switch (type) {
      case 'memory':
        const { InMemoryStorage } = await import('./storage/InMemoryStorage.js');
        StorageClass = InMemoryStorage;
        break;
      
      case 'postgres':
        const { PostgreSQL } = await import('./storage/databases/postgres.js');
        StorageClass = PostgreSQL;
        break;
      
      case 'mongodb':
        const { MongoDB } = await import('./storage/databases/mongodb.js');
        StorageClass = MongoDB;
        break;
      
      default:
        throw new Error(`Unknown database type: ${type}`);
    }

    this.dependencies.storage = new StorageClass(primaryConfig[type] || {});
    await this.dependencies.storage.connect();
    
    this.logger.info(`✅ Database initialized`);
    return this.dependencies.storage;
  }

  /**
   * Initialize Cache based on configuration
   */
  async initializeCache() {
    const { databases } = this.config;
    const cacheConfig = databases?.cache;
    
    if (!cacheConfig) {
      this.logger.info('⚠️  No cache configuration found, skipping...');
      return null;
    }

    const type = cacheConfig.type;
    this.logger.info(`⚡ Initializing Cache [${type}]...`);

    // Implement cache initialization
    // this.dependencies.cache = new CacheClass(cacheConfig[type]);
    
    this.logger.info(`✅ Cache initialized`);
    return this.dependencies.cache;
  }

  /**
   * Automatic service discovery in /services folder
   */
  async discoverServices(servicesPath = './services') {
    const fullPath = join(process.cwd(), servicesPath);
    
    try {
      const entries = readdirSync(fullPath);
      const services = [];

      for (const entry of entries) {
        const entryPath = join(fullPath, entry);
        const stat = statSync(entryPath);
        
        if (stat.isDirectory()) {
          // Check for index.js or index.ts
          const indexPath = join(entryPath, 'index.js');
          const tsIndexPath = join(entryPath, 'index.ts');
          
          try {
            statSync(indexPath);
            services.push({ name: entry, path: entryPath, type: 'js' });
          } catch {
            try {
              statSync(tsIndexPath);
              services.push({ name: entry, path: entryPath, type: 'ts' });
            } catch {
              // Check for test-ts-project structure
              const modelPath = join(entryPath, 'model', 'index.ts');
              try {
                statSync(modelPath);
                services.push({ name: entry, path: entryPath, type: 'structured' });
              } catch {
                this.logger.warn(`⚠️  Skipping ${entry}: no valid entry point found`);
              }
            }
          }
        }
      }

      return services;
    } catch (error) {
      this.logger.warn(`⚠️  Services directory not found: ${servicesPath}`);
      return [];
    }
  }

  /**
   * Load and initialize service
   */
  async loadService(serviceInfo) {
    this.logger.info(`📦 Loading service: ${serviceInfo.name}...`);

    let ServiceClass;
    
    if (serviceInfo.type === 'structured') {
      // For test-ts-project structure, create a wrapper
      const modelPath = join(serviceInfo.path, 'model', 'index.ts');
      const resolversPath = join(serviceInfo.path, 'resolvers', 'index.ts');
      
      // Dynamically create service wrapper
      ServiceClass = await this.createStructuredService(serviceInfo);
    } else {
      // For regular structure, just import
      const servicePath = join(serviceInfo.path, `index.${serviceInfo.type === 'ts' ? 'ts' : 'js'}`);
      const serviceModule = await import(pathToFileURL(servicePath).href);
      ServiceClass = serviceModule.default || serviceModule[serviceInfo.name];
    }

    if (!ServiceClass) {
      throw new Error(`Service class not found for: ${serviceInfo.name}`);
    }

    // Create service instance with dependencies
    const service = new ServiceClass({
      name: serviceInfo.name,
      ...this.dependencies
    });

    // Initialize service
    if (service.initialize) {
      await service.initialize();
    }

    this.services.set(serviceInfo.name, service);
    this.logger.info(`✅ Service loaded: ${serviceInfo.name}`);
    
    return service;
  }

  /**
   * Create service wrapper for structured format (test-ts-project)
   */
  async createStructuredService(serviceInfo) {
    const modelPath = join(serviceInfo.path, 'model', 'index.ts');
    const resolversPath = join(serviceInfo.path, 'resolvers', 'index.ts');
    const queryMutationPath = join(serviceInfo.path, 'queryMutation', 'index.ts');
    
    // Import modules
    const model = await import(pathToFileURL(modelPath).href);
    const resolvers = await import(pathToFileURL(resolversPath).href);
    
    // Create wrapper class
    return class StructuredService {
      constructor(deps) {
        this.name = serviceInfo.name;
        this.model = model;
        this.resolvers = resolvers;
        Object.assign(this, deps);
      }

      async initialize() {
        // Service initialization
        if (this.model.initialize) {
          await this.model.initialize(this);
        }
      }

      getResolvers() {
        return this.resolvers.default || this.resolvers;
      }

      getTypeDefs() {
        const typeDefsPath = join(serviceInfo.path, 'typeDefinitions', 'index.gql');
        return readFileSync(typeDefsPath, 'utf-8');
      }
    };
  }

  /**
   * Initialize Transport based on configuration
   */
  async initializeTransport() {
    const { transport: config, graphql } = this.config;
    const type = config?.type || 'http';

    this.logger.info(`🚀 Initializing Transport [${type}]...`);

    let transport;

    switch (type) {
      case 'http':
        const { HTTPTransport } = await import('./transport/http.js');
        transport = new HTTPTransport({
          port: config.http?.port || 4000,
          eventBus: this.dependencies.eventBus
        });
        break;
      
      case 'websocket':
        const { WebSocketTransport } = await import('./transport/websocket.js');
        transport = new WebSocketTransport({
          port: config.websocket?.port || 4001,
          eventBus: this.dependencies.eventBus
        });
        break;
      
      case 'lambda':
        const { LambdaTransport } = await import('./transport/lambda.js');
        transport = new LambdaTransport({
          eventBus: this.dependencies.eventBus
        });
        break;
      
      default:
        throw new Error(`Unknown transport type: ${type}`);
    }

    this.dependencies.transport = transport;
    this.logger.info(`✅ Transport initialized`);
    
    return transport;
  }

  /**
   * Setup GraphQL
   */
  async setupGraphQL() {
    const { graphql } = this.config;
    
    if (!graphql?.enabled) {
      this.logger.info('⚠️  GraphQL disabled, skipping...');
      return null;
    }

    this.logger.info('📊 Setting up GraphQL...');

    // Collect types and resolvers from all services
    const typeDefs = [];
    const resolvers = {};

    for (const [name, service] of this.services) {
      if (service.getTypeDefs) {
        typeDefs.push(service.getTypeDefs());
      }
      
      if (service.getResolvers) {
        const serviceResolvers = service.getResolvers();
        Object.assign(resolvers, serviceResolvers);
      }
    }

    this.dependencies.graphql = {
      typeDefs,
      resolvers
    };

    this.logger.info(`✅ GraphQL configured with ${this.services.size} services`);
    return this.dependencies.graphql;
  }

  /**
   * Main application startup method
   */
  async start() {
    this.logger.info('🚀 Starting Application Bootstrap...\n');

    try {
      // 1. Initialize infrastructure
      await this.initializeEventBus();
      await this.initializeQueue();
      await this.initializeDatabase();
      await this.initializeCache();

      this.logger.info('');

      // 2. Discover and load services
      const { services: servicesConfig } = this.config;
      let servicesList = servicesConfig?.list || [];

      if (servicesConfig?.autoDiscover) {
        const discovered = await this.discoverServices();
        servicesList = [...servicesList, ...discovered];
      }

      for (const serviceInfo of servicesList) {
        await this.loadService(serviceInfo);
      }

      this.logger.info('');

      // 3. Setup GraphQL
      await this.setupGraphQL();

      // 4. Initialize Transport
      await this.initializeTransport();

      // 5. Start Transport
      if (this.dependencies.transport?.connect) {
        await this.dependencies.transport.connect();
      }

      this.logger.info('\n✅ Application started successfully!\n');

      return this;
    } catch (error) {
      this.logger.error('❌ Failed to start application:', error);
      throw error;
    }
  }

  /**
   * Graceful shutdown
   */
  async stop() {
    this.logger.info('\n🛑 Shutting down gracefully...');

    // Stop Transport
    if (this.dependencies.transport?.disconnect) {
      await this.dependencies.transport.disconnect();
    }

    // Stop services
    for (const [name, service] of this.services) {
      if (service.stop) {
        await service.stop();
      }
    }

    // Close infrastructure
    if (this.dependencies.queueManager?.close) {
      await this.dependencies.queueManager.close();
    }

    if (this.dependencies.eventBus?.close) {
      await this.dependencies.eventBus.close();
    }

    if (this.dependencies.storage?.disconnect) {
      await this.dependencies.storage.disconnect();
    }

    this.logger.info('✅ Shutdown complete');
  }
}

/**
 * Factory method for quick start
 */
export async function bootstrap(configPath) {
  const config = await Bootstrap.loadConfig(configPath);
  const app = new Bootstrap(config);
  
  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    await app.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    await app.stop();
    process.exit(0);
  });

  await app.start();
  return app;
}
