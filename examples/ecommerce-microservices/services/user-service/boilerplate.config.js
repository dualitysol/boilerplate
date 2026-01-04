/**
 * User Service Configuration
 * @dualitysol/boilerplate microservice configuration
 */

module.exports = {
  service: {
    name: 'user-service',
    version: '1.0.0',
    port: process.env.PORT || 4001,
    host: process.env.HOST || '0.0.0.0'
  },

  features: {
    // Distributed Tracing
    tracing: {
      enabled: process.env.TRACING_ENABLED === 'true',
      provider: process.env.TRACING_PROVIDER || 'opentelemetry', // 'native' or 'opentelemetry'
      config: {
        serviceName: 'user-service',
        serviceVersion: '1.0.0',
        
        // For OpenTelemetry
        endpoint: process.env.OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
        
        // For native tracing
        exporter: process.env.TRACE_EXPORTER || 'console', // 'console', 'file', 'jaeger'
        
        // Sampling
        sampleRate: parseFloat(process.env.TRACE_SAMPLE_RATE || '1.0'),
        
        // Additional attributes
        attributes: {
          environment: process.env.NODE_ENV || 'development',
          service: 'user-service'
        }
      }
    },

    // Metrics
    metrics: {
      enabled: process.env.METRICS_ENABLED === 'true',
      provider: 'prometheus',
      config: {
        port: process.env.METRICS_PORT || 9091,
        path: '/metrics',
        defaultLabels: {
          service: 'user-service',
          environment: process.env.NODE_ENV || 'development'
        }
      }
    }
  },

  // Database Configuration
  databases: {
    primary: {
      type: process.env.DB_TYPE || 'memory', // 'mongodb', 'postgresql', 'mysql', 'memory'
      config: {
        url: process.env.DATABASE_URL || 'mongodb://localhost:27017/ecommerce_users',
        options: {
          useNewUrlParser: true,
          useUnifiedTopology: true
        }
      }
    },
    
    // Cache
    cache: {
      enabled: process.env.CACHE_ENABLED === 'true',
      type: process.env.CACHE_TYPE || 'memory', // 'redis', 'memory'
      config: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        ttl: 3600 // 1 hour default TTL
      }
    }
  },

  // Event Bus Configuration (for microservices communication)
  eventBus: {
    type: process.env.EVENT_BUS_TYPE || 'nats', // 'nats', 'redis', 'kafka', 'memory'
    config: {
      servers: (process.env.NATS_SERVERS || 'nats://localhost:4222').split(','),
      reconnect: true,
      maxReconnectAttempts: 10
    }
  },

  // Queue Configuration
  queue: {
    type: process.env.QUEUE_TYPE || 'memory', // 'bullmq', 'memory'
    config: {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
      }
    }
  },

  // GraphQL Configuration
  graphql: {
    playground: process.env.NODE_ENV !== 'production',
    introspection: process.env.NODE_ENV !== 'production',
    tracing: process.env.GRAPHQL_TRACING === 'true',
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }
  },

  // Security
  security: {
    jwt: {
      secret: process.env.JWT_SECRET || 'user-service-secret-change-in-production',
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    },
    bcrypt: {
      rounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10)
    }
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json'
  }
}
