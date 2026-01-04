# Smart Bootstrap Generator

The Smart Bootstrap Generator creates concrete, readable infrastructure code from your `boilerplate.config.js` configuration file. Instead of using generic abstractions, it generates specific implementations that are easy to understand and modify.

## Philosophy: Infrastructure as Code

The generated Bootstrap file is **not a generic class** - it's concrete, specific code that shows exactly what's running in your application:

- ✅ **Readable**: See PostgreSQL Pool setup, not generic "Storage" adapter
- ✅ **Minimal**: Only installs packages you actually use
- ✅ **Specific**: Docker/Kubernetes/Lambda get dedicated infrastructure files
- ✅ **Maintainable**: Easy to modify generated code for your needs

## Usage

### 1. Create Configuration

First, create `boilerplate.config.js` (or `.ts`):

```javascript
export default {
  project: {
    name: 'my-app',
    version: '1.0.0',
    description: 'My awesome application',
    type: 'monolith' // or 'microservices', 'serverless'
  },

  services: {
    autoDiscover: true,
    path: 'services'
  },

  transport: {
    type: 'http',
    config: {
      port: 3000,
      graphql: {
        path: '/graphql',
        playground: true
      }
    }
  },

  databases: {
    primary: {
      type: 'postgres',
      config: {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: 5432,
        database: 'myapp',
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD
      }
    },
    cache: {
      enabled: true,
      type: 'redis',
      config: {
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      }
    }
  },

  eventBus: {
    type: 'nats',
    config: {
      servers: [process.env.NATS_URL || 'nats://localhost:4222']
    }
  },

  queue: {
    type: 'redis',
    config: {
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    }
  },

  runtime: {
    type: 'docker', // or 'kubernetes', 'lambda', 'local'
  },

  logging: {
    level: 'info',
    format: 'pretty',
    transports: ['console']
  }
}
```

### 2. Generate Bootstrap

```bash
npx @dualitysol/boilerplate-cli bootstrap
```

Or if installed globally:

```bash
boilerplate bootstrap
```

### 3. Generated Output

The generator creates:

#### `bootstrap.js` (or `.ts`)

Concrete infrastructure code:

```javascript
import { Pool } from 'pg'
import { connect as natsConnect, StringCodec } from 'nats'
import { createClient } from 'redis'
import { Queue, Worker } from 'bullmq'
import { createYoga } from 'graphql-yoga'
import { makeExecutableSchema } from '@graphql-tools/schema'
import pino from 'pino'

// PostgreSQL Connection - Concrete implementation
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: 5432,
  database: 'myapp',
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
})

// Storage API - Direct SQL methods
const storage = {
  async query(sql, params = []) {
    const client = await pool.connect()
    try {
      const result = await client.query(sql, params)
      return result.rows
    } finally {
      client.release()
    }
  },
  
  async findOne(table, filter) {
    const keys = Object.keys(filter)
    const where = keys.map((k, i) => `${k} = $${i + 1}`).join(' AND ')
    const values = keys.map(k => filter[k])
    const sql = `SELECT * FROM ${table} WHERE ${where} LIMIT 1`
    const rows = await this.query(sql, values)
    return rows[0] || null
  },
  
  // ... more concrete methods
}

// Redis Cache - Concrete implementation
const redisClient = createClient({ url: 'redis://localhost:6379' })
await redisClient.connect()

const cache = {
  async get(key) {
    return JSON.parse(await redisClient.get(key))
  },
  async set(key, value, ttl = 3600) {
    await redisClient.setEx(key, ttl, JSON.stringify(value))
  },
  async del(key) {
    await redisClient.del(key)
  }
}

// NATS EventBus - Concrete implementation
const nc = await natsConnect({ servers: ['nats://localhost:4222'] })
const sc = StringCodec()

const eventBus = {
  handlers: new Map(),
  async publish(event, data) {
    nc.publish(event, sc.encode(JSON.stringify(data)))
  },
  async subscribe(event, handler) {
    this.handlers.set(event, handler)
    const sub = nc.subscribe(event)
    for await (const m of sub) {
      const data = JSON.parse(sc.decode(m.data))
      await handler(data)
    }
  }
}

// ... more concrete implementations

export async function bootstrap() {
  // Start the application
}
```

#### Dependencies

Only the packages you actually use:

```json
{
  "dependencies": {
    "pg": "^8.11.0",
    "redis": "^4.6.0",
    "nats": "^2.15.0",
    "bullmq": "^5.0.0",
    "graphql": "^16.8.0",
    "graphql-yoga": "^5.1.1",
    "@graphql-tools/schema": "^10.0.0",
    "pino": "^8.17.0"
  }
}
```

