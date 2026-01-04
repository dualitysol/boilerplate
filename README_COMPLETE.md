# @dualitysol/boilerplate

🚀 **Production-ready microservices framework for Node.js** with GraphQL, comprehensive testing, real-time subscriptions, and 15 built-in enterprise features.

[![npm version](https://badge.fury.io/js/@dualitysol%2Fboilerplate.svg)](https://www.npmjs.com/package/@dualitysol/boilerplate)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](https://nodejs.org)

## ✨ Complete Feature Set (15 Systems)

### 1. ⚙️ Unified Configuration Management
- Environment-based configuration with validation
- Hot reload support
- Nested values and type conversion
- Secret management integration
- **Example:** `examples/quickstart/`

### 2. 🔍 Automatic Service Discovery
- Dynamic service registration and discovery
- Health check integration
- Load balancing strategies
- Service versioning
- **Files:** `src/discovery/ServiceRegistry.js`

### 3. ❤️ Health Check System
- `/health` endpoint with circuit breaker
- Component-level health checks
- Kubernetes readiness/liveness probes
- Dependency monitoring
- **Files:** `src/health/HealthCheckManager.js`

### 4. ✅ GraphQL Validation Enhanced
- Query depth limiting (prevent deep nesting attacks)
- Complexity scoring (prevent expensive queries)
- Query whitelisting (production security)
- Field-level permissions
- **Files:** `src/validation/GraphQLValidator.js`

### 5. 📊 Metrics & Monitoring
- Prometheus-compatible metrics
- Custom metrics registration
- HTTP request tracking
- `/metrics` endpoint
- **Files:** `src/metrics/MetricsCollector.js`

### 6. 🏷️ Service Decorators Enhanced
- `@Retry` - Automatic retry with exponential backoff
- `@Timeout` - Operation timeout protection
- `@CircuitBreaker` - Prevent cascading failures
- `@Trace` - Distributed tracing integration
- `@RateLimit` - Method-level rate limiting
- **Files:** `src/decorators/ServiceDecorators.js`

### 7. 🎯 Entity-First Auto-Generation
- Define entities once in config
- Auto-generate GraphQL schema
- Auto-generate database models
- Auto-generate TypeScript types
- Auto-generate CRUD resolvers
- **Example:** `examples/entity-first-demo/`
- **Files:** `src/entity/EntityGenerator.js`

### 8. 🚦 Rate Limiting System
- Token bucket algorithm
- Sliding window algorithm
- Per-user, per-IP, per-route limits
- `@RateLimit` decorator
- GraphQL directive support
- **Example:** `examples/ratelimit-demo/`
- **Files:** `src/ratelimit/RateLimiter.js`

### 9. 🔐 Advanced Authentication System
- JWT authentication
- OAuth2 provider (Google, GitHub, Facebook)
- Session management (Redis/memory)
- Multi-factor authentication (TOTP)
- Role-based access control (RBAC)
- `@RequireAuth`, `@RequireRole` decorators
- **Example:** `examples/auth-demo/`
- **Files:** `src/auth/`

### 10. 📝 Audit Logging System
- Comprehensive activity logging
- PII data masking
- Compliance exports (GDPR, SOC2, HIPAA)
- `@Audit` decorator
- Search and filtering
- Encryption support
- **Example:** `examples/audit-demo/`
- **Files:** `src/audit/AuditLogger.js`

### 11. 💾 Caching Layer
- Multi-level caching (memory, Redis)
- Cache-aside pattern
- `@Cache`, `@CacheInvalidate` decorators
- TTL management
- Pattern-based invalidation
- **Example:** `examples/cache-demo/`
- **Files:** `src/cache/CacheManager.js`

### 12. 🗄️ Database Migrations
- Up/Down migrations with rollback
- History tracking in database
- Checksum verification (SHA-256)
- Transaction support
- Multi-database support (MongoDB, PostgreSQL, MySQL)
- CLI tool
- **Example:** `examples/migrations-demo/`
- **Files:** `src/migrations/MigrationManager.js`, `src/migrations/cli.js`

### 13. 📁 File Upload Handler
- Multipart streaming uploads
- Storage adapters (Local, S3)
- Validation (size, type, MIME)
- Image optimization (resize, compress, format conversion)
- `@Upload`, `@MultiUpload`, `@ImageUpload` decorators
- Chunked upload support
- Virus scanning (ClamAV)
- **Files:** `src/upload/FileUploadHandler.js`

### 14. 🔄 WebSocket Subscriptions (Real-time)
- **Ultra-fast uWebSockets.js adapter** (3M+ connections/core)
- GraphQL over WebSocket protocol
- PubSub backends: Memory, Redis, NATS
- `@Subscribe` decorator
- Server-side filtering
- Authentication integration
- Backpressure handling
- **Example:** `examples/subscriptions-demo/`
- **Files:** `src/subscriptions/SubscriptionManager.js`, `src/subscriptions/adapters/UWebSocketsAdapter.js`

### 15. 🧪 Testing Utilities (Comprehensive)
- **GraphQL Testing** - GraphQLTester, QueryAssertion, snapshot testing
- **Mock Services** - MockDatabase, MockHTTPClient, MockWebSocket, MockRedisClient
- **Data Factories** - User, Product, Order, Post, Comment, etc.
- **Fixtures** - FixtureManager for test data
- **Stubs/Spies** - createStub, createSpy
- **Database Testing** - DatabaseTestHelper with auto-cleanup
- **Integration Testing** - IntegrationTestHelper
- **Example:** `examples/testing-demo/`
- **Files:** `src/testing/TestingUtilities.js`, `src/testing/factories.js`, `src/testing/mocks.js`

## 📦 Installation

```bash
npm install @dualitysol/boilerplate
```

## 🚀 Quick Start

### 1. Basic GraphQL Service

```javascript
import { Microservice } from '@dualitysol/boilerplate';

const typeDefs = `
  type Query {
    hello: String!
  }
`;

const resolvers = {
  Query: {
    hello: () => 'Hello, World!'
  }
};

const service = new Microservice({
  name: 'HelloService',
  typeDefinitions: typeDefs,
  queryMutations: resolvers
});

await service.start();
```

### 2. Entity-First Development

```javascript
import { EntityGenerator } from '@dualitysol/boilerplate/entity';

const entityConfig = {
  name: 'Product',
  fields: {
    name: { type: 'String', required: true },
    price: { type: 'Float', required: true },
    description: { type: 'String' },
    stock: { type: 'Int', default: 0 }
  }
};

const generator = new EntityGenerator();
const generated = generator.generate(entityConfig);

// Auto-generated:
// - GraphQL schema
// - Database model
// - CRUD resolvers
// - TypeScript types
```

### 3. Real-time Subscriptions

```javascript
import { SubscriptionManager, UWebSocketsAdapter } from '@dualitysol/boilerplate/subscriptions';
import { MemoryPubSub } from '@dualitysol/boilerplate/subscriptions';

const pubsub = new MemoryPubSub();
const subscriptionManager = new SubscriptionManager({ pubsub, schema });
const transport = new UWebSocketsAdapter({
  port: 4000,
  subscriptionManager
});

await transport.start();

// Publish events
await pubsub.publish('MESSAGE_SENT', { text: 'Hello!' });
```

### 4. Testing

```javascript
import { GraphQLTester, userFactory } from '@dualitysol/boilerplate/testing';

const tester = new GraphQLTester(schema);

// Generate test data
const users = userFactory.buildMany(10);

// Test queries
const result = await tester.query(`
  query {
    users {
      id
      email
    }
  }
`);

// Assertions
await tester.expectQuery('{ users { id } }')
  .then(a => a.toHaveNoErrors());

// Snapshot testing
await tester.expectSnapshot('users-list', '{ users { id email } }');
```

## 📚 Examples

All examples use production structure:

```
example-demo/
├── Service/
│   ├── typeDefs/schema.graphql
│   ├── resolvers/
│   │   ├── queries.js
│   │   └── mutations.js
│   ├── model/index.js
│   └── index.js
├── index.js (main app)
├── package.json
└── README.md
```

### Available Examples

1. **quickstart** - Basic GraphQL service
2. **entity-first-demo** - Auto-generation from entity config
3. **ratelimit-demo** - Rate limiting patterns
4. **auth-demo** - JWT, OAuth2, Sessions, MFA
5. **audit-demo** - Audit logging with compliance
6. **cache-demo** - Multi-level caching
7. **migrations-demo** - Database migrations
8. **subscriptions-demo** - Real-time subscriptions
9. **testing-demo** - Comprehensive testing

Run any example:

```bash
cd examples/[example-name]
npm install
npm start
```

## 🔧 Advanced Usage

### Authentication & Authorization

```javascript
import { JWTAuthProvider, RequireAuth, RequireRole } from '@dualitysol/boilerplate/auth';

class UserService {
  @RequireAuth()
  @RequireRole('admin')
  async deleteUser(id) {
    // Only authenticated admins can delete users
  }
}
```

### Rate Limiting

```javascript
import { RateLimit } from '@dualitysol/boilerplate/ratelimit';

class APIService {
  @RateLimit({ 
    points: 10,      // 10 requests
    duration: 60,    // per 60 seconds
    keyPrefix: 'api'
  })
  async getData() {
    // Rate limited to 10 requests/minute
  }
}
```

### Caching

```javascript
import { Cache, CacheInvalidate } from '@dualitysol/boilerplate/cache';

class ProductService {
  @Cache({ ttl: 3600, key: 'product:${id}' })
  async getProduct(id) {
    // Cached for 1 hour
  }
  
  @CacheInvalidate({ pattern: 'product:*' })
  async updateProduct(id, data) {
    // Invalidates all product caches
  }
}
```

### Audit Logging

```javascript
import { Audit } from '@dualitysol/boilerplate/audit';

class OrderService {
  @Audit({ 
    action: 'ORDER_CREATED',
    includeResult: true
  })
  async createOrder(orderData) {
    // Automatically logged with user context
  }
}
```

### Database Migrations

```bash
# Create new migration
npm run migrate create add-users-table

# Run migrations
npm run migrate up

# Rollback
npm run migrate down

# Check status
npm run migrate status
```

### Testing with Mocks

```javascript
import { 
  MockDatabase, 
  MockHTTPClient,
  createStub 
} from '@dualitysol/boilerplate/testing';

// Mock database
const db = new MockDatabase();
const users = db.collection('users');
await users.insertOne({ name: 'John' });

// Mock HTTP
const http = new MockHTTPClient();
http.mockGet('https://api.example.com/users', { data: [] });

// Stub
const stub = createStub('method');
stub.returns('result');
```

## 📖 Architecture

### Service Structure

```
MyService/
├── typeDefs/
│   └── schema.graphql       # GraphQL schema
├── resolvers/
│   ├── queries.js           # Query resolvers
│   ├── mutations.js         # Mutation resolvers
│   └── subscriptions.js     # Subscription resolvers
├── model/
│   └── index.js             # Database model
└── index.js                 # Service export
```

### Thin Resolvers Pattern

```javascript
// ❌ FAT RESOLVER (Bad)
const resolvers = {
  Query: {
    user: async (_, { id }, context) => {
      // Validate
      if (!id) throw new Error('ID required');
      
      // Check auth
      if (!context.userId) throw new Error('Unauthorized');
      
      // Business logic
      const user = await db.users.findOne({ id });
      if (!user) throw new Error('Not found');
      
      // Transform
      return {
        ...user,
        fullName: `${user.firstName} ${user.lastName}`
      };
    }
  }
};

// ✅ THIN RESOLVER (Good)
const resolvers = {
  Query: {
    user: (_, { id }, context) => {
      return userService.findById(id, context);
    }
  }
};

// Business logic in service
class UserService {
  @RequireAuth()
  async findById(id) {
    return this.repository.findOne({ id });
  }
}
```

## 🎯 Design Principles

1. **Thin Resolvers** - GraphQL resolvers delegate to services
2. **Decorator-Driven** - Metadata-based configuration
3. **Entity-First** - Define once, generate everything
4. **Type Safety** - Full TypeScript support
5. **Test-First** - Comprehensive testing utilities
6. **Production-Ready** - Built for scale and reliability

## 📊 Performance

- **WebSocket Subscriptions**: 3M+ connections/core (uWebSockets.js)
- **GraphQL Queries**: <10ms response time (with caching)
- **Rate Limiting**: <1ms overhead per request
- **Authentication**: <5ms JWT validation
- **Caching**: <1ms cache hit latency

## 🛠️ CLI Commands

```bash
# Initialize project
npx @dualitysol/boilerplate init

# Run migrations
npm run migrate up
npm run migrate down
npm run migrate status

# Generate types
npm run generate:types

# Run tests
npm test
npm run test:unit
npm run test:integration
npm run test:graphql
```

## 📦 Package Exports

```javascript
// Core
import { Microservice } from '@dualitysol/boilerplate';

// Configuration
import { ConfigManager } from '@dualitysol/boilerplate/config';

// Discovery
import { ServiceRegistry } from '@dualitysol/boilerplate/discovery';

// Health Checks
import { HealthCheckManager } from '@dualitysol/boilerplate/health';

// Validation
import { GraphQLValidator } from '@dualitysol/boilerplate/validation';

// Metrics
import { MetricsCollector } from '@dualitysol/boilerplate/metrics';

// Decorators
import { Retry, Timeout, CircuitBreaker } from '@dualitysol/boilerplate/decorators';

// Entity Generation
import { EntityGenerator } from '@dualitysol/boilerplate/entity';

// Rate Limiting
import { RateLimiter, RateLimit } from '@dualitysol/boilerplate/ratelimit';

// Authentication
import { JWTAuthProvider, OAuth2Provider } from '@dualitysol/boilerplate/auth';

// Audit Logging
import { AuditLogger, Audit } from '@dualitysol/boilerplate/audit';

// Caching
import { CacheManager, Cache } from '@dualitysol/boilerplate/cache';

// Migrations
import { MigrationManager } from '@dualitysol/boilerplate/migrations';

// File Upload
import { FileUploadHandler, Upload } from '@dualitysol/boilerplate/upload';

// Subscriptions
import { SubscriptionManager, UWebSocketsAdapter } from '@dualitysol/boilerplate/subscriptions';

// Testing
import { 
  GraphQLTester, 
  userFactory,
  MockDatabase 
} from '@dualitysol/boilerplate/testing';
```

## 🔗 Related Projects

- **boilerplate-cli** - CLI tool for project scaffolding
- **boilerplate-rust** - Rust implementation (experimental)

## 📄 License

ISC © DualitySol

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md)

## 📞 Support

- 📧 Email: support@dualitysol.com
- 📖 Documentation: [https://docs.dualitysol.com](https://docs.dualitysol.com)
- 🐛 Issues: [GitHub Issues](https://github.com/dualitysol/boilerplate/issues)

## 🎉 What's New

### Version 3.0.0 (Latest)

- ✅ **15 Production Features** - Complete microservices toolkit
- ✅ **WebSocket Subscriptions** - Ultra-fast real-time with uWebSockets.js
- ✅ **Comprehensive Testing** - GraphQL testing, mocks, factories, fixtures
- ✅ **Database Migrations** - Full migration system with rollback
- ✅ **File Upload** - Streaming uploads with S3/local storage
- ✅ **Advanced Caching** - Multi-level with decorators
- ✅ **Audit Logging** - Compliance-ready with PII masking
- ✅ **Advanced Auth** - JWT, OAuth2, Sessions, MFA, RBAC
- ✅ **Rate Limiting** - Multiple algorithms with decorators
- ✅ **Entity-First** - Auto-generate everything from entities

See [CHANGELOG.md](CHANGELOG.md) for full history.
