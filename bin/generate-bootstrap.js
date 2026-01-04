#!/usr/bin/env node

/**
 * Smart Bootstrap Generator
 * 
 * Generates a concrete Bootstrap file based on boilerplate.config.js
 * Only includes dependencies that are actually used
 * Infrastructure as Code approach
 */

import fs from 'fs-extra';
import path from 'path';

/**
 * Generate Bootstrap file based on config
 */
export async function generateBootstrap(config, options = {}) {
  const { projectPath, useTypeScript = false } = options;
  
  // Analyze config to determine what's needed
  const dependencies = analyzeDependencies(config);
  
  // Generate bootstrap code
  const bootstrapCode = generateBootstrapCode(config, dependencies, useTypeScript);
  
  // Generate infrastructure files if needed
  if (config.runtime?.type !== 'local') {
    await generateInfrastructure(config, projectPath, useTypeScript);
  }
  
  // Write bootstrap file
  const ext = useTypeScript ? 'ts' : 'js';
  const bootstrapPath = path.join(projectPath, `bootstrap.${ext}`);
  await fs.writeFile(bootstrapPath, bootstrapCode);
  
  // Generate package.json dependencies
  const packageDeps = generatePackageDependencies(dependencies);
  
  return {
    bootstrapPath,
    dependencies: packageDeps,
    infrastructureGenerated: config.runtime?.type !== 'local'
  };
}

/**
 * Analyze config to determine required dependencies
 */
function analyzeDependencies(config) {
  const deps = {
    storage: new Set(),
    transport: new Set(),
    eventBus: new Set(),
    queue: new Set(),
    logger: new Set(),
    monitoring: new Set(),
    tracing: new Set(),
    runtime: new Set()
  };
  
  // Storage dependencies
  if (config.databases?.primary) {
    const type = config.databases.primary.type;
    if (type === 'postgres') {
      deps.storage.add('pg');
    } else if (type === 'mongodb') {
      deps.storage.add('mongodb');
    } else if (type === 'mysql') {
      deps.storage.add('mysql2');
    } else if (type === 'dynamodb') {
      deps.storage.add('@aws-sdk/client-dynamodb');
      deps.storage.add('@aws-sdk/lib-dynamodb');
    }
  }
  
  if (config.databases?.cache?.enabled) {
    const type = config.databases.cache.type;
    if (type === 'redis') {
      deps.storage.add('redis');
    } else if (type === 'memcached') {
      deps.storage.add('memcached');
    }
  }
  
  // Transport dependencies
  const transportType = config.transport?.type;
  if (transportType === 'http' || transportType === 'websocket') {
    deps.transport.add('express');
    if (transportType === 'websocket') {
      deps.transport.add('ws');
    }
  } else if (transportType === 'grpc') {
    deps.transport.add('@grpc/grpc-js');
    deps.transport.add('@grpc/proto-loader');
  } else if (transportType === 'nats') {
    deps.transport.add('nats');
  } else if (transportType === 'lambda') {
    deps.runtime.add('@aws-sdk/client-lambda');
  }
  
  // GraphQL
  if (config.graphql) {
    deps.transport.add('graphql');
    deps.transport.add('graphql-yoga');
    deps.transport.add('@graphql-tools/schema');
  }
  
  // EventBus dependencies
  const eventBusType = config.eventBus?.type;
  if (eventBusType === 'nats') {
    deps.eventBus.add('nats');
  } else if (eventBusType === 'redis') {
    deps.eventBus.add('redis');
  } else if (eventBusType === 'kafka') {
    deps.eventBus.add('kafkajs');
  } else if (eventBusType === 'rabbitmq') {
    deps.eventBus.add('amqplib');
  }
  
  // Queue dependencies
  const queueType = config.queue?.type;
  if (queueType === 'redis') {
    deps.queue.add('redis');
    deps.queue.add('bull');
  } else if (queueType === 'rabbitmq') {
    deps.queue.add('amqplib');
  } else if (queueType === 'sqs') {
    deps.queue.add('@aws-sdk/client-sqs');
  }
  
  // Runtime dependencies
  const runtimeType = config.runtime?.type;
  if (runtimeType === 'docker') {
    deps.runtime.add('dockerode');
  } else if (runtimeType === 'kubernetes') {
    deps.runtime.add('@kubernetes/client-node');
  } else if (runtimeType === 'lambda') {
    deps.runtime.add('aws-lambda');
  }
  
  // Logger
  if (config.logging?.transports?.includes('cloudwatch')) {
    deps.logger.add('winston');
    deps.logger.add('winston-cloudwatch');
  } else if (config.logging) {
    deps.logger.add('pino');
  }
  
  // Tracing
  if (config.features?.tracing?.enabled) {
    const provider = config.features.tracing.provider;
    if (provider === 'opentelemetry') {
      deps.tracing.add('@opentelemetry/sdk-trace-node');
      deps.tracing.add('@opentelemetry/exporter-trace-otlp-http');
      deps.tracing.add('@opentelemetry/resources');
      deps.tracing.add('@opentelemetry/semantic-conventions');
      deps.tracing.add('@opentelemetry/instrumentation');
      deps.tracing.add('@opentelemetry/instrumentation-http');
      if (config.features.tracing.config?.instrumentations?.graphql) {
        deps.tracing.add('@opentelemetry/instrumentation-graphql');
      }
    }
    // Native tracing uses built-in inspector API, no dependencies needed
  }
  
  // Monitoring
  if (config.features?.metrics) {
    deps.monitoring.add('prom-client');
  }
  if (config.features?.tracing) {
    deps.monitoring.add('@opentelemetry/api');
    deps.monitoring.add('@opentelemetry/sdk-node');
  }
  
  return deps;
}

