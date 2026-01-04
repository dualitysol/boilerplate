# Architecture @dualitysol/boilerplate

## 🎯 Goals and Philosophy

The boilerplate is designed for creating flexible microservice backend applications with the ability to deploy in various environments without changing the service code.

### Key Principles:

1. **Write Once, Deploy Anywhere** - one codebase works everywhere
2. **Transport Agnostic** - communication independent of transport protocol
3. **Storage Agnostic** - unified API for working with any database
4. **Event-Driven** - asynchronous architecture with event support
5. **Developer Experience** - ease of use and clear abstractions

## 🏗️ System Components

### 1. Microservice (Base Service Class)

**Location:** `src/Microservice.js`

**Purpose:** High-level abstraction for service business logic

**Features:**
- Access to storage (database)
- Publish/subscribe to events
- Work with queues
- Inter-service communication
- Logging
- Metrics

**Usage Example:**
```javascript
class UserService extends Microservice {
    async createUser(data) {
        const user = await this.model.insert(data)
        await this.publish('user.created', { userId: user._id })
        await this.services.NotificationService.sendWelcome({ userId: user._id })
        return user
    }
}
```

### 2. Bootstrap (Application Initialization)

**Location:** `src/Bootstrap.js`

**Purpose:** Orchestration of application startup, component initialization

**Initialization Sequence:**
1. Logger
2. Storage (MongoDB, PostgreSQL, etc.)
3. EventBus
4. QueueManager
5. ServiceRegistry
6. Services (class loading)
7. Runtime (environment selection)

**Example:**
```javascript
const app = await createApp({
    runtime: { type: 'local' },
    services: { UserService, ProductService },
    storage: { mongodb: { url: '...' } }
})
```

### 3. Runtime Adapters (Execution Environment Adapters)

**Location:** `src/runtime/`

**Types:**
- `LocalRuntime` - local development (monolith)
- `LambdaRuntime` - AWS Lambda
- `GoogleCloudRuntime` - Google Cloud Functions
- `ServerRuntime` - standalone server
- `ContainerRuntime` - Docker/Kubernetes

**Architecture:**
```
BaseRuntime
├── initialize() - initialize services
├── start() - start server/handler
└── stop() - graceful shutdown

LocalRuntime
└── Runs all services in one process

LambdaRuntime
└── Handles Lambda events, one service = one function

ServerRuntime
└── HTTP/WebSocket server (Node.js or uWebSockets)

ContainerRuntime
└── Server with health checks, metrics for K8s
```

### 4. Transport Layer

**Location:** `src/transport/`

**Purpose:** Abstraction for inter-service communication

**Supported Protocols:**
- HTTP (REST, GraphQL)
- WebSocket (real-time)
- **uWebSocket** (ultra-fast WebSocket, 1-2M msg/s)
- NATS (pub/sub, request/reply, 11M msg/s)
- RabbitMQ (queues, exchanges)
- Redis (pub/sub, streams)
- ZeroMQ (high-performance messaging)
- gRPC (typed RPC)

**Architecture:**
```
BaseTransport
├── connect()
├── disconnect()
├── send(target, data)
├── subscribe(channel, handler)
├── publish(channel, data)
└── request(target, method, params) - RPC pattern

HTTPTransport extends BaseTransport
WebSocketTransport extends BaseTransport
UWebSocketTransport extends BaseTransport
NATSTransport extends BaseTransport
...
```

**Transport Selection:**
```javascript
// Standard WebSocket
const transport = TransportFactory.create({
    type: 'websocket',
    url: 'ws://localhost:4222'
})

// Ultra-fast uWebSocket (for high-performance)
const transport = TransportFactory.create({
    type: 'uwebsocket',
    url: 'ws://user-service:3000'
})

// NATS (best for distributed systems)
const transport = TransportFactory.create({
    type: 'nats',
    url: 'nats://localhost:4222'
})

await transport.connect()
await transport.publish('user.created', { userId: '123' })
```

