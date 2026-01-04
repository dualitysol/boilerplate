/**
 * Example: Full-Featured Boilerplate Configuration
 * Demonstrates entity-first development and tracing
 */

import type { BoilerplateConfig } from '@dualitysol/boilerplate/types/config'

const config: BoilerplateConfig = {
  project: {
    name: 'ecommerce-platform',
    type: 'microservices',
    version: '1.0.0',
    description: 'E-commerce platform with entity-first development and distributed tracing'
  },

  services: {
    path: 'services',
    list: [
      'ProductService',
      'UserService',
      'OrderService',
      'PaymentService',
      'NotificationService'
    ],
    discovery: {
      enabled: true,
      method: 'config'
    }
  },

  databases: {
    primary: {
      type: 'mongodb',
      config: {
        url: process.env.MONGODB_URL || 'mongodb://localhost:27017/ecommerce',
        options: {
          maxPoolSize: 10
        }
      }
    },
    cache: {
      enabled: true,
      type: 'redis',
      config: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: 0
      }
    }
  },

  transport: {
    type: 'http',
    config: {
      host: process.env.HOST || '0.0.0.0',
      port: parseInt(process.env.PORT || '4000')
    }
  },

  graphql: {
    path: '/graphql',
    playground: process.env.NODE_ENV !== 'production',
    introspection: process.env.NODE_ENV !== 'production',
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }
  },

  eventBus: {
    type: 'redis',
    config: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    }
  },

  queue: {
    type: 'redis',
    config: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    }
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    transports: process.env.NODE_ENV === 'production' ? ['cloudwatch'] : ['console']
  },

  features: {
    authentication: true,
    authorization: true,
    
    // 🆕 Distributed Tracing Configuration
    tracing: {
      enabled: process.env.TRACING_ENABLED === 'true',
      provider: process.env.TRACING_PROVIDER || 'opentelemetry', // 'native' | 'opentelemetry'
      
      config: {
        // Service identification
        serviceName: process.env.SERVICE_NAME || 'ecommerce-platform',
        serviceVersion: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        
        // OpenTelemetry Collector endpoint (Jaeger, Tempo, etc.)
        endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
        
        // Optional: Authentication headers
        headers: process.env.OTEL_HEADERS ? JSON.parse(process.env.OTEL_HEADERS) : {},
        
        // Sampling (0.0 to 1.0)
        // 1.0 = 100% of requests (dev), 0.1 = 10% (production)
        sampleRate: parseFloat(process.env.TRACE_SAMPLE_RATE || '1.0'),
        
        // Enable specific instrumentations
        instrumentations: {
          http: true,              // HTTP requests
          grpc: false,             // gRPC (if using gRPC transport)
          graphql: true,           // GraphQL operations
          database: true,          // Database queries
          redis: true              // Redis operations
        }
      }
    },
    
    // 🆕 Metrics Configuration
    metrics: {
      enabled: true,
      provider: 'prometheus',
      config: {
        port: 9090,
        path: '/metrics',
        prefix: 'ecommerce_'
      }
    },
    
    caching: true,
    rateLimiting: true,
    cors: true,
    compression: true
  },

  runtime: {
    type: 'local', // 'local' | 'docker' | 'kubernetes' | 'lambda'
    config: {
      workers: process.env.WORKERS ? parseInt(process.env.WORKERS) : 1
    }
  }
}

export default config