/**
 * Generate concrete Bootstrap code
 */
function generateBootstrapCode(config, dependencies, useTypeScript = false) {
  const imports = [];
  const setup = [];
  const cleanup = [];
  
  // Imports
  if (useTypeScript) {
    imports.push(`import type { BoilerplateConfig } from './boilerplate.config';`);
  }
  
  // Storage setup
  if (config.databases?.primary) {
    const dbType = config.databases.primary.type;
    const storageCode = generateStorageCode(dbType, config.databases.primary.config, useTypeScript);
    imports.push(...storageCode.imports);
    setup.push(...storageCode.setup);
    cleanup.push(...storageCode.cleanup);
  }
  
  // Cache setup
  if (config.databases?.cache?.enabled) {
    const cacheCode = generateCacheCode(
      config.databases.cache.type,
      config.databases.cache.config,
      useTypeScript
    );
    imports.push(...cacheCode.imports);
    setup.push(...cacheCode.setup);
    cleanup.push(...cacheCode.cleanup);
  }
  
  // EventBus setup
  const eventBusCode = generateEventBusCode(
    config.eventBus?.type || 'local',
    config.eventBus?.config,
    useTypeScript
  );
  imports.push(...eventBusCode.imports);
  setup.push(...eventBusCode.setup);
  cleanup.push(...eventBusCode.cleanup);
  
  // Queue setup
  const queueCode = generateQueueCode(
    config.queue?.type || 'local',
    config.queue?.config,
    useTypeScript
  );
  imports.push(...queueCode.imports);
  setup.push(...queueCode.setup);
  cleanup.push(...queueCode.cleanup);
  
  // Logger setup
  const loggerCode = generateLoggerCode(config.logging, useTypeScript);
  imports.push(...loggerCode.imports);
  setup.push(...loggerCode.setup);
  
  // Tracing setup
  if (config.features?.tracing?.enabled) {
    const tracingCode = generateTracingCode(config.features.tracing, useTypeScript);
    imports.push(...tracingCode.imports);
    setup.push(...tracingCode.setup);
    cleanup.push(...tracingCode.cleanup);
  }
  
  // Transport setup
  const transportCode = generateTransportCode(
    config.transport?.type || 'http',
    config.transport?.config,
    config.graphql,
    useTypeScript
  );
  imports.push(...transportCode.imports);
  setup.push(...transportCode.setup);
  cleanup.push(...transportCode.cleanup);
  
  // Service discovery
  const serviceCode = generateServiceDiscoveryCode(config.services, useTypeScript);
  setup.push(...serviceCode.setup);
  cleanup.push(...serviceCode.cleanup);
  
  // Runtime-specific code
  if (config.runtime?.type !== 'local') {
    const runtimeImport = `import { initializeInfrastructure } from './infrastructure/${config.runtime.type}';`;
    imports.push(runtimeImport);
    setup.unshift('  // Initialize infrastructure', '  await initializeInfrastructure(config);', '');
  }
  
  // Generate final code
  return generateFinalBootstrapCode(imports, setup, cleanup, useTypeScript);
}

/**
 * Generate storage code
 */