**Performance Comparison:**
```
Transport          Latency (P99)  Throughput        Use Case
─────────────────────────────────────────────────────────────
NATS               0.5ms          11M msg/s         Best for microservices
uWebSocket         1-2ms          1-2M msg/s        High-performance + browser compat
WebSocket          2-5ms          500K msg/s        Standard real-time
gRPC               3-5ms          300K msg/s        Typed APIs
HTTP               5-10ms         100K msg/s        REST/GraphQL
```
```

### 5. EventBus (Event System)

**Location:** `src/events/EventBus.js`

**Purpose:** Pub/Sub for event-driven architecture

**Backends:**
- Local (EventEmitter for development)
- NATS (distributed pub/sub)
- Redis (pub/sub)
- WebSocket (real-time events)
- AWS SNS (cloud events)

**Usage:**
```javascript
// Publishing
await this.events.publish('user.created', { userId: '123' })

// Subscription
await this.events.subscribe('user.created', async (data) => {
    console.log('New user:', data.userId)
})

// Pattern subscription (Redis)
await this.events.subscribePattern('user.*', handler)
```

### 6. QueueManager (Queue System)

**Location:** `src/queue/index.js`

**Purpose:** Asynchronous task processing

**Backends:**
- Local (in-memory for development)
- RabbitMQ (reliable queues)
- Redis (lightweight queues)
- NATS (distributed queues)
- AWS SQS (cloud queues)

**Usage:**
```javascript
// Send to queue
await this.queue.send('email-queue', {
    to: 'user@example.com',
    template: 'welcome'
})

// Process queue
await this.queue.process('email-queue', async (job) => {
    await sendEmail(job.data)
}, {
    concurrency: 5,
    requeueOnError: true
})
```

### 7. Storage (Data Storage)

**Location:** `src/storage/`

**Purpose:** Unified API for working with databases

**Current Support:**
- MongoDB (full support)
- Cache (in-memory)

**Planned:**
- PostgreSQL
- DynamoDB
- Redis (as cache)
- ClickHouse

**Architecture:**
```javascript
class Storage {
    database = {
        mongo: MongoDB,
        postgres: PostgreSQL,
        dynamo: DynamoDB
    }
    cache = Cache
}

// Usage in service
this.model = this.storage.database.mongo.getCollection('users')
await this.model.insert({ email: 'user@test.com' })
await this.model.find({ active: true })
```

### 8. ServiceRegistry (Service Discovery)

**Location:** `src/registry/index.js`

**Purpose:** Service registration and discovery

**Usage:**
```javascript
// Registration
await registry.register('UserService', {
    url: 'http://user-service:3000',
    tags: ['user', 'auth'],
    graphql: { url: 'http://user-service:3000/graphql' }
})

// Discovery
const service = registry.getService('UserService')
const authServices = registry.findByTag('auth')
```

### 9. APIGateway (GraphQL Gateway)

**Location:** `src/gateway/index.js`

**Purpose:** Aggregation of GraphQL schemas from microservices

**Functions:**
- Schema stitching
- Request routing
- Service discovery integration
- GraphQL Federation (planned)

**Architecture:**
```
Client
  ↓
APIGateway (global-schema.gql)
  ├── UserService (user.gql)
  ├── ProductService (product.gql)
  └── OrderService (order.gql)
```

### 10. Logger (Logging)

**Location:** `src/logger/index.js`

**Levels:** error, warn, info, debug

**Outputs:**
- Console (colored output)
- File (JSON logs)
- Custom transports

**Usage:**
```javascript
this.info('User created', { userId: '123' })
this.error('Database error', error)

const childLogger = logger.child({ service: 'UserService' })
```

## 🔄 Deployment Scenarios

### Scenario 1: Local Development (Monolith)

```
Developer Machine
└── Node.js Process
    ├── UserService (instance)
    ├── ProductService (instance)
    ├── OrderService (instance)
    ├── EventBus (local EventEmitter)
    ├── Queue (in-memory)
    └── Storage (MongoDB)
```

**Advantages:**
- Fast startup
- Easy debugging
- No infrastructure required

### Scenario 2: AWS Lambda (Serverless)

```
API Gateway → Lambda Functions
                ├── UserService (Lambda)
                ├── ProductService (Lambda)
                └── OrderService (Lambda)
                      ↓
                NATS/SNS (Events)
                      ↓
                MongoDB Atlas