**NOT** installed: `mongodb`, `rabbitmq`, `kafka`, etc. (because you don't use them)

#### Infrastructure Files

Depending on `runtime.type`:

**Docker** (`infrastructure/docker/`):
- `Dockerfile` - Multi-stage build
- `docker-compose.yml` - With postgres, nats, redis services
- `index.js` - Entry point that imports bootstrap

**Kubernetes** (`infrastructure/kubernetes/`):
- `deployment.yaml` - K8s deployment
- `service.yaml` - K8s service
- `index.js` - Entry point with graceful shutdown

**Lambda** (`infrastructure/lambda/`):
- `handler.js` - Lambda handler with container reuse
- `serverless.yml` - Serverless Framework config

## Configuration Options

### Project Type

```javascript
project: {
  type: 'monolith' | 'microservices' | 'serverless'
}
```

### Transport Types

```javascript
transport: {
  type: 'http' | 'websocket' | 'nats' | 'grpc' | 'lambda'
}
```

### Database Types

```javascript
databases: {
  primary: {
    type: 'postgres' | 'mongodb' | 'mysql' | 'dynamodb' | 'memory'
  }
}
```

### Cache Types

```javascript
databases: {
  cache: {
    type: 'redis' | 'memcached' | 'memory'
  }
}
```

### EventBus Types

```javascript
eventBus: {
  type: 'local' | 'nats' | 'redis' | 'kafka' | 'rabbitmq'
}
```

### Queue Types

```javascript
queue: {
  type: 'local' | 'redis' | 'rabbitmq' | 'sqs'
}
```

### Runtime Types

```javascript
runtime: {
  type: 'local' | 'docker' | 'kubernetes' | 'lambda'
}
```

## Benefits

### 1. Clarity

Instead of this (generic):
```javascript
const storage = new Storage({ type: 'postgres' })
```

You get this (concrete):
```javascript
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  // ... actual configuration
})

const storage = {
  async query(sql, params) {
    // Actual PostgreSQL query
  }
}
```

### 2. Smaller Bundles

- **Before**: 50+ MB (all possible dependencies)
- **After**: 10 MB (only what you use)

### 3. Better TypeScript

Concrete types instead of generic interfaces:

```typescript
// Concrete PostgreSQL types
import { Pool, QueryResult } from 'pg'

// Not generic Storage<T> interface
```

### 4. Easy Customization

Generated code is **yours to modify**:

```javascript
// Add custom PostgreSQL method
const storage = {
  async query(sql, params) { /* ... */ },
  
  // Add your own method!
  async customQuery(userId) {
    return this.query(
      'SELECT * FROM users WHERE id = $1 AND active = true',
      [userId]
    )
  }
}
```

### 5. Deployment Clarity

Each runtime gets specific infrastructure:

- `infrastructure/docker/` - For Docker deployments
- `infrastructure/kubernetes/` - For K8s deployments
- `infrastructure/lambda/` - For serverless

**No guessing** what infrastructure is needed!

## Examples

### Todo App (Monolith)

```javascript
export default {
  project: {
    type: 'monolith'
  },
  transport: {
    type: 'http',
    config: { port: 4000 }
  },
  databases: {
    primary: { type: 'memory' } // Simple in-memory storage
  },
  eventBus: {
    type: 'local' // No external dependency
  },
  queue: {
    type: 'local'
  },
  runtime: {
    type: 'local'
  }
}
```

Generates: **Only** `graphql`, `graphql-yoga` dependencies!

### E-commerce (Microservices)

```javascript
export default {
  project: {
    type: 'microservices'
  },
  transport: {
    type: 'nats' // Service-to-service via NATS
  },
  databases: {
    primary: { type: 'postgres' },
    cache: { type: 'redis', enabled: true }
  },
  eventBus: {
    type: 'nats'
  },
  queue: {
    type: 'redis'
  },
  runtime: {
    type: 'kubernetes'
  }
}
```

Generates: `pg`, `redis`, `nats`, `bullmq` + K8s infrastructure!

### Serverless API (Lambda)

```javascript
export default {
  project: {
    type: 'serverless'
  },
  transport: {
    type: 'lambda'
  },
  databases: {
    primary: { type: 'dynamodb' }
  },
  runtime: {
    type: 'lambda'
  }
}
```

Generates: `aws-sdk` (DynamoDB) + Lambda handler + serverless.yml!

## Migration from Old Bootstrap

### Old Approach (Generic)

```javascript
import { Bootstrap } from '@dualitysol/boilerplate'

const app = new Bootstrap({
  // Generic config
})
```

### New Approach (Infrastructure as Code)

1. Create `boilerplate.config.js`
2. Run `boilerplate bootstrap`
3. Use generated concrete code:

```javascript
import { bootstrap } from './bootstrap.js'

bootstrap()
```

## Best Practices

### 1. Version Control Bootstrap

**DO** commit `bootstrap.js` to git - it's your infrastructure!

```bash
git add bootstrap.js
git commit -m "chore: update bootstrap with Redis cache"
```

### 2. Regenerate on Config Changes

```bash
# After changing boilerplate.config.js
boilerplate bootstrap
```

### 3. Customize Freely

The generated code is **yours**. Modify it as needed:

```javascript
// bootstrap.js - Your modifications are safe

// Add custom setup
const storage = {
  async query(sql, params) { /* ... */ },
  
  // Your custom method
  async healthCheck() {
    try {
      await this.query('SELECT 1')
      return true
    } catch {
      return false
    }
  }
}
```

### 4. Environment-Specific Infrastructure

Use different configs for different environments:

```bash
# Development
boilerplate bootstrap

# Production (different config)
cp boilerplate.config.prod.js boilerplate.config.js
boilerplate bootstrap
```

## Troubleshooting

### Missing Dependencies

If you see import errors:

```bash
npm install
```

The generator updates `package.json`, but you need to install.

### Wrong Infrastructure

Check your `runtime.type` in config:

```javascript
runtime: {
  type: 'docker' // Should match your deployment target
}
```

### Outdated Bootstrap

Regenerate after config changes:

```bash
boilerplate bootstrap
```

## Summary

The Smart Bootstrap Generator transforms your declarative configuration into concrete, readable infrastructure code. This gives you:

- **Clarity**: See exactly what's running
- **Control**: Modify generated code freely
- **Efficiency**: Only install what you need
- **Deployment**: Infrastructure files for each runtime

**Infrastructure as Code** - but for application bootstrapping! 🚀