function generateStorageCode(type, config, useTypeScript) {
  const imports = [];
  const setup = [];
  const cleanup = [];
  
  if (type === 'postgres') {
    imports.push(`import { Pool } from 'pg';`);
    
    setup.push(
      `  // PostgreSQL Storage`,
      `  const pool = new Pool({`,
      `    host: process.env.DB_HOST || '${config?.host || 'localhost'}',`,
      `    port: parseInt(process.env.DB_PORT || '${config?.port || 5432}'),`,
      `    database: process.env.DB_NAME || '${config?.database || 'app'}',`,
      `    user: process.env.DB_USER || '${config?.user || 'postgres'}',`,
      `    password: process.env.DB_PASSWORD || '',`,
      `    max: ${config?.max || 20},`,
      `    idleTimeoutMillis: ${config?.idleTimeoutMillis || 30000}`,
      `  });`,
      `  `,
      `  const storage = {`,
      `    async query(sql${useTypeScript ? ': string' : ''}, params${useTypeScript ? '?: any[]' : ''} = []) {`,
      `      const result = await pool.query(sql, params);`,
      `      return result.rows;`,
      `    },`,
      `    async findOne(table${useTypeScript ? ': string' : ''}, filter${useTypeScript ? ': any' : ''} = {}) {`,
      `      const keys = Object.keys(filter);`,
      `      const values = Object.values(filter);`,
      `      const where = keys.map((key, i) => \`\${key} = $\${i + 1}\`).join(' AND ');`,
      `      const sql = \`SELECT * FROM \${table}\${where ? ' WHERE ' + where : ''} LIMIT 1\`;`,
      `      const rows = await this.query(sql, values);`,
      `      return rows[0] || null;`,
      `    },`,
      `    async find(table${useTypeScript ? ': string' : ''}, filter${useTypeScript ? ': any' : ''} = {}, options${useTypeScript ? ': any' : ''} = {}) {`,
      `      const keys = Object.keys(filter);`,
      `      const values = Object.values(filter);`,
      `      const where = keys.map((key, i) => \`\${key} = $\${i + 1}\`).join(' AND ');`,
      `      let sql = \`SELECT * FROM \${table}\${where ? ' WHERE ' + where : ''}\`;`,
      `      if (options.limit) sql += \` LIMIT \${options.limit}\`;`,
      `      if (options.offset) sql += \` OFFSET \${options.offset}\`;`,
      `      return await this.query(sql, values);`,
      `    },`,
      `    async insertOne(table${useTypeScript ? ': string' : ''}, data${useTypeScript ? ': any' : ''}) {`,
      `      const keys = Object.keys(data);`,
      `      const values = Object.values(data);`,
      `      const placeholders = values.map((_, i) => \`$\${i + 1}\`).join(', ');`,
      `      const sql = \`INSERT INTO \${table} (\${keys.join(', ')}) VALUES (\${placeholders}) RETURNING *\`;`,
      `      const rows = await this.query(sql, values);`,
      `      return rows[0];`,
      `    },`,
      `    async updateOne(table${useTypeScript ? ': string' : ''}, filter${useTypeScript ? ': any' : ''}, data${useTypeScript ? ': any' : ''}) {`,
      `      const keys = Object.keys(data);`,
      `      const values = Object.values(data);`,
      `      const filterKeys = Object.keys(filter);`,
      `      const filterValues = Object.values(filter);`,
      `      const set = keys.map((key, i) => \`\${key} = $\${i + 1}\`).join(', ');`,
      `      const where = filterKeys.map((key, i) => \`\${key} = $\${values.length + i + 1}\`).join(' AND ');`,
      `      const sql = \`UPDATE \${table} SET \${set} WHERE \${where} RETURNING *\`;`,
      `      const rows = await this.query(sql, [...values, ...filterValues]);`,
      `      return rows[0];`,
      `    },`,
      `    async deleteOne(table${useTypeScript ? ': string' : ''}, filter${useTypeScript ? ': any' : ''}) {`,
      `      const keys = Object.keys(filter);`,
      `      const values = Object.values(filter);`,
      `      const where = keys.map((key, i) => \`\${key} = $\${i + 1}\`).join(' AND ');`,
      `      const sql = \`DELETE FROM \${table} WHERE \${where}\`;`,
      `      await this.query(sql, values);`,
      `      return true;`,
      `    }`,
      `  };`,
      ``
    );
    
    cleanup.push(
      `  // Close PostgreSQL connection`,
      `  await pool.end();`
    );
  } else if (type === 'mongodb') {
    imports.push(`import { MongoClient } from 'mongodb';`);
    
    setup.push(
      `  // MongoDB Storage`,
      `  const mongoClient = new MongoClient(process.env.MONGO_URL || '${config?.url || 'mongodb://localhost:27017'}');`,
      `  await mongoClient.connect();`,
      `  const db = mongoClient.db(process.env.MONGO_DB || '${config?.database || 'app'}');`,
      `  `,
      `  const storage = {`,
      `    async findOne(collection${useTypeScript ? ': string' : ''}, filter${useTypeScript ? ': any' : ''}) {`,
      `      return await db.collection(collection).findOne(filter);`,
      `    },`,
      `    async find(collection${useTypeScript ? ': string' : ''}, filter${useTypeScript ? ': any' : ''} = {}, options${useTypeScript ? ': any' : ''} = {}) {`,
      `      return await db.collection(collection).find(filter, options).toArray();`,
      `    },`,
      `    async insertOne(collection${useTypeScript ? ': string' : ''}, data${useTypeScript ? ': any' : ''}) {`,
      `      const result = await db.collection(collection).insertOne(data);`,
      `      return { ...data, id: result.insertedId };`,
      `    },`,
      `    async updateOne(collection${useTypeScript ? ': string' : ''}, filter${useTypeScript ? ': any' : ''}, data${useTypeScript ? ': any' : ''}) {`,
      `      await db.collection(collection).updateOne(filter, { $set: data });`,
      `      return await this.findOne(collection, filter);`,
      `    },`,
      `    async deleteOne(collection${useTypeScript ? ': string' : ''}, filter${useTypeScript ? ': any' : ''}) {`,
      `      await db.collection(collection).deleteOne(filter);`,
      `      return true;`,
      `    }`,
      `  };`,
      ``
    );
    
    cleanup.push(
      `  // Close MongoDB connection`,
      `  await mongoClient.close();`
    );
  } else if (type === 'memory') {
    setup.push(
      `  // In-Memory Storage`,
      `  const memoryStore = new Map${useTypeScript ? '<string, any[]>' : ''}();`,
      `  `,
      `  const storage = {`,
      `    findOne(table${useTypeScript ? ': string' : ''}, filter${useTypeScript ? ': any' : ''} = {}) {`,
      `      const items = memoryStore.get(table) || [];`,
      `      return items.find(item => `,
      `        Object.keys(filter).every(key => item[key] === filter[key])`,
      `      ) || null;`,
      `    },`,
      `    find(table${useTypeScript ? ': string' : ''}, filter${useTypeScript ? ': any' : ''} = {}) {`,
      `      const items = memoryStore.get(table) || [];`,
      `      if (Object.keys(filter).length === 0) return items;`,
      `      return items.filter(item =>`,
      `        Object.keys(filter).every(key => item[key] === filter[key])`,
      `      );`,
      `    },`,
      `    insertOne(table${useTypeScript ? ': string' : ''}, data${useTypeScript ? ': any' : ''}) {`,
      `      const items = memoryStore.get(table) || [];`,
      `      const id = String(Date.now() + Math.random());`,
      `      const item = { ...data, id };`,
      `      items.push(item);`,
      `      memoryStore.set(table, items);`,
      `      return item;`,
      `    },`,
      `    updateOne(table${useTypeScript ? ': string' : ''}, filter${useTypeScript ? ': any' : ''}, data${useTypeScript ? ': any' : ''}) {`,
      `      const items = memoryStore.get(table) || [];`,
      `      const index = items.findIndex(item =>`,
      `        Object.keys(filter).every(key => item[key] === filter[key])`,
      `      );`,
      `      if (index >= 0) {`,
      `        items[index] = { ...items[index], ...data };`,
      `        memoryStore.set(table, items);`,
      `        return items[index];`,
      `      }`,
      `      return null;`,
      `    },`,
      `    deleteOne(table${useTypeScript ? ': string' : ''}, filter${useTypeScript ? ': any' : ''}) {`,
      `      const items = memoryStore.get(table) || [];`,
      `      const newItems = items.filter(item =>`,
      `        !Object.keys(filter).every(key => item[key] === filter[key])`,
      `      );`,
      `      memoryStore.set(table, newItems);`,
      `      return true;`,
      `    }`,
      `  };`,
      ``
    );
  }
  
  return { imports, setup, cleanup };
}

