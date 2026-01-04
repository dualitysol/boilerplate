# Boilerplate Unification Guide

This guide explains the unified approach to building microservices with @dualitysol/boilerplate.

## Table of Contents

1. [Project Initialization](#project-initialization)
2. [Unified Configuration](#unified-configuration)
3. [Auto-Discovery](#auto-discovery)
4. [Health Checks](#health-checks)
5. [Type Generation](#type-generation)
6. [Environment Variables](#environment-variables)

---

## Project Initialization

### Quick Start

Initialize a new project using the interactive CLI:

```bash
npx @dualitysol/boilerplate init
```

Or with flags:

```bash
npx @dualitysol/boilerplate init \
  --name my-app \
  --template microservices \
  --typescript \
  --auth \
  --tracing
```

### Available Templates

#### 1. Monolithic Application

Single application with all services in one codebase.

```bash
boilerplate init --template monolith --name my-monolith
```

**Structure:**
```
my-monolith/
├── services/
│   ├── UserService/
│   ├── NotificationService/
│   └── ...
├── src/
│   └── index.js
└── boilerplate.config.js
```

#### 2. Microservices Architecture

Multiple independent services with service registry.

```bash
boilerplate init --template microservices --name my-services
```

**Structure:**
```
my-services/
├── services/
│   ├── UserService/
│   ├── NotificationService/
│   └── ...
├── gateway/
│   └── index.js
└── docker-compose.yml
```

#### 3. Serverless (AWS Lambda)

Serverless functions for AWS Lambda.

```bash
boilerplate init --template serverless --name my-lambda
```

**Structure:**
```
my-lambda/
├── functions/
│   ├── user-handler/
│   └── notification-handler/
└── serverless.yml
```

#### 4. Minimal Setup

Basic boilerplate with minimal configuration.

```bash
boilerplate init --template minimal --name my-minimal
```

---

## Unified Configuration

### ConfigLoader

All projects use a unified configuration system with environment variable support.

#### Basic Usage

**boilerplate.config.js:**
```javascript
export default {
  project: {
    name: 'my-app',
    version: '1.0.0'
  },
  
  database: {
    type: 'mongodb',
    url: process.env.DATABASE_URL || 'mongodb://localhost:27017'
  },
  
  transport: {
    type: 'http',
    http: {
      port: process.env.PORT || 4000
    }
  }
};
```

#### Advanced Configuration

**With Auto-Discovery:**
```javascript
export default {
  services: {
    autoDiscover: {
      enabled: true,
      pattern: 'services/**/index.js',
      excludePatterns: ['**/test/**', '**/node_modules/**']
    }
  },
  
  health: {
    enabled: true,
    endpoint: '/health',
    checks: {
      database: true,
      eventBus: true,
      memory: true
    }
  },
  
  tracing: {
    enabled: process.env.TRACING_ENABLED === 'true',
    type: 'opentelemetry',
    serviceName: 'my-app',
    exporters: {
      jaeger: {
        endpoint: process.env.JAEGER_ENDPOINT
      }
    }
  }
};
```

#### Loading Config in Bootstrap

```javascript
import { Bootstrap } from '@dualitysol/boilerplate';

// From file path
const bootstrap = await Bootstrap.create('./boilerplate.config.js');
await bootstrap.initialize();

// Or from object
const bootstrap = await Bootstrap.create({
  project: { name: 'my-app' },
  // ... config
});
```

---

## Auto-Discovery

Auto-discovery automatically finds and registers services based on file patterns.

### Enable Auto-Discovery

**boilerplate.config.js:**
```javascript
export default {
  services: {
    autoDiscover: {
      enabled: true,
      pattern: 'services/**/*Service.js',
      excludePatterns: ['**/test/**']
    }
  }
};
```

### Service Structure

Each service should follow this structure:

```
services/
└── UserService/
    ├── entity/
    │   └── User.js
    ├── service/
    │   └── UserService.js
    ├── resolvers/
    │   └── index.js
    ├── typeDefinitions/
    │   └── index.gql
    └── index.js (exports UserService)
```

### Service Example

**services/UserService/service/UserService.js:**
```javascript
import { Microservice } from '@dualitysol/boilerplate';

/**
 * User Service
 * @service
 */
export class UserService extends Microservice {
  get collectionName() {
    return 'users';
  }

  async initialize() {
    this.info('UserService initialized');
  }

  async createUser(input) {
    return await this.createOne(input);
  }
}
```

**services/UserService/index.js:**
```javascript
export { UserService } from './service/UserService.js';
export { resolvers } from './resolvers/index.js';
export { default as typeDefs } from './typeDefinitions/index.gql';
```

### Type-Safe Service Registry

Auto-discovery generates TypeScript types:

**types/service-registry.d.ts:**
```typescript
import type { UserService } from '../services/UserService';
import type { NotificationService } from '../services/NotificationService';

export interface ServiceRegistry {
  UserService: UserService;
  NotificationService: NotificationService;
}

export type ServiceName = keyof ServiceRegistry;
```

### Usage in Code

```javascript
// Type-safe service access
const user = await this.services.UserService.createUser({ name: 'John' });

// Or with types
/** @type {import('./types/service-registry').ServiceRegistry} */
const services = this.services;
```

---

## Health Checks

Every service gets built-in health check endpoints.

### Health Endpoints

- `GET /health` - Basic health status
- `GET /health/live` - Liveness probe (Kubernetes)
- `GET /health/ready` - Readiness probe (Kubernetes)
- `GET /health/detailed` - Detailed component health

### Configuration

**boilerplate.config.js:**
```javascript
export default {
  health: {
    enabled: true,
    endpoint: '/health',
    timeout: 5000,
    checks: {
      database: true,
      eventBus: true,
      queue: true,
      memory: true,
      uptime: true
    }
  }
};
```

### Custom Health Checks

```javascript
import { HealthCheckBuilder } from '@dualitysol/boilerplate';

// In Bootstrap
bootstrap.healthCheck.register(
  'custom-api',
  HealthCheckBuilder.dependency('https://api.example.com/health')
);

// Custom check function
bootstrap.healthCheck.register('custom-logic', async () => {
  const isHealthy = await checkSomething();
  
  return {
    status: isHealthy ? 'UP' : 'DOWN',
    details: { /* ... */ }
  };
});
```

### Health Response Example

```json
{
  "service": "my-app",
  "status": "UP",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "duration": "15ms",
  "checks": [
    {
      "name": "database",
      "status": "UP",
      "duration": "5ms",
      "type": "mongodb",
      "responseTime": "5ms"
    },
    {
      "name": "memory",
      "status": "UP",
      "heapUsed": "45MB",
      "heapTotal": "128MB",
      "heapPercent": "35.16%"
    }
  ]
}
```

### Kubernetes Integration

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: my-app
        livenessProbe:
          httpGet:
            path: /health/live
            port: 4000
          initialDelaySeconds: 30
          periodSeconds: 10
        
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 4000
          initialDelaySeconds: 10
          periodSeconds: 5
```

---

## Type Generation

Automatically generate TypeScript types from JSDoc comments.

### Quick Start

```bash
# Generate types from JSDoc
npm run types:generate

# Watch mode (auto-regenerate on changes)
npm run types:watch
```

### Writing JSDoc for Type Generation

```javascript
/**
 * Create a new user
 * @param {Object} input - User creation data
 * @param {string} input.name - User's full name
 * @param {string} input.email - User's email address
 * @param {number} [input.age] - User's age (optional)
 * @param {string[]} [input.tags] - User tags
 * @returns {Promise<Object>}
 */
async createUser(input) {
  return await this.createOne(input);
}
```

### Generated Types

**types/UserService/requests/createUserInput.d.ts:**
```typescript
export interface CreateUserInput {
  /** User's full name */
  name: string;
  
  /** User's email address */
  email: string;
  
  /** User's age (optional) */
  age?: number;
  
  /** User tags */
  tags?: string[];
}
```

### Auto-Import

Types are automatically imported back into JSDoc:

```javascript
/**
 * Create a new user
 * @param {import('../../types/UserService/requests/createUserInput.js').CreateUserInput} input
 * @returns {Promise<Object>}
 */
async createUser(input) {
  return await this.createOne(input);
}
```

---

## Environment Variables

### Standard Environment Variables

All projects support these environment variables:

#### Database
```env
DATABASE_URL=mongodb://localhost:27017
DATABASE_NAME=my-app
DATABASE_POOL_SIZE=10
```

#### Transport
```env
PORT=4000
HOST=0.0.0.0
TRANSPORT_TYPE=http
```

#### Tracing
```env
TRACING_ENABLED=true
JAEGER_ENDPOINT=http://localhost:14268/api/traces
TRACING_SERVICE_NAME=my-app
```

#### Logging
```env
LOG_LEVEL=info
LOG_FORMAT=json
LOG_PRETTY=true
```

#### Security
```env
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1d
CORS_ORIGIN=*
```

### Generate .env.example

```javascript
import { ConfigLoader } from '@dualitysol/boilerplate';

await ConfigLoader.generateEnvExample('.env.example');
```

### Environment Priority

1. Environment variables (highest priority)
2. `.env` file
3. Config file values
4. Default values (lowest priority)

---

## Best Practices

### 1. Project Structure

```
my-app/
├── services/              # All service modules
│   ├── UserService/
│   ├── NotificationService/
│   └── ...
├── src/
│   └── index.js          # Application entry point
├── types/                # Auto-generated TypeScript types
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── infrastructure/
│   ├── docker/
│   └── kubernetes/
├── boilerplate.config.js # Unified configuration
├── .env.example          # Environment template
└── package.json
```

### 2. Configuration

- ✅ Use environment variables for secrets and deployment-specific values
- ✅ Keep sensitive data out of config files
- ✅ Use `ConfigLoader` for unified config management
- ✅ Generate `.env.example` for documentation

### 3. Services

- ✅ One service per directory
- ✅ Follow naming convention: `*Service.js`
- ✅ Export from `index.js`
- ✅ Use JSDoc for type generation
- ✅ Implement `initialize()` method

### 4. Health Checks

- ✅ Enable health checks in production
- ✅ Configure readiness probes for dependencies
- ✅ Use liveness probes for Kubernetes
- ✅ Add custom checks for critical dependencies

### 5. Type Safety

- ✅ Run `types:generate` after changing JSDoc
- ✅ Use `types:watch` during development
- ✅ Import generated types in your code
- ✅ Enable TypeScript checking in VSCode

---

## Migration Guide

### From Old Boilerplate

1. **Update imports:**
   ```javascript
   // Old
   import { createApp } from '@dualitysol/boilerplate';
   
   // New
   import { Bootstrap } from '@dualitysol/boilerplate';
   const bootstrap = await Bootstrap.create('./boilerplate.config.js');
   ```

2. **Use ConfigLoader:**
   ```javascript
   // Old
   const config = require('./config.js');
   
   // New
   import config from './boilerplate.config.js';
   // Config automatically loads environment variables
   ```

3. **Enable Auto-Discovery:**
   ```javascript
   // Old - Manual service registration
   const services = {
     UserService,
     NotificationService
   };
   
   // New - Auto-discovery
   services: {
     autoDiscover: { enabled: true }
   }
   ```

4. **Add Health Checks:**
   ```javascript
   health: {
     enabled: true,
     endpoint: '/health'
   }
   ```

---

## Examples

See complete examples in the `/examples` directory:

- `examples/quickstart/` - Minimal setup
- `examples/todo-app-monolith/` - Monolithic application
- `examples/kubernetes/` - Kubernetes deployment
- `examples/aws-lambda/` - Serverless functions

---

## Troubleshooting

### Service not discovered

- Check file naming: must end with `*Service.js`
- Check export: must export service class
- Check pattern in `autoDiscover.pattern`
- Enable debug logging: `LOG_LEVEL=debug`

### Health check failing

- Check timeout settings
- Verify database connectivity
- Check component initialization
- Review logs for errors

### Types not generating

- Verify JSDoc syntax
- Run with `--verbose` flag
- Check file paths in error messages
- Ensure service is properly exported

---

## Support

- **Documentation:** [GitHub](https://github.com/dualitysol/boilerplate)
- **Issues:** [GitHub Issues](https://github.com/dualitysol/boilerplate/issues)
- **Examples:** `/examples` directory

---

**Next Steps:**

1. Initialize your first project: `boilerplate init`
2. Read the [Architecture Guide](./ARCHITECTURE.md)
3. Explore [Examples](./examples/)
4. Join our [Community](#)
