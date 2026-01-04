# Examples Summary

Collection of examples for using @dualitysol/boilerplate in various scenarios.

## ✨ What's New

All examples now demonstrate:
- 🎯 **Entity-First Development** - Define entities once, auto-generate everything
- 📊 **Distributed Tracing** - Monitor and debug with OpenTelemetry/Jaeger
- 🔄 **Event-Driven Architecture** - Decoupled services via NATS
- 📈 **Metrics & Observability** - Prometheus metrics built-in

## 🎯 Featured Examples

### 🆕 [Todo App - Monolith](./todo-app-monolith/) ⭐
**Architecture**: Monolith (all services in one process)
**Port**: 4000

Complete todo application demonstrating:
- ✨ **Entity-First**: Auto-generated schemas from `entity/` folder
- 📊 **Distributed Tracing**: Native Node.js or OpenTelemetry
- 🔐 User authentication and management
- ✅ Todo CRUD operations with categories and priorities
- 🔔 Event-driven notifications
- 📊 Background job processing via queue
- 🚀 GraphQL API with GraphiQL interface

**Entities**: `User.js`, `Todo.js`, `Notification.js`

**Best for**: Small to medium apps, MVPs, rapid prototyping, learning

```bash
cd todo-app-monolith
npm install
TRACING_ENABLED=true npm run dev
```

**New Commands**:
```bash
# Sync entities to generate schemas
npm run sync:entity TodoService Todo

# View traces (console output)
TRACE_EXPORTER=console npm run dev
```

---

### 🆕 [E-commerce - Microservices](./ecommerce-microservices/) ⭐
**Architecture**: Microservices (4 independent services)
**Ports**: 4001-4004

Complete e-commerce platform with:
- ✨ **Entity-First**: 4 entities with full JSDoc annotations
- 📊 **Distributed Tracing**: Full OpenTelemetry with Jaeger
- 📈 **Metrics**: Prometheus endpoints on each service (9091-9094)
- 🔄 **NATS Event Bus**: Async service communication
- **User Service** (4001) - Authentication & profiles (`User.js`)
- **Product Service** (4002) - Catalog & inventory (`Product.js`)
- **Order Service** (4003) - Order management (`Order.js`)
- **Payment Service** (4004) - Payment processing (`Payment.js`)

Inter-service communication via NATS EventBus, distributed traces across services.

**Best for**: Large apps, scalable systems, team autonomy, microservices learning

```bash
cd ecommerce-microservices

# Start dependencies (NATS + Jaeger)
docker run -d -p 4222:4222 nats:latest
docker run -d -p 16686:16686 -p 4318:4318 jaegertracing/all-in-one

# Run all services with tracing
TRACING_ENABLED=true npm run dev:all

# View traces at http://localhost:16686
```

**New Features**:
- Cross-service tracing (see order flow across all 4 services)
- Prometheus metrics per service
- Entity sync command for each service
- Full event flow visualization in Jaeger

---

## 📚 Additional Examples

### 1. [Quick Start](./quickstart/) ⚡
**For whom**: Beginners, quick start

**What's included**:
- Basic service with CRUD methods
- GraphQL schema and thin resolvers
- Guards decorators (@RequireAuth)
- Events and publishing
- Local run

**Run**:
```bash
cd quickstart
npm install
npm start
```

---

### 2. [Local Monolith](./local-monolith/) 🏠
**For whom**: Development, prototyping

**What's included**:
- Multiple services in one process
- Inter-service communication
- Guards (@RequireAuth, @InternalOnly)
- Events between services
- Easy transition to microservices

**Run**:
```bash
cd local-monolith
npm install
npm run dev
```

**Advantages**:
- Fast development
- Simple debugging
- No network latency
- Same code works in production as microservices

---

### 3. [TypeScript](./typescript/) 🛡️
**For whom**: Production-ready applications

**What's included**:
- Full typing
- Type-safe service registry
- Guards with types
- Autocomplete in IDE
- Compile-time checks

**Run**:
```bash
cd typescript
npm install
npm run dev
```

**Features**:
- `Microservice<ServiceRegistry>` for type-safe calls
- Typed CRUD methods
- Interfaces for models
- Typed context and decorators

---

### 4. [AWS Lambda](./aws-lambda/) ☁️
**For whom**: Serverless deployment

