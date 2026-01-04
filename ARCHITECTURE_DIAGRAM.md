# Unified Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Developer Experience                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  @dualitysol/boilerplate-cli                                        │
│  ├── create        → Initialize new project                          │
│  ├── generate      → Create services from templates                  │
│  ├── dev           → Development server                              │
│  └── deploy        → Deploy to cloud                                 │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Configuration Layer                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  boilerplate.config.js                                              │
│  {                                                                    │
│    type: 'monolith' | 'microservices' | 'serverless'                │
│    transport: { type, config }                                       │
│    eventBus: { type, config }                                        │
│    queue: { type, config }                                           │
│    databases: { primary, cache }                                     │
│    graphql: { mode }                                                 │
│  }                                                                    │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Bootstrap Layer                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  1. loadConfig()          → Read boilerplate.config.js              │
│  2. initializeEventBus()  → Local/NATS/Redis/Kafka                  │
│  3. initializeQueue()     → Local/Redis/RabbitMQ/SQS                │
│  4. initializeDatabase()  → Postgres/MongoDB/Memory                  │
│  5. initializeCache()     → Redis/Memcache/Memory                    │
│  6. discoverServices()    → Auto-find services/                      │
│  7. loadService()         → Load each service                        │
│  8. setupGraphQL()        → Merge schemas & resolvers                │
│  9. start()               → Start transport                          │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Unified Service Structure                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  services/                                                           │
│  ├── UserService/                                                    │
│  │   ├── model/              → Business logic                        │
│  │   ├── resolvers/          → GraphQL resolvers                     │
│  │   ├── queryMutation/      → GraphQL operations                    │
│  │   ├── typeDefinitions/    → GraphQL schema (.gql)                 │
│  │   └── tests/              → Unit tests                            │
│  ├── OrderService/                                                   │
│  │   ├── model/                                                      │
│  │   ├── resolvers/                                                  │
│  │   └── ...                                                         │
│  └── PaymentService/                                                 │
│      ├── model/                                                      │
│      ├── resolvers/                                                  │
│      └── ...                                                         │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Transport         EventBus        Queue          Database          │
│  ┌─────────┐      ┌─────────┐    ┌─────────┐    ┌─────────┐       │
│  │ HTTP    │      │ Local   │    │ Local   │    │Postgres │       │
│  │ WS      │      │ NATS    │    │ Redis   │    │ MongoDB │       │
│  │ NATS    │      │ Redis   │    │RabbitMQ │    │ Memory  │       │
│  │ gRPC    │      │ Kafka   │    │ SQS     │    │         │       │
│  └─────────┘      └─────────┘    └─────────┘    └─────────┘       │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Deployment Scenarios

### Monolith Architecture
```
┌────────────────────────────────────────┐
│         Single Node.js Process          │
│                                          │
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │  User    │  │  Order   │  │Payment ││
│  │ Service  │  │ Service  │  │Service ││
│  └──────────┘  └──────────┘  └────────┘│
│          │           │           │      │
│          └───────────┴───────────┘      │
│                  │                      │
│          ┌───────▼────────┐             │
│          │  Local EventBus │             │
│          └────────────────┘             │
│                  │                      │
│          ┌───────▼────────┐             │
│          │  PostgreSQL DB  │             │
│          └────────────────┘             │
│                                          │
│          HTTP Server :4000               │
└────────────────────────────────────────┘
```

### Microservices Architecture
```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│User Service │  │Order Service│  │Payment Svc  │
│             │  │             │  │             │
│   :4001     │  │   :4002     │  │   :4003     │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
                 ┌──────▼──────┐
                 │  NATS Bus   │
                 └─────────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
    ┌────▼────┐    ┌────▼────┐   ┌────▼────┐
    │Users DB │    │Orders DB│   │Payments │
    └─────────┘    └─────────┘   └─────────┘
```

### Serverless Architecture (AWS Lambda)
```
┌─────────────────────────────────────────────┐
│           API Gateway                        │
└─────────────────┬───────────────────────────┘
                  │
      ┌───────────┼───────────┐
      │           │           │
┌─────▼─────┐ ┌──▼──────┐ ┌──▼──────┐
│User Lambda│ │Order Λ  │ │Payment Λ│
└─────┬─────┘ └──┬──────┘ └──┬──────┘
      │          │           │
      └──────────┼───────────┘
                 │
         ┌───────▼────────┐
         │  SQS / SNS     │
         └────────────────┘
                 │
      ┌──────────┼──────────┐
      │          │          │
 ┌────▼────┐ ┌───▼───┐ ┌───▼───┐
 │DynamoDB │ │  S3   │ │  RDS  │
 └─────────┘ └───────┘ └───────┘
```

## Service Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    Service Lifecycle                         │
└─────────────────────────────────────────────────────────────┘

1. Bootstrap Discovers Service
   ├── Scan services/ directory
   ├── Find model/index.ts
   └── Read typeDefinitions/index.gql