/**
 * Generate cache code
 */
function generateCacheCode(type, config, useTypeScript) {
  const imports = [];
  const setup = [];
  const cleanup = [];
  
  if (type === 'redis') {
    imports.push(`import { createClient } from 'redis';`);
    
    setup.push(
      `  // Redis Cache`,
      `  const redisClient = createClient({`,
      `    url: process.env.REDIS_URL || '${config?.url || 'redis://localhost:6379'}'`,
      `  });`,
      `  await redisClient.connect();`,
      `  `,
      `  const cache = {`,
      `    async get(key${useTypeScript ? ': string' : ''}) {`,
      `      const value = await redisClient.get(key);`,
      `      return value ? JSON.parse(value) : null;`,
      `    },`,
      `    async set(key${useTypeScript ? ': string' : ''}, value${useTypeScript ? ': any' : ''}, ttl${useTypeScript ? '?: number' : ''} = 3600) {`,
      `      await redisClient.setEx(key, ttl, JSON.stringify(value));`,
      `    },`,
      `    async del(key${useTypeScript ? ': string' : ''}) {`,
      `      await redisClient.del(key);`,
      `    }`,
      `  };`,
      ``
    );
    
    cleanup.push(
      `  // Close Redis connection`,
      `  await redisClient.quit();`
    );
  } else {
    setup.push(
      `  // In-Memory Cache`,
      `  const cacheStore = new Map${useTypeScript ? '<string, { value: any, expires: number }>' : ''}();`,
      `  `,
      `  const cache = {`,
      `    get(key${useTypeScript ? ': string' : ''}) {`,
      `      const item = cacheStore.get(key);`,
      `      if (!item) return null;`,
      `      if (item.expires < Date.now()) {`,
      `        cacheStore.delete(key);`,
      `        return null;`,
      `      }`,
      `      return item.value;`,
      `    },`,
      `    set(key${useTypeScript ? ': string' : ''}, value${useTypeScript ? ': any' : ''}, ttl${useTypeScript ? '?' : ''} = 3600) {`,
      `      cacheStore.set(key, {`,
      `        value,`,
      `        expires: Date.now() + (ttl * 1000)`,
      `      });`,
      `    },`,
      `    del(key${useTypeScript ? ': string' : ''}) {`,
      `      cacheStore.delete(key);`,
      `    }`,
      `  };`,
      ``
    );
  }
  
  return { imports, setup, cleanup };
}

/**
 * Generate EventBus code
 */
function generateEventBusCode(type, config, useTypeScript) {
  const imports = [];
  const setup = [];
  const cleanup = [];
  
  if (type === 'nats') {
    imports.push(`import { connect, StringCodec } from 'nats';`);
    
    setup.push(
      `  // NATS EventBus`,
      `  const natsConnection = await connect({`,
      `    servers: process.env.NATS_URL || '${config?.servers?.[0] || 'nats://localhost:4222'}'`,
      `  });`,
      `  const sc = StringCodec();`,
      `  `,
      `  const eventBus = {`,
      `    async publish(event${useTypeScript ? ': string' : ''}, data${useTypeScript ? ': any' : ''}) {`,
      `      natsConnection.publish(event, sc.encode(JSON.stringify(data)));`,
      `    },`,
      `    async subscribe(event${useTypeScript ? ': string' : ''}, handler${useTypeScript ? ': (data: any) => void | Promise<void>' : ''}) {`,
      `      const sub = natsConnection.subscribe(event);`,
      `      (async () => {`,
      `        for await (const msg of sub) {`,
      `          const data = JSON.parse(sc.decode(msg.data));`,
      `          await handler(data);`,
      `        }`,
      `      })();`,
      `    }`,
      `  };`,
      ``
    );
    
    cleanup.push(
      `  // Close NATS connection`,
      `  await natsConnection.drain();`
    );
  } else if (type === 'redis') {
    imports.push(`import { createClient } from 'redis';`);
    
    setup.push(
      `  // Redis EventBus`,
      `  const redisPub = createClient({ url: process.env.REDIS_URL || '${config?.url || 'redis://localhost:6379'}' });`,
      `  const redisSub = createClient({ url: process.env.REDIS_URL || '${config?.url || 'redis://localhost:6379'}' });`,
      `  await redisPub.connect();`,
      `  await redisSub.connect();`,
      `  `,
      `  const eventBus = {`,
      `    async publish(event${useTypeScript ? ': string' : ''}, data${useTypeScript ? ': any' : ''}) {`,
      `      await redisPub.publish(event, JSON.stringify(data));`,
      `    },`,
      `    async subscribe(event${useTypeScript ? ': string' : ''}, handler${useTypeScript ? ': (data: any) => void | Promise<void>' : ''}) {`,
      `      await redisSub.subscribe(event, async (message) => {`,
      `        const data = JSON.parse(message);`,
      `        await handler(data);`,
      `      });`,
      `    }`,
      `  };`,
      ``
    );
    
    cleanup.push(
      `  // Close Redis connections`,
      `  await redisPub.quit();`,
      `  await redisSub.quit();`
    );
  } else {
    // Local EventBus
    setup.push(
      `  // Local EventBus`,
      `  const eventBus = {`,
      `    handlers: new Map${useTypeScript ? '<string, Set<Function>>' : ''}(),`,
      `    async publish(event${useTypeScript ? ': string' : ''}, data${useTypeScript ? ': any' : ''}) {`,
      `      const handlers = this.handlers.get(event) || new Set();`,
      `      for (const handler of handlers) {`,
      `        await handler(data);`,
      `      }`,
      `    },`,
      `    async subscribe(event${useTypeScript ? ': string' : ''}, handler${useTypeScript ? ': Function' : ''}) {`,
      `      if (!this.handlers.has(event)) {`,
      `        this.handlers.set(event, new Set());`,
      `      }`,
      `      this.handlers.get(event).add(handler);`,
      `    }`,
      `  };`,
      ``
    );
  }
  
  return { imports, setup, cleanup };
}

