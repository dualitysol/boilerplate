# Examples

Complete working examples demonstrating all framework features.

## 📁 Structure

Each example follows the same **service-oriented structure**:

```
example-name/
├── ServiceName/
│   ├── typeDefs/
│   │   └── schema.graphql     # GraphQL schema
│   ├── resolvers/
│   │   ├── queries.js         # Query resolvers
│   │   └── mutations.js       # Mutation resolvers
│   ├── model/
│   │   └── index.js           # Business logic & validation
│   └── index.js               # Exports: typeDefinitions, queryMutations, ServiceClass
├── index.js                    # Main application
├── package.json
└── README.md
```

This structure matches the production service architecture from `service-example-master`.

## 🚀 Available Examples

### 1. **entity-first-demo** (Port 4000)
Complete product catalog with auto-generated GraphQL schemas, resolvers, and types.

**Features:**
- Entity-first architecture
- Auto-generation of GraphQL schema
- CRUD operations with validation
- Search functionality
- Category filtering

**Services:**
- `ProductService` - Product CRUD with search

**Run:**
```bash
cd entity-first-demo
npm install
npm start
# Open http://localhost:4000/graphql
```

### 2. **ratelimit-demo** (Port 4001)
Rate limiting with token bucket algorithm, multiple tiers, and blocking.

**Features:**
- Token bucket algorithm
- Per-IP, per-user, global limits
- Temporary blocking (bans)
- X-RateLimit-* headers
- 429 Too Many Requests

**Rate Limits:**
- Public API: 10 req/min (blocks 5min)
- User API: 100 req/min
- Admin API: 1000 req/min
- Expensive ops: 2 req/min (blocks 2min)

**Services:**
- `RateLimiterService` - Rate limit management

**Run:**
```bash
cd ratelimit-demo
npm install
npm start
# Open http://localhost:4001/graphql
```

### 3. **auth-demo** (Port 4002)
Complete authentication with JWT, OAuth2, and sessions.

**Features:**
- JWT (access + refresh tokens)
- OAuth2 with PKCE (GitHub, Google)
- Session management
- Token rotation
- Token revocation
- Multi-device logout

**Services:**
- `UserService` - User management
- `AuthService` (JWTAuth) - Token generation/verification
- `OAuth2Service` - OAuth2 flows
- `SessionService` - Session management

**Run:**
```bash
cd auth-demo
npm install
npm start
# Open http://localhost:4002/graphql
```

### 4. **audit-demo** (Port 4003)
Audit logging for compliance and security monitoring.

**Features:**
- Automatic CRUD tracking
- Who/what/when logging
- Before/after diffs
- Sensitive data redaction
- Compliance exports (GDPR, SOC2, HIPAA)
- Resource history
- User activity

**Services:**
- `AuditService` - Audit log management

**Run:**
```bash
cd audit-demo
npm install
npm start
# Open http://localhost:4003/graphql
```

## 📋 Common Patterns

All examples demonstrate:

### 1. Service Structure

```javascript
// ServiceName/index.js
export const typeDefinitions = readFileSync('./typeDefs/schema.graphql', 'utf-8');

export const queryMutations = {
  Query: queries,
  Mutation: mutations
};

export class ServiceClass {
  // Business logic
}
```

### 2. GraphQL Schema

```graphql
# typeDefs/schema.graphql
type Resource {
  id: ID!
  name: String!
}

type Query {
  resources: [Resource!]!
}

type Mutation {
  createResource(input: CreateResourceInput!): ResourceResponse!
}
```

### 3. Query Resolvers

```javascript
// resolvers/queries.js
export default {
  async resources(_, __, context) {
    const { services } = context;
    return await services.ResourceService.getAll();
  }
};
```

### 4. Mutation Resolvers

```javascript
// resolvers/mutations.js
export default {
  async createResource(_, { input }, context) {
    const { services } = context;
    const resource = await services.ResourceService.create(input);
    return { success: true, resource };
  }
};
```

### 5. Main Application

```javascript
// index.js
import { Microservice } from '@dualitysol/boilerplate';
import { typeDefinitions, queryMutations, ServiceClass } from './Service/index.js';

const app = new Microservice({
  name: 'example',
  transport: { type: 'http', port: 4000 },
  graphql: { enabled: true, playground: true }
});

app.registerService('ServiceName', new ServiceClass());
app.registerGraphQL({ typeDefs: typeDefinitions, resolvers: queryMutations });

await app.start();
```

## 🎯 Quick Start

Run all examples at once:

```bash
# Terminal 1 - Entity First
cd entity-first-demo && npm install && npm start

# Terminal 2 - Rate Limiting
cd ratelimit-demo && npm install && npm start

# Terminal 3 - Auth
cd auth-demo && npm install && npm start

# Terminal 4 - Audit
cd audit-demo && npm install && npm start
```

Then open GraphQL playgrounds:
- Entity: http://localhost:4000/graphql
- RateLimit: http://localhost:4001/graphql
- Auth: http://localhost:4002/graphql
- Audit: http://localhost:4003/graphql

## 📚 Learn More

Each example has its own README with:
- Detailed feature list
- Example queries and mutations
- Code explanations
- Best practices

## 🏗️ Production Ready

These examples follow production patterns:
- ✅ Service-oriented architecture
- ✅ Clean separation of concerns
- ✅ GraphQL schema-first design
- ✅ Type-safe resolvers
- ✅ Business logic in model layer
- ✅ Error handling with response types
- ✅ Input validation
- ✅ Security best practices

Use them as templates for your own microservices!