```

**Advantages:**
- Auto-scaling
- Pay per request
- No server management

**Configuration:**
- One service = one Lambda function
- EventBus → SNS/SQS or NATS
- Storage → MongoDB Atlas or DynamoDB

### Scenario 3: Kubernetes (Microservices)

```
Kubernetes Cluster
├── Gateway Pod
│   └── APIGateway (aggregates schemas)
├── UserService Pods (3 replicas)
│   └── Container (Node.js + NATS)
├── ProductService Pods (3 replicas)
│   └── Container (Node.js + NATS)
├── NATS Cluster
│   └── Event Bus + Queue
└── MongoDB StatefulSet
```

**Advantages:**
- Complete service isolation
- Independent scaling
- High availability

**Configuration:**
- Runtime: `container`
- Transport: `nats` or `grpc`
- Health checks: `/health`, `/ready`, `/live`
- Metrics: `/metrics` (Prometheus)

### Scenario 4: DigitalOcean Droplets (High-Performance)

```
Droplets
├── Gateway Droplet
│   └── APIGateway (uWebSockets HTTP)
├── UserService Droplet
│   └── uWebSockets Server + uWebSocket Transport
├── ProductService Droplet
│   └── uWebSockets Server + uWebSocket Transport
└── Infrastructure Droplet
    └── MongoDB
```

**Configuration:**
```javascript
// UserService droplet
await createApp({
    runtime: { 
        type: 'server',
        http: 'uwebsockets',  // Ultra-fast HTTP
        port: 3000
    },
    transport: {
        type: 'uwebsocket',   // Ultra-fast inter-service
        port: 3001
    },
    services: { UserService }
})
```

**Advantages:**
- Easy management
- Predictable cost
- **Ultra-high performance** (1-2M req/s per service)
- Low latency (1-2ms between services)
- No external message broker needed

## 🔌 Inter-Service Communication

### Pattern 1: Direct Call (Sync)

```javascript
// In LocalRuntime
const result = await this.services.ProductService.getProduct(id)
// → Direct method call

// In other Runtimes
const result = await this.services.ProductService.getProduct(id)
// → HTTP/gRPC/NATS request via proxy
```

### Pattern 2: Events (Async)

```javascript
// Service A
await this.publish('order.created', { orderId: '123' })

// Service B
await this.subscribe('order.created', async (data) => {
    // Handle event
})
```

### Pattern 3: Queue (Async + Reliable)

```javascript
// Producer
await this.enqueue('pdf-generation', { orderId: '123' })

// Consumer
await this.processQueue('pdf-generation', async (job) => {
    // Generate PDF
}, { concurrency: 3 })
```

## 📊 Monitoring and Observability

### Health Checks (Container Runtime)

- `/health` - general status
- `/ready` - readiness for traffic
- `/live` - liveness probe

### Metrics (Prometheus)

- `/metrics` - metrics in Prometheus format
  - process_uptime_seconds
  - process_memory_*
  - process_cpu_*

### Logging

```javascript
this.logger.info('Message', { context: 'data' })
// → [2024-01-01T10:00:00.000Z] INFO [UserService]: Message { context: 'data' }
```

## 🚀 Recommendations

### For development:
- Use `LocalRuntime`
- EventBus: `local`
- Queue: `local`

### For production (low load):
- Deploy on Droplets
- Runtime: `server` with `uWebSockets`
- Transport: `nats` (most reliable)

### For production (high load + low latency):
- Deploy on Droplets or Bare Metal
- Runtime: `server` with `uWebSockets`
- Transport: `uwebsocket` (1-2ms latency)
- Use for: Trading systems, real-time gaming, IoT

### For production (high load + distributed):
- Deploy in Kubernetes
- Runtime: `container`
- Transport: `nats` (best for clustering)
- Horizontal auto-scaling

### For serverless:
- AWS Lambda or Google Cloud Functions
- Runtime: `lambda` / `google-cloud`
- EventBus: `sns` / `pubsub`
- Queue: `sqs`

## 📝 Roadmap

- [ ] TypeScript type generation from GraphQL
- [ ] CLI for service generation
- [ ] PostgreSQL, DynamoDB support
- [ ] GraphQL Federation
- [ ] Distributed tracing (OpenTelemetry)
- [ ] Deployment scripts (Terraform, Pulumi)
- [ ] CI/CD templates (GitHub Actions, GitLab CI)
- [ ] Consul/Etcd for Service Registry
- [ ] AWS SDK wrapper for easy migration