/**
 * Generate Queue code
 */
function generateQueueCode(type, config, useTypeScript) {
  const imports = [];
  const setup = [];
  const cleanup = [];
  
  if (type === 'redis') {
    imports.push(`import { Queue, Worker } from 'bull';`);
    
    setup.push(
      `  // Redis Queue Manager`,
      `  const queues = new Map${useTypeScript ? '<string, any>' : ''}();`,
      `  `,
      `  const queueManager = {`,
      `    send(queueName${useTypeScript ? ': string' : ''}, data${useTypeScript ? ': any' : ''}) {`,
      `      let queue = queues.get(queueName);`,
      `      if (!queue) {`,
      `        queue = new Queue(queueName, process.env.REDIS_URL || '${config?.url || 'redis://localhost:6379'}');`,
      `        queues.set(queueName, queue);`,
      `      }`,
      `      queue.add(data);`,
      `    },`,
      `    process(queueName${useTypeScript ? ': string' : ''}, handler${useTypeScript ? ': (data: any) => Promise<void>' : ''}, options${useTypeScript ? '?: any' : ''} = {}) {`,
      `      const worker = new Worker(queueName, async (job) => {`,
      `        await handler(job.data);`,
      `      }, {`,
      `        connection: { url: process.env.REDIS_URL || '${config?.url || 'redis://localhost:6379'}' }`,
      `      });`,
      `      return worker;`,
      `    }`,
      `  };`,
      ``
    );
    
    cleanup.push(
      `  // Close queues`,
      `  for (const queue of queues.values()) {`,
      `    await queue.close();`,
      `  }`
    );
  } else {
    // Local Queue
    setup.push(
      `  // Local Queue Manager`,
      `  const localQueues = new Map${useTypeScript ? '<string, any[]>' : ''}();`,
      `  const queueProcessors = new Map${useTypeScript ? '<string, any>' : ''}();`,
      `  `,
      `  const queueManager = {`,
      `    send(queueName${useTypeScript ? ': string' : ''}, data${useTypeScript ? ': any' : ''}) {`,
      `      if (!localQueues.has(queueName)) {`,
      `        localQueues.set(queueName, []);`,
      `      }`,
      `      localQueues.get(queueName).push(data);`,
      `    },`,
      `    process(queueName${useTypeScript ? ': string' : ''}, handler${useTypeScript ? ': (data: any) => Promise<void>' : ''}, options${useTypeScript ? '?: any' : ''} = {}) {`,
      `      const interval = options.interval || 1000;`,
      `      const processor = setInterval(async () => {`,
      `        const queue = localQueues.get(queueName) || [];`,
      `        while (queue.length > 0) {`,
      `          const item = queue.shift();`,
      `          try {`,
      `            await handler(item);`,
      `          } catch (error) {`,
      `            console.error('Queue processing error:', error);`,
      `          }`,
      `        }`,
      `      }, interval);`,
      `      queueProcessors.set(queueName, processor);`,
      `      return processor;`,
      `    }`,
      `  };`,
      ``
    );
    
    cleanup.push(
      `  // Stop queue processors`,
      `  for (const processor of queueProcessors.values()) {`,
      `    clearInterval(processor);`,
      `  }`
    );
  }
  
  return { imports, setup, cleanup };
}

/**
 * Generate Logger code
 */
function generateLoggerCode(config, useTypeScript) {
  const imports = [];
  const setup = [];
  
  if (config?.transports?.includes('cloudwatch')) {
    imports.push(`import winston from 'winston';`);
    imports.push(`import CloudWatchTransport from 'winston-cloudwatch';`);
    
    setup.push(
      `  // Winston Logger with CloudWatch`,
      `  const logger = winston.createLogger({`,
      `    level: '${config.level || 'info'}',`,
      `    format: winston.format.json(),`,
      `    transports: [`,
      `      new winston.transports.Console(),`,
      `      new CloudWatchTransport({`,
      `        logGroupName: process.env.LOG_GROUP || 'app-logs',`,
      `        logStreamName: process.env.LOG_STREAM || 'default'`,
      `      })`,
      `    ]`,
      `  });`,
      ``
    );
  } else {
    imports.push(`import pino from 'pino';`);
    
    setup.push(
      `  // Pino Logger`,
      `  const logger = pino({`,
      `    level: process.env.LOG_LEVEL || '${config?.level || 'info'}',`,
      `    transport: process.env.NODE_ENV !== 'production' ? {`,
      `      target: 'pino-pretty',`,
      `      options: { colorize: true }`,
      `    } : undefined`,
      `  });`,
      ``
    );
  }
  
  return { imports, setup, cleanup: [] };
}

/**
 * Generate Tracing code
 */