2. Dependency Injection
   ├── Create service instance
   │   new ServiceModel({
   │     storage,
   │     eventBus,
   │     queueManager,
   │     cache,
   │     logger
   │   })
   └── Pass config from boilerplate.config.js

3. Service Initialization
   ├── await service.initialize()
   ├── Subscribe to events
   └── Setup cron jobs (if any)

4. GraphQL Registration
   ├── Load typeDefinitions/index.gql
   ├── Load resolvers/index.ts
   └── Merge into global schema

5. Service Running
   ├── Handle GraphQL queries
   ├── Process events
   └── Execute background jobs

6. Graceful Shutdown
   ├── await service.shutdown()
   ├── Close database connections
   └── Unsubscribe from events
```

## Request Flow

### GraphQL Query Flow
```
Client
  │
  │ POST /graphql
  │ { query: "{ user(id: 1) { name } }" }
  │
  ▼
HTTP Transport
  │
  │ Parse & Validate
  │
  ▼
GraphQL Layer
  │
  │ Route to User resolver
  │
  ▼
UserService.resolvers
  │
  │ async user(_, { id }, { model })
  │
  ▼
UserService.model
  │
  │ await model.findById(id)
  │
  ▼
Storage Adapter
  │
  │ SELECT * FROM users WHERE id = $1
  │
  ▼
PostgreSQL
  │
  │ Return data
  │
  ▼
Client receives response
```

### Event Flow
```
OrderService
  │
  │ await eventBus.publish('order.created', data)
  │
  ▼
EventBus (NATS)
  │
  │ Broadcast to subscribers
  │
  ├──────────────┬──────────────┐
  │              │              │
  ▼              ▼              ▼
PaymentService  EmailService  InventoryService
  │              │              │
  │              │              │
  ▼              ▼              ▼
Process        Send Email     Update Stock
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Data Flow                               │
└─────────────────────────────────────────────────────────────┘

GraphQL Request
       │
       ▼
   Resolver ──────────────┐
       │                  │ (Context)
       │                  │ { model, services }
       ▼                  │
   Model Layer ◄──────────┘
       │
       │ (Uses)
       ├──────────────┬──────────────┬──────────────┐
       │              │              │              │
       ▼              ▼              ▼              ▼
   Storage        EventBus        Queue         Cache
       │              │              │              │
       ▼              ▼              ▼              ▼
   Postgres        NATS          Redis         Redis
```

## Configuration Scenarios

### Scenario 1: Local Development
```javascript
{
  type: 'monolith',
  transport: { type: 'http', port: 4000 },
  eventBus: { type: 'local' },           // In-memory
  queue: { type: 'local' },              // In-memory
  databases: {
    primary: { type: 'memory' }          // In-memory
  }
}
```

### Scenario 2: Production Monolith
```javascript
{
  type: 'monolith',
  transport: { type: 'http', port: 4000 },
  eventBus: { type: 'redis' },
  queue: { type: 'redis' },
  databases: {
    primary: { type: 'postgres' },
    cache: { type: 'redis' }
  }
}
```

### Scenario 3: Production Microservices
```javascript
{
  type: 'microservices',
  transport: { type: 'nats' },
  eventBus: { type: 'nats' },
  queue: { type: 'rabbitmq' },
  databases: {
    primary: { type: 'postgres' }
  },
  graphql: { mode: 'federated' }
}
```

### Scenario 4: AWS Lambda
```javascript
{
  type: 'serverless',
  transport: { type: 'lambda' },
  eventBus: { type: 'sqs' },
  queue: { type: 'sqs' },
  databases: {
    primary: { type: 'dynamodb' }
  }
}
```

## Benefits Visualization

```
┌─────────────────────────────────────────────────────────────┐
│              Traditional Approach                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Monolith:                  Microservices:                   │
│  ├── Structure A            ├── Structure B                  │
│  ├── Setup X                ├── Setup Y                      │
│  └── Deploy Method 1        └── Deploy Method 2              │
│                                                               │
│  ❌ Different code structure                                 │
│  ❌ Different setup process                                  │
│  ❌ Difficult to migrate                                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘

                           VS

┌─────────────────────────────────────────────────────────────┐
│               Unified Bootstrap Approach                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ALL TYPES:                                                  │
│  ├── Same service structure                                  │
│  ├── Same entry point (index.js)                            │
│  ├── Same development workflow                              │
│  └── Only config changes (boilerplate.config.js)            │
│                                                               │
│  ✅ Consistent code structure                                │
│  ✅ Easy to understand                                       │
│  ✅ Migrate by changing config                               │
│  ✅ Reuse services across deployments                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Timeline

```
Past                    Present                      Future
─────────────────────────────────────────────────────────────

Old Structure          Unified Structure          Advanced Features
├── Monolith only     ├── All deployment types   ├── Federation
├── Manual setup      ├── Auto-discovery         ├── Service Mesh
└── Hardcoded infra   ├── Config-driven          ├── Multi-tenancy
                      └── Bootstrap system        └── Observability
```
