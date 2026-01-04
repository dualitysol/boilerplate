# Tracing & Telemetry Guide

## Overview

The Boilerplate framework includes built-in support for distributed tracing and telemetry, allowing you to monitor and debug your microservices in production.

**Supported Providers:**

- 🔵 **Native Node.js** - Built-in tracing with inspector API
- 🟠 **OpenTelemetry** - Industry-standard observability framework

## Table of Contents

- [Quick Start](#quick-start)
- [Native Node.js Tracing](#native-nodejs-tracing)
- [OpenTelemetry](#opentelemetry)
- [Configuration](#configuration)
- [Manual Instrumentation](#manual-instrumentation)
- [Exporters](#exporters)
- [Best Practices](#best-practices)

## Quick Start

### 1. Configure Tracing

```typescript
// boilerplate.config.ts
export default {
  project: {
    name: 'my-app'
  },
  
  features: {
    tracing: {
      enabled: true,
      provider: 'opentelemetry', // or 'native'
      config: {
        serviceName: 'my-app',
        endpoint: 'http://localhost:4318/v1/traces',
        sampleRate: 1.0 // 100% of traces
      }
    }
  }
}
```

### 2. Enable Tracing in Bootstrap

```typescript
// bootstrap.ts (auto-generated)
import { TracingFactory } from '@dualitysol/boilerplate/tracing'

const tracing = TracingFactory.create(config.features.tracing)
await tracing.enable()
```

### 3. View Traces

Access your traces in:
- **Jaeger**: http://localhost:16686
- **Zipkin**: http://localhost:9411
- **Grafana Tempo**: http://localhost:3000

## Native Node.js Tracing

Uses Node.js built-in `inspector` API for tracing.

### Configuration

```typescript
{
  features: {
    tracing: {
      enabled: true,
      provider: 'native',
      config: {
        serviceName: 'my-service',
        exporter: 'jaeger',        // 'file' | 'console' | 'http' | 'jaeger'
        endpoint: 'http://localhost:14268/api/traces',
        filePath: './traces/trace.jsonl',
        sampleRate: 0.1            // 10% of requests
      }
    }
  }
}
```

### Exporters

#### File Exporter

Writes traces to a file:

```typescript
{
  exporter: 'file',
  filePath: './traces/trace.jsonl'
}
```

Output format (JSONL):
```json
{"serviceName":"my-service","timestamp":"2024-01-15T10:30:00Z","traces":[...]}
{"serviceName":"my-service","timestamp":"2024-01-15T10:31:00Z","traces":[...]}
```

#### Console Exporter

Prints traces to stdout:

```typescript
{
  exporter: 'console'
}
```

#### HTTP Exporter

Sends traces to any HTTP endpoint:

```typescript
{
  exporter: 'http',
  endpoint: 'http://my-collector:9411/api/v2/spans'
}
```

#### Jaeger Exporter

Sends traces directly to Jaeger:

```typescript
{
  exporter: 'jaeger',
  endpoint: 'http://localhost:14268/api/traces'
}
```

### Manual Spans

```typescript
import { NativeTracing } from '@dualitysol/boilerplate/tracing/native'

const tracing = new NativeTracing(config)
await tracing.enable()

// Create a span
const span = tracing.createSpan('database-query', {
  query: 'SELECT * FROM users',
  database: 'postgres'
})

try {
  // Your code here
  await db.query('SELECT * FROM users')
  
  span.setAttribute('rows', 42)
} catch (error) {
  span.setAttribute('error', error.message)
} finally {
  span.end()
}
```

## OpenTelemetry

Industry-standard observability framework with rich ecosystem.

### Installation

OpenTelemetry dependencies are already included in the boilerplate package.

### Configuration

```typescript
{
  features: {
    tracing: {
      enabled: true,
      provider: 'opentelemetry',
      config: {
        serviceName: 'my-service',
        serviceVersion: '1.0.0',
        environment: 'production',
        endpoint: 'http://localhost:4318/v1/traces',
        
        headers: {
          'Authorization': 'Bearer token'
        },
        
        sampleRate: 0.1, // 10% sampling
        
        instrumentations: {
          http: true,        // HTTP requests
          grpc: false,       // gRPC calls
          graphql: true,     // GraphQL operations
          database: true,    // Database queries
          redis: true        // Redis operations
        }
      }
    }
  }
}
```

### Automatic Instrumentation

OpenTelemetry automatically traces:

- ✅ HTTP requests (incoming/outgoing)
- ✅ GraphQL queries and mutations
- ✅ Database queries (PostgreSQL, MongoDB, MySQL)
- ✅ Redis operations
- ✅ gRPC calls

No code changes needed!

### Manual Spans

```typescript
import { OpenTelemetryTracing } from '@dualitysol/boilerplate/tracing/opentelemetry'

const tracing = new OpenTelemetryTracing(config)
await tracing.enable()

// Simple span
const span = tracing.createSpan('operation-name', {
  'custom.attribute': 'value'
})
span.end()

// Active span with context
await tracing.startActiveSpan('complex-operation', async (span) => {
  span.setAttribute('user.id', userId)
  
  try {
    const result = await doWork()
    span.setAttribute('result.count', result.length)
    return result
  } catch (error) {
    // Error is automatically recorded
    throw error
  }
  // Span is automatically ended
})
```

### Service Mesh Integration

OpenTelemetry works seamlessly with service meshes:

```typescript
// Headers are automatically propagated
const response = await fetch('http://other-service/api', {
  headers: {
    // Trace context automatically injected
  }
})
```

## Configuration

### Full Configuration Example

```typescript
// boilerplate.config.ts
import type { BoilerplateConfig } from '@dualitysol/boilerplate/types/config'

const config: BoilerplateConfig = {
  project: {
    name: 'my-microservices',
    type: 'microservices'
  },
  
  features: {
    // Tracing configuration
    tracing: {
      enabled: process.env.NODE_ENV === 'production',
      provider: process.env.TRACING_PROVIDER || 'opentelemetry',
      
      config: {
        serviceName: process.env.SERVICE_NAME || 'my-service',
        serviceVersion: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        
        // OTLP endpoint (Jaeger, Tempo, etc.)
        endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
        
        // Optional headers for authentication
        headers: process.env.OTEL_HEADERS ? JSON.parse(process.env.OTEL_HEADERS) : {},
        
        // Sampling rate (0.0 to 1.0)
        sampleRate: parseFloat(process.env.TRACE_SAMPLE_RATE || '1.0'),
        
        // Enable specific instrumentations
        instrumentations: {
          http: true,
          grpc: process.env.ENABLE_GRPC === 'true',
          graphql: true,
          database: true,
          redis: process.env.CACHE_TYPE === 'redis'
        }
      }
    },
    
    // Metrics configuration
    metrics: {
      enabled: true,
      provider: 'prometheus',
      config: {
        port: 9090,
        path: '/metrics'
      }
    }
  }
}

export default config
```

### Environment Variables

```bash
# .env
NODE_ENV=production
SERVICE_NAME=user-service
TRACING_PROVIDER=opentelemetry

# OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318/v1/traces
TRACE_SAMPLE_RATE=0.1

# Optional: Authentication
OTEL_HEADERS='{"Authorization":"Bearer secret-token"}'
```

## Manual Instrumentation

### In Services

```typescript
// services/UserService/model/index.ts
import { Microservice } from '@dualitysol/boilerplate'

export class UserService extends Microservice {
  async getUser(id: string, context: any) {
    // Get tracer from context
    const tracer = this.tracer
    
    if (!tracer) {
      // Tracing disabled, proceed normally
      return this.findOne({ _id: id })
    }
    
    // Create span
    return tracer.startActiveSpan('UserService.getUser', async (span) => {
      span.setAttribute('user.id', id)
      
      try {
        const user = await this.findOne({ _id: id })
        span.setAttribute('user.found', !!user)
        return user
      } catch (error) {
        span.recordException(error)
        throw error
      }
    })
  }
}
```

### In Resolvers

```typescript
// services/UserService/resolvers/index.ts
export const UserResolvers = {
  Query: {
    async user(_, { id }, { services, tracer }) {
      if (!tracer) {
        return services.UserService.getUser(id)
      }
      
      return tracer.startActiveSpan('Resolver:user', async (span) => {
        span.setAttribute('graphql.operation', 'query')
        span.setAttribute('graphql.field', 'user')
        span.setAttribute('user.id', id)
        
        const user = await services.UserService.getUser(id)
        span.setAttribute('user.found', !!user)
        
        return user
      })
    }
  }
}
```

### Custom Attributes

```typescript
span.setAttribute('http.method', 'GET')
span.setAttribute('http.url', '/api/users/123')
span.setAttribute('http.status_code', 200)
span.setAttribute('user.authenticated', true)
span.setAttribute('cache.hit', false)
span.setAttribute('db.query', 'SELECT * FROM users')
span.setAttribute('error', false)
```

### Events

```typescript
span.addEvent('cache-miss', {
  'cache.key': 'user:123',
  'cache.ttl': 3600
})

span.addEvent('database-query', {
  'db.statement': 'SELECT * FROM users WHERE id = $1',
  'db.params': [123]
})

span.addEvent('external-api-call', {
  'http.url': 'https://api.external.com/users',
  'http.method': 'POST'
})
```

## Exporters

### Jaeger

Run Jaeger locally:

```bash
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest
```

Configuration:
```typescript
{
  endpoint: 'http://localhost:4318/v1/traces'
}
```

View traces: http://localhost:16686

### Grafana Tempo

Run Tempo locally:

```bash
docker run -d --name tempo \
  -p 3200:3200 \
  -p 4318:4318 \
  grafana/tempo:latest
```

Configuration:
```typescript
{
  endpoint: 'http://localhost:4318/v1/traces'
}
```

### Zipkin

Run Zipkin locally:

```bash
docker run -d --name zipkin \
  -p 9411:9411 \
  openzipkin/zipkin:latest
```

Configuration:
```typescript
{
  endpoint: 'http://localhost:9411/api/v2/spans'
}
```

### Cloud Providers

#### AWS X-Ray

```typescript
{
  endpoint: 'https://xray.us-east-1.amazonaws.com',
  headers: {
    'X-Amzn-Trace-Id': 'Root=...'
  }
}
```

#### Google Cloud Trace

```typescript
{
  endpoint: 'https://cloudtrace.googleapis.com/v2/projects/PROJECT_ID/traces',
  headers: {
    'Authorization': 'Bearer ' + process.env.GOOGLE_CLOUD_TOKEN
  }
}
```

#### Datadog

```typescript
{
  endpoint: 'https://trace.agent.datadoghq.com/v0.4/traces',
  headers: {
    'DD-API-KEY': process.env.DATADOG_API_KEY
  }
}
```

## Best Practices

### 1. Use Sampling in Production

Don't trace every request in production:

```typescript
{
  sampleRate: 0.1 // 10% of requests
}
```

### 2. Add Meaningful Attributes

```typescript
// ✅ Good
span.setAttribute('user.id', userId)
span.setAttribute('product.sku', productSku)
span.setAttribute('cart.total', total)

// ❌ Bad
span.setAttribute('data', JSON.stringify(data))
```

### 3. Use Consistent Naming

```typescript
// ✅ Good
'UserService.getUser'
'OrderService.createOrder'
'PaymentService.processPayment'

// ❌ Bad
'get user'
'create'
'payment'
```

### 4. Trace Slow Operations

```typescript
const span = tracer.startSpan('database-query')
const start = Date.now()

const result = await db.query(sql)

const duration = Date.now() - start
span.setAttribute('db.duration_ms', duration)

if (duration > 1000) {
  span.addEvent('slow-query', { threshold: 1000 })
}

span.end()
```

### 5. Handle Errors Properly

```typescript
try {
  const result = await operation()
  span.setStatus({ code: SpanStatusCode.OK })
  return result
} catch (error) {
  span.recordException(error)
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: error.message
  })
  throw error
}
```

### 6. Propagate Context

Always pass context between services:

```typescript
// Service A
const headers = {}
propagation.inject(context.active(), headers)

await fetch('http://service-b', { headers })

// Service B - context is automatically extracted
```

## Troubleshooting

### Issue: No Traces Appearing

**Check:**
1. Is tracing enabled? `features.tracing.enabled = true`
2. Is exporter endpoint correct?
3. Is sampling rate too low? Try `sampleRate: 1.0`
4. Check console for errors

### Issue: Too Many Traces

**Solution:**
Reduce sample rate:
```typescript
{ sampleRate: 0.1 } // 10%
```

### Issue: Missing Spans

**Solution:**
Enable specific instrumentations:
```typescript
{
  instrumentations: {
    http: true,
    graphql: true,
    database: true
  }
}
```

### Issue: High Memory Usage

**Solution:**
1. Reduce sample rate
2. Use batch span processor (default)
3. Increase export interval

## Summary

Tracing gives you:

✅ **Visibility** - See request flow across services  
✅ **Performance** - Identify slow operations  
✅ **Debugging** - Find errors quickly  
✅ **Monitoring** - Track SLAs and SLOs  
✅ **Optimization** - Data-driven improvements  

Choose **Native** for simple setups, **OpenTelemetry** for production! 🚀
