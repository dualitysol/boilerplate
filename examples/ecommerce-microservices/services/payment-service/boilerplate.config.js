/**
 * Payment Service Configuration
 * @dualitysol/boilerplate microservice configuration
 */

module.exports = {
  service: {
    name: 'payment-service',
    version: '1.0.0',
    port: process.env.PORT || 4004,
    host: process.env.HOST || '0.0.0.0'
  },

  features: {
    // Distributed Tracing
    tracing: {
      enabled: process.env.TRACING_ENABLED === 'true',
      provider: process.env.TRACING_PROVIDER || 'opentelemetry',
      config: {
        serviceName: 'payment-service',
        serviceVersion: '1.0.0',
        endpoint: process.env.OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
        exporter: process.env.TRACE_EXPORTER || 'console',
        sampleRate: parseFloat(process.env.TRACE_SAMPLE_RATE || '1.0'),
        attributes: {
          environment: process.env.NODE_ENV || 'development',
          service: 'payment-service'
        }
      }
    },

    // Metrics
    metrics: {
      enabled: process.env.METRICS_ENABLED === 'true',
      provider: 'prometheus',
      config: {
        port: process.env.METRICS_PORT || 9094,
        path: '/metrics',
        defaultLabels: {
          service: 'payment-service',
          environment: process.env.NODE_ENV || 'development'
        }
      }
    }
  },

  // Database Configuration
  databases: {
    primary: {
      type: process.env.DB_TYPE || 'memory',
      config: {
        url: process.env.DATABASE_URL || 'mongodb://localhost:27017/ecommerce_payments',
        options: {
          useNewUrlParser: true,
          useUnifiedTopology: true
        }
      }
    },
    
    cache: {
      enabled: process.env.CACHE_ENABLED === 'true',
      type: process.env.CACHE_TYPE || 'memory',
      config: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        ttl: 600 // 10 minutes (payments should be recent)
      }
    }
  },

  // Event Bus Configuration
  eventBus: {
    type: process.env.EVENT_BUS_TYPE || 'nats',
    config: {
      servers: (process.env.NATS_SERVERS || 'nats://localhost:4222').split(','),
      reconnect: true,
      maxReconnectAttempts: 10
    }
  },

  // Queue Configuration
  queue: {
    type: process.env.QUEUE_TYPE || 'memory',
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

  // Payment Providers
  paymentProviders: {
    stripe: {
      enabled: process.env.STRIPE_ENABLED === 'true',
      secretKey: process.env.STRIPE_SECRET_KEY,
      publicKey: process.env.STRIPE_PUBLIC_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
    },
    paypal: {
      enabled: process.env.PAYPAL_ENABLED === 'true',
      clientId: process.env.PAYPAL_CLIENT_ID,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET,
      mode: process.env.PAYPAL_MODE || 'sandbox' // 'sandbox' or 'live'
    }
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json'
  }
}