**What's included**:
- Lambda handlers
- Serverless Framework config
- NATS for events
- MongoDB Atlas integration
- Auto-scaling

**Deploy**:
```bash
cd aws-lambda
npm install
serverless deploy
```

**Architecture**:
```
Lambda Function (UserService)
    ↓
  NATS (events)
    ↓
MongoDB Atlas (data)
```

---

### 5. [Kubernetes](./kubernetes/) 🚢
**For whom**: Container orchestration

**What's included**:
- Kubernetes manifests
- Dockerfiles
- Health checks
- NATS messaging
- Service discovery
- Horizontal scaling

**Deploy**:
```bash
cd kubernetes
docker build -t user-service ./services/UserService
kubectl apply -f infrastructure/
kubectl apply -f services/
```

**Components**:
- Deployments with health checks
- Services (ClusterIP)
- ConfigMaps and Secrets
- NATS for events
- Gateway for GraphQL Federation

---

## 🎯 Which Example to Choose?

| Scenario | Example | Reason |
|----------|---------|--------|
| Learning framework | Quick Start | Minimal setup |
| Local development | Local Monolith | All services together |
| Production app | TypeScript | Type safety |
| Serverless | AWS Lambda | Auto-scaling, pay-per-use |
| High load | Kubernetes | Scaling, orchestration |

## 🔄 Common Patterns in All Examples

### 1. Thin Resolvers
Resolvers only delegate calls:
```javascript
user: (_, { id }, context) => {
  return context.services.UserService.getUser(id)
}
```

### 2. CRUD Methods
All services inherit:
```javascript
await this.findOne({ _id: id })
await this.findMany(filter, options)
await this.createOne(data)
await this.updateOne(filter, update)
await this.deleteOne(filter)
await this.count(filter)
await this.exists(filter)
```

### 3. Guards Decorators
Authorization via decorators:
```javascript
@RequireAuth
async updateProfile(userId, data, context) { }

@RequireRole('admin')
async deleteUser(id, context) { }

@InternalOnly
async internalMethod(data, context) { }
```

### 4. Events
Publish and subscribe:
```javascript
// Publish
await this.publish('user.created', { userId: user._id })

// Subscribe
await this.subscribe('order.created', async (data) => {
  // Handle event
})
```

### 5. Inter-Service Communication
Type-safe calls:
```javascript
const orders = await this.services.OrderService.getOrdersByUser(userId)
```

## 📦 Project Structure

All examples follow the same structure:

```
project/
├── services/
│   └── UserService/
│       ├── model/
│       │   └── index.ts          # Service class
│       ├── resolvers/
│       │   └── index.ts          # Thin resolvers
│       └── typeDefinitions/
│           └── index.gql         # GraphQL schema
├── types/
│   └── service-registry.d.ts     # Service registry types
└── index.ts                      # Bootstrap
```

## 🚀 Quick Transition from Development to Production

### Local development:
```javascript
await Bootstrap.createServer([UserService], {
  runtime: { type: 'local' },
  transport: { type: 'http', port: 4000 },
  events: { backend: 'local' }
})
```

### Production (Kubernetes):
```javascript
await Bootstrap.createServer([UserService], {
  runtime: { type: 'kubernetes' },
  transport: { type: 'http', port: 3000 },
  events: { backend: 'nats', servers: ['nats://nats:4222'] }
})
```

**Service code stays the same!** Only configuration changes.

## 🎓 Learning Path

1. **Start with Quick Start** - understand basics
2. **Try Local Monolith** - multiple services
3. **Add TypeScript** - type safety
4. **Deploy to Lambda** - serverless
5. **Scale in K8s** - production

## 💡 Tips

- **Guards** - use decorators instead of checks in resolvers
- **Thin Resolvers** - all logic in services, not in resolvers
- **Events** - for loose coupling between services
- **Type Safety** - TypeScript + ServiceRegistry for reliability
- **Testing** - services are easy to test independently

## 📖 Additional Resources

- [Основная документация](../../README.md)
- [API Reference](../../docs/API.md)
- [Architecture Guide](../../ARCHITECTURE.md)
- [Contributing](../../CONTRIBUTING.md)

---

**Need help?** Open an [issue](https://github.com/dualitysol/boilerplate/issues) or check the [documentation](../../README.md).