function generateTracingCode(config, useTypeScript) {
  const imports = [];
  const setup = [];
  const cleanup = [];
  
  const provider = config.provider || 'native';
  
  if (provider === 'opentelemetry') {
    imports.push(`import { TracingFactory } from '@dualitysol/boilerplate/tracing';`);
    
    setup.push(
      `  // OpenTelemetry Tracing`,
      `  const tracing = TracingFactory.create({`,
      `    enabled: true,`,
      `    provider: 'opentelemetry',`,
      `    config: {`,
      `      serviceName: config.project?.name || '${config.config?.serviceName || 'app'}',`,
      `      serviceVersion: process.env.npm_package_version || '1.0.0',`,
      `      environment: process.env.NODE_ENV || 'development',`,
      `      endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || '${config.config?.endpoint || 'http://localhost:4318/v1/traces'}',`,
      `      headers: process.env.OTEL_HEADERS ? JSON.parse(process.env.OTEL_HEADERS) : {},`,
      `      sampleRate: parseFloat(process.env.TRACE_SAMPLE_RATE || '${config.config?.sampleRate || 1.0}'),`,
      `      instrumentations: {`,
      `        http: ${config.config?.instrumentations?.http !== false},`,
      `        grpc: ${config.config?.instrumentations?.grpc === true},`,
      `        graphql: ${config.config?.instrumentations?.graphql === true},`,
      `        database: ${config.config?.instrumentations?.database === true},`,
      `        redis: ${config.config?.instrumentations?.redis === true}`,
      `      }`,
      `    }`,
      `  });`,
      `  await tracing.enable();`,
      ``
    );
    
    cleanup.push(
      `  // Shutdown tracing`,
      `  await tracing.disable();`
    );
  } else if (provider === 'native') {
    imports.push(`import { TracingFactory } from '@dualitysol/boilerplate/tracing';`);
    
    const exporter = config.config?.exporter || 'console';
    
    setup.push(
      `  // Native Node.js Tracing`,
      `  const tracing = TracingFactory.create({`,
      `    enabled: true,`,
      `    provider: 'native',`,
      `    config: {`,
      `      serviceName: config.project?.name || '${config.config?.serviceName || 'app'}',`,
      `      exporter: '${exporter}',`
    );
    
    if (exporter === 'file') {
      setup.push(`      filePath: process.env.TRACE_FILE || '${config.config?.filePath || './traces/trace.jsonl'}',`);
    } else if (exporter === 'http' || exporter === 'jaeger') {
      setup.push(`      endpoint: process.env.TRACE_ENDPOINT || '${config.config?.endpoint || 'http://localhost:14268/api/traces'}',`);
    }
    
    setup.push(
      `      sampleRate: parseFloat(process.env.TRACE_SAMPLE_RATE || '${config.config?.sampleRate || 1.0}')`,
      `    }`,
      `  });`,
      `  await tracing.enable();`,
      ``
    );
    
    cleanup.push(
      `  // Shutdown tracing`,
      `  await tracing.disable();`
    );
  }
  
  return { imports, setup, cleanup };
}

/**
 * Generate Transport code
 */
function generateTransportCode(type, config, graphqlConfig, useTypeScript) {
  const imports = [];
  const setup = [];
  const cleanup = [];
  
  if (type === 'http' || type === 'websocket') {
    if (graphqlConfig) {
      imports.push(`import { createYoga } from 'graphql-yoga';`);
      imports.push(`import { createServer } from 'node:http';`);
      imports.push(`import { makeExecutableSchema } from '@graphql-tools/schema';`);
      
      setup.push(
        `  // GraphQL Yoga Server`,
        `  const schema = makeExecutableSchema({`,
        `    typeDefs: mergedTypeDefs,`,
        `    resolvers: mergedResolvers`,
        `  });`,
        `  `,
        `  const yoga = createYoga({`,
        `    schema,`,
        `    context: ({ request }) => ({`,
        `      storage,`,
        `      ${config?.cache?.enabled ? 'cache,' : ''}`,
        `      eventBus,`,
        `      queueManager,`,
        `      logger,`,
        `      services,`,
        `      currentUser: null // Add authentication logic`,
        `    }),`,
        `    graphqlEndpoint: '${config?.graphql?.path || '/graphql'}',`,
        `    landingPage: ${graphqlConfig.config?.playground !== false}`,
        `  });`,
        `  `,
        `  const server = createServer(yoga);`,
        `  const port = process.env.PORT || ${config?.port || 4000};`,
        `  `,
        `  server.listen(port, () => {`,
        `    logger.info(\`🚀 Server ready at http://localhost:\${port}${config?.graphql?.path || '/graphql'}\`);`,
        `  });`,
        ``
      );
      
      cleanup.push(
        `  // Close HTTP server`,
        `  server.close();`
      );
    }
  } else if (type === 'nats') {
    // NATS transport already included in EventBus
    setup.push(
      `  // NATS Transport (using EventBus)`,
      `  logger.info('Using NATS for inter-service communication');`,
      ``
    );
  }
  
  return { imports, setup, cleanup };
}

/**
 * Generate Service Discovery code
 */
