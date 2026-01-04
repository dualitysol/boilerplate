/**
 * Boilerplate Configuration for Todo App Monolith
 * 
 * This configuration defines the entire infrastructure for the application.
 * Change settings here to switch between development/production, add features, etc.
 */

export default {
  // Project metadata
  project: {
    name: 'todo-app-monolith',
    version: '1.0.0',
    description: 'Todo Application - Monolith Example',
    type: 'monolith' // 'monolith' | 'microservices' | 'serverless'
  },

  // Service discovery configuration
  services: {
    autoDiscover: true,
    path: './services',
    // Manual service list (if autoDiscover is false)
    list: [
      'UserService',
      'TodoService',
      'NotificationService'
    ]
  },

  // Transport configuration
  transport: {
    type: 'http', // 'http' | 'websocket' | 'nats' | 'grpc' | 'lambda'
    config: {
      port: process.env.PORT || 4000,
      host: process.env.HOST || 'localhost',
      cors: {
        enabled: true,
        origin: '*'
      },
      graphql: {
        path: '/graphql',
        playground: process.env.NODE_ENV !== 'production'
      }
    }
  },

  // Event Bus configuration
  eventBus: {
    type: 'local', // 'local' | 'nats' | 'redis' | 'kafka'
    config: {
      // For local, no config needed
      // For production, use NATS or Redis:
      // servers: [process.env.NATS_URL || 'nats://localhost:4222']
    }
  },

  // Queue configuration
  queue: {
    type: 'local', // 'local' | 'redis' | 'rabbitmq' | 'sqs'
    config: {
      // For local, no config needed
      // For production:
      // url: process.env.REDIS_URL
    }
  },

  // Database configuration
  databases: {
    primary: {
      type: 'memory', // 'postgres' | 'mongodb' | 'memory'
      config: {
        // For memory storage, no config needed
        // For production PostgreSQL:
        // host: process.env.DB_HOST || 'localhost',
        // port: process.env.DB_PORT || 5432,
        // database: process.env.DB_NAME || 'todo_app',
        // user: process.env.DB_USER || 'postgres',
        // password: process.env.DB_PASSWORD
      }
    },
    
    // Optional cache database
    cache: {
      enabled: false,
      type: 'redis',
      config: {
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      }
    }
  },

  // GraphQL configuration
  graphql: {
    mode: 'monolith', // 'monolith' | 'federated'
    config: {
      introspection: true,
      playground: process.env.NODE_ENV !== 'production',
      tracing: process.env.NODE_ENV === 'development',
      cacheControl: true
    }
  },

  // Runtime configuration
  runtime: {
    type: 'local', // 'local' | 'docker' | 'kubernetes' | 'lambda'
    config: {
      // For local development
      env: process.env.NODE_ENV || 'development'
    }
  },

  // Build configuration
  build: {
    target: 'monolith', // 'monolith' | 'microservices' | 'serverless'
    outputDir: './dist',
    sourceMap: true
  },

  // Feature flags
  features: {
    authentication: true,
    authorization: true,
    logging: true,
    
    // 🆕 Distributed Tracing
    tracing: {
      enabled: process.env.TRACING_ENABLED === 'true',
      provider: process.env.TRACING_PROVIDER || 'native', // 'native' | 'opentelemetry'
      config: {
        serviceName: 'todo-app-monolith',
        exporter: 'console', // 'console' | 'file' | 'http' | 'jaeger'
        // For file exporter:
        // filePath: './traces/trace.jsonl',
        // For Jaeger:
        // endpoint: 'http://localhost:14268/api/traces',
        sampleRate: 1.0 // 100% in development
      }
    },
    
    // 🆕 Metrics
    metrics: {
      enabled: process.env.METRICS_ENABLED === 'true',
      provider: 'prometheus',
      config: {
        port: 9090,
        path: '/metrics'
      }
    },
    
    caching: false,
    rateLimiting: false
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info', // 'error' | 'warn' | 'info' | 'debug'
    format: 'pretty', // 'pretty' | 'json'
    transports: ['console'] // 'console' | 'file' | 'cloudwatch'
  }
};
