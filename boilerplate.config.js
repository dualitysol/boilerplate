/**
 * Boilerplate Configuration File
 * 
 * This file defines the project structure, dependencies, and infrastructure.
 * Used by CLI tools to generate appropriate boilerplate and build scripts.
 */

export default {
  // Project metadata
  project: {
    name: '@dualitysol/boilerplate',
    version: '1.0.0',
    type: 'framework', // 'monolith' | 'microservices' | 'serverless' | 'framework'
  },

  // Services configuration
  services: {
    // Auto-discover services from /services directory
    autoDiscover: true,
    
    // Or manually define services
    list: [
      // {
      //   name: 'UserService',
      //   path: './services/UserService',
      //   enabled: true
      // }
    ],
  },

  // Transport layer configuration
  transport: {
    // 'http' | 'websocket' | 'grpc' | 'nats' | 'lambda' | 'hybrid'
    type: 'http',
    
    // HTTP/WebSocket config
    http: {
      port: 4000,
      cors: {
        enabled: true,
        origins: ['*']
      }
    },
    
    websocket: {
      enabled: false,
      port: 4001
    },
    
    // NATS config
    nats: {
      enabled: false,
      url: 'nats://localhost:4222',
      cluster: {
        enabled: false,
        servers: []
      }
    },
    
    // gRPC config
    grpc: {
      enabled: false,
      port: 50051
    }
  },

  // Event Bus configuration
  eventBus: {
    // 'local' | 'nats' | 'redis' | 'kafka' | 'rabbitmq'
    backend: 'local',
    
    nats: {
      url: 'nats://localhost:4222'
    },
    
    redis: {
      host: 'localhost',
      port: 6379
    },
    
    kafka: {
      brokers: ['localhost:9092']
    }
  },

  // Queue configuration
  queue: {
    // 'local' | 'redis' | 'rabbitmq' | 'sqs'
    backend: 'local',
    
    redis: {
      host: 'localhost',
      port: 6379
    },
    
    rabbitmq: {
      url: 'amqp://localhost:5672'
    },
    
    sqs: {
      region: 'us-east-1',
      queueUrl: ''
    }
  },

  // Database configuration
  databases: {
    primary: {
      // 'postgres' | 'mongodb' | 'mysql' | 'sqlite' | 'memory'
      type: 'memory',
      
      postgres: {
        host: 'localhost',
        port: 5432,
        database: 'myapp',
        user: 'postgres',
        password: 'password',
        pool: {
          min: 2,
          max: 10
        }
      },
      
      mongodb: {
        url: 'mongodb://localhost:27017',
        database: 'myapp'
      }
    },
    
    cache: {
      type: 'redis',
      redis: {
        host: 'localhost',
        port: 6379,
        ttl: 3600
      }
    }
  },

  // GraphQL configuration
  graphql: {
    enabled: true,
    
    // 'monolith' | 'federated' | 'stitching'
    mode: 'monolith',
    
    playground: {
      enabled: true,
      path: '/graphql'
    },
    
    codegen: {
      enabled: true,
      watch: false
    },
    
    // Federation config (for microservices)
    federation: {
      enabled: false,
      gateway: {
        port: 4000,
        services: []
      }
    }
  },

  // Runtime configuration
  runtime: {
    // 'local' | 'docker' | 'kubernetes' | 'lambda' | 'cloudrun'
    environment: 'local',
    
    local: {
      hotReload: true,
      cluster: false
    },
    
    docker: {
      baseImage: 'node:18-alpine',
      compose: true
    },
    
    kubernetes: {
      namespace: 'default',
      replicas: 3
    },
    
    lambda: {
      runtime: 'nodejs18.x',
      memory: 1024,
      timeout: 30
    }
  },

  // Build configuration
  build: {
    // 'babel' | 'esbuild' | 'webpack' | 'rollup'
    bundler: 'babel',
    
    output: './dist',
    
    targets: {
      node: '18'
    },
    
    sourceMaps: true,
    minify: false
  },

  // Plugins and middleware
  plugins: [
    // '@dualitysol/plugin-auth',
    // '@dualitysol/plugin-logging',
  ],

  // Feature flags
  features: {
    typescript: true,
    authentication: false,
    authorization: false,
    logging: true,
    monitoring: false,
    tracing: false
  }
};