function generateServiceDiscoveryCode(servicesConfig, useTypeScript) {
  const setup = [];
  const cleanup = [];
  
  setup.push(
    `  // Service Discovery and Initialization`,
    `  const services${useTypeScript ? ': any' : ''} = {};`,
    `  const servicesPath = path.join(__dirname, '${servicesConfig?.path || './services'}');`,
    `  const serviceDirs = await fs.readdir(servicesPath);`,
    `  `,
    `  // Merge GraphQL schemas and resolvers`,
    `  let mergedTypeDefs = '';`,
    `  const mergedResolvers${useTypeScript ? ': any' : ''} = { Query: {}, Mutation: {} };`,
    `  `,
    `  for (const serviceDir of serviceDirs) {`,
    `    const servicePath = path.join(servicesPath, serviceDir);`,
    `    const stat = await fs.stat(servicePath);`,
    `    if (!stat.isDirectory()) continue;`,
    `    `,
    `    // Load model`,
    `    const modelPath = path.join(servicePath, 'model');`,
    `    if (await fs.pathExists(modelPath)) {`,
    `      const { default: Model } = await import(path.join(modelPath, 'index.js'));`,
    `      const model = new Model({`,
    `        storage,`,
    `        ${servicesConfig?.cache?.enabled ? 'cache,' : ''}`,
    `        eventBus,`,
    `        queueManager,`,
    `        logger`,
    `      });`,
    `      await model.initialize();`,
    `      services[serviceDir] = model;`,
    `      logger.info(\`✓ Loaded service: \${serviceDir}\`);`,
    `    }`,
    `    `,
    `    // Load GraphQL schema`,
    `    const schemaPath = path.join(servicePath, 'typeDefinitions', 'index.gql');`,
    `    if (await fs.pathExists(schemaPath)) {`,
    `      const typeDefs = await fs.readFile(schemaPath, 'utf-8');`,
    `      mergedTypeDefs += '\\n' + typeDefs;`,
    `    }`,
    `    `,
    `    // Load resolvers`,
    `    const resolversPath = path.join(servicePath, 'resolvers');`,
    `    if (await fs.pathExists(resolversPath)) {`,
    `      const { resolvers } = await import(path.join(resolversPath, 'index.js'));`,
    `      if (resolvers.Query) Object.assign(mergedResolvers.Query, resolvers.Query);`,
    `      if (resolvers.Mutation) Object.assign(mergedResolvers.Mutation, resolvers.Mutation);`,
    `      if (resolvers.Subscription) mergedResolvers.Subscription = { ...mergedResolvers.Subscription, ...resolvers.Subscription };`,
    `      // Merge type resolvers`,
    `      for (const [typeName, typeResolver] of Object.entries(resolvers)) {`,
    `        if (typeName !== 'Query' && typeName !== 'Mutation' && typeName !== 'Subscription') {`,
    `          mergedResolvers[typeName] = { ...mergedResolvers[typeName], ...typeResolver };`,
    `        }`,
    `      }`,
    `    }`,
    `  }`,
    `  `,
    `  // Update resolver context to include services`,
    `  for (const resolverType of Object.values(mergedResolvers)) {`,
    `    if (typeof resolverType === 'object') {`,
    `      for (const [key, resolver] of Object.entries(resolverType)) {`,
    `        if (typeof resolver === 'function') {`,
    `          const original = resolver;`,
    `          resolverType[key] = (parent${useTypeScript ? ': any' : ''}, args${useTypeScript ? ': any' : ''}, context${useTypeScript ? ': any' : ''}, info${useTypeScript ? ': any' : ''}) => {`,
    `            return original(parent, args, { ...context, services }, info);`,
    `          };`,
    `        }`,
    `      }`,
    `    }`,
    `  }`,
    ``
  );
  
  cleanup.push(
    `  // Cleanup services`,
    `  for (const service of Object.values(services)) {`,
    `    if (service.cleanup) await service.cleanup();`,
    `  }`
  );
  
  return { setup, cleanup };
}

/**
 * Generate final Bootstrap code
 */
function generateFinalBootstrapCode(imports, setup, cleanup, useTypeScript) {
  const ext = useTypeScript ? 'ts' : 'js';
  
  const code = `/**
 * Auto-generated Bootstrap
 * Generated from boilerplate.config.${ext}
 * 
 * This file contains concrete implementations based on your configuration.
 * Infrastructure as Code approach - all dependencies are explicit and typed.
 */

${imports.join('\n')}
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Bootstrap the application
 */
export async function bootstrap() {
  console.log('🚀 Starting application...');
  
${setup.join('\n')}
  
  console.log('✅ Application started successfully');
  
  // Graceful shutdown
  const shutdown = async () => {
    console.log('\\n⏹️  Shutting down gracefully...');
    
${cleanup.join('\n')}
    
    console.log('✅ Shutdown complete');
    process.exit(0);
  };
  
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// Auto-start if this is the main module
if (import.meta.url === \`file://\${process.argv[1]}\`) {
  bootstrap().catch(error => {
    console.error('❌ Bootstrap failed:', error);
    process.exit(1);
  });
}
`;
  
  return code;
}

/**
 * Generate infrastructure files for specific runtime
 */
async function generateInfrastructure(config, projectPath, useTypeScript) {
  const runtimeType = config.runtime.type;
  const infraPath = path.join(projectPath, 'infrastructure', runtimeType);
  await fs.ensureDir(infraPath);
  
  const ext = useTypeScript ? 'ts' : 'js';
  
  if (runtimeType === 'docker') {
    await generateDockerInfrastructure(infraPath, config, ext);
  } else if (runtimeType === 'kubernetes') {
    await generateK8sInfrastructure(infraPath, config, ext);
  } else if (runtimeType === 'lambda') {
    await generateLambdaInfrastructure(infraPath, config, ext);
  }
}

/**
 * Generate Docker infrastructure
 */
async function generateDockerInfrastructure(infraPath, config, ext) {
  // Dockerfile
  const dockerfile = `FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

${ext === 'ts' ? 'RUN npm run build\n' : ''}
EXPOSE ${config.transport?.config?.port || 4000}

CMD ["node", "${ext === 'ts' ? 'dist/' : ''}index.js"]
`;
  
  await fs.writeFile(path.join(infraPath, 'Dockerfile'), dockerfile);
  
  // docker-compose.yml
  const services = {
    app: {
      build: '.',
      ports: [`${config.transport?.config?.port || 4000}:${config.transport?.config?.port || 4000}`],
      environment: ['NODE_ENV=production']
    }
  };
  
  if (config.databases?.primary?.type === 'postgres') {
    services.postgres = {
      image: 'postgres:16-alpine',
      environment: [
        'POSTGRES_DB=app',
        'POSTGRES_USER=postgres',
        'POSTGRES_PASSWORD=postgres'
      ],
      volumes: ['postgres_data:/var/lib/postgresql/data']
    };
    services.app.depends_on = ['postgres'];
    services.app.environment.push('DB_HOST=postgres');
  }
  
  if (config.eventBus?.type === 'nats') {
    services.nats = {
      image: 'nats:2-alpine',
      ports: ['4222:4222']
    };
    services.app.depends_on = services.app.depends_on || [];
    services.app.depends_on.push('nats');
    services.app.environment.push('NATS_URL=nats://nats:4222');
  }
  
  const compose = `version: '3.8'

services:
${Object.entries(services).map(([name, svc]) => {
  return `  ${name}:\n${Object.entries(svc).map(([key, val]) => {
    if (Array.isArray(val)) {
      return `    ${key}:\n${val.map(v => `      - ${v}`).join('\n')}`;
    } else if (typeof val === 'object') {
      return `    ${key}:\n${Object.entries(val).map(([k, v]) => `      ${k}: ${v}`).join('\n')}`;
    }
    return `    ${key}: ${val}`;
  }).join('\n')}`;
}).join('\n\n')}

${config.databases?.primary?.type === 'postgres' ? 'volumes:\n  postgres_data:' : ''}
`;
  
  await fs.writeFile(path.join(infraPath, 'docker-compose.yml'), compose);
  
  // index.js/ts
  const indexCode = `/**
 * Docker Infrastructure Initialization
 */

export async function initializeInfrastructure(config${ext === 'ts' ? ': any' : ''}) {
  console.log('🐳 Initializing Docker infrastructure...');
  
  // Wait for dependencies
  if (config.databases?.primary?.type === 'postgres') {
    await waitForPostgres();
  }
  
  if (config.eventBus?.type === 'nats') {
    await waitForNATS();
  }
  
  console.log('✓ Docker infrastructure ready');
}

async function waitForPostgres() {
  // Implement connection retry logic
  console.log('Waiting for PostgreSQL...');
}

async function waitForNATS() {
  // Implement connection retry logic
  console.log('Waiting for NATS...');
}
`;
  
  await fs.writeFile(path.join(infraPath, `index.${ext}`), indexCode);
}

/**
 * Generate Kubernetes infrastructure
 */
async function generateK8sInfrastructure(infraPath, config, ext) {
  // deployment.yaml
  const deployment = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${config.project.name}
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ${config.project.name}
  template:
    metadata:
      labels:
        app: ${config.project.name}
    spec:
      containers:
      - name: app
        image: ${config.project.name}:latest
        ports:
        - containerPort: ${config.transport?.config?.port || 4000}
        env:
        - name: NODE_ENV
          value: production
---
apiVersion: v1
kind: Service
metadata:
  name: ${config.project.name}
spec:
  selector:
    app: ${config.project.name}
  ports:
  - port: 80
    targetPort: ${config.transport?.config?.port || 4000}
  type: LoadBalancer
`;
  
  await fs.writeFile(path.join(infraPath, 'deployment.yaml'), deployment);
  
  // index.js/ts
  const indexCode = `/**
 * Kubernetes Infrastructure Initialization
 */

export async function initializeInfrastructure(config${ext === 'ts' ? ': any' : ''}) {
  console.log('☸️ Initializing Kubernetes infrastructure...');
  
  // K8s-specific initialization
  console.log('✓ Kubernetes infrastructure ready');
}
`;
  
  await fs.writeFile(path.join(infraPath, `index.${ext}`), indexCode);
}

/**
 * Generate Lambda infrastructure
 */
async function generateLambdaInfrastructure(infraPath, config, ext) {
  // handler.js/ts
  const handler = `/**
 * AWS Lambda Handler
 */

import { bootstrap } from '../../bootstrap.${ext}';

let bootstrapped = false;

export const handler = async (event${ext === 'ts' ? ': any' : ''}, context${ext === 'ts' ? ': any' : ''}) => {
  // Bootstrap only once (Lambda container reuse)
  if (!bootstrapped) {
    await bootstrap();
    bootstrapped = true;
  }
  
  // Handle event
  // TODO: Implement your Lambda logic
  
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Success' })
  };
};
`;
  
  await fs.writeFile(path.join(infraPath, `handler.${ext}`), handler);
  
  // serverless.yml or SAM template
  const serverless = `service: ${config.project.name}

provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1

functions:
  api:
    handler: infrastructure/lambda/handler.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
`;
  
  await fs.writeFile(path.join(infraPath, 'serverless.yml'), serverless);
  
  // index.js/ts
  const indexCode = `/**
 * AWS Lambda Infrastructure Initialization
 */

export async function initializeInfrastructure(config${ext === 'ts' ? ': any' : ''}) {
  console.log('λ Initializing Lambda infrastructure...');
  
  // Lambda-specific initialization
  console.log('✓ Lambda infrastructure ready');
}
`;
  
  await fs.writeFile(path.join(infraPath, `index.${ext}`), indexCode);
}

/**
 * Generate package.json dependencies
 */
function generatePackageDependencies(dependencies) {
  const deps = {};
  
  for (const [category, pkgs] of Object.entries(dependencies)) {
    for (const pkg of pkgs) {
      deps[pkg] = 'latest';
    }
  }
  
  return deps;
}

export default generateBootstrap;
