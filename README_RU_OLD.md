# @dualitysol/boilerplate

🚀 **Enterprise-grade microservices framework for Node.js** with GraphQL, TypeScript support, and built-in patterns for scalable architectures.

[![npm version](https://badge.fury.io/js/@dualitysol%2Fboilerplate.svg)](https://www.npmjs.com/package/@dualitysol/boilerplate)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](https://nodejs.org)

## ✨ Features

- 🎯 **Thin Resolvers Pattern** - Business logic in services, GraphQL resolvers as thin delegation layer
- 🔐 **Guards & Decorators** - NestJS-style authorization with `@RequireAuth`, `@RequireRole`, `@InternalOnly`
- 🗄️ **Built-in CRUD** - Ready-to-use database operations: `findOne`, `findMany`, `createOne`, `updateOne`, `deleteOne`
- 📡 **Multiple Transports** - HTTP, WebSocket, gRPC, NATS, RabbitMQ, Redis, ZeroMQ
- 🎨 **Event-Driven** - Publish/Subscribe pattern with EventBus
- 📨 **Queue Management** - Built-in queue processing for async operations
- 🔄 **Service Registry** - Type-safe inter-service communication
- 📦 **Multiple Runtimes** - Local, AWS Lambda, Google Cloud Functions, Kubernetes
- 🛡️ **TypeScript First** - Full TypeScript support with auto-generated types
- 🎭 **GraphQL Federation** - Built-in support for federated schemas

## 📦 Installation

```bash
npm install @dualitysol/boilerplate
```

## 🚀 Quick Start

### Create a Service

```typescript
import { Microservice } from '@dualitysol/boilerplate'
import type { ServiceRegistry } from './types/service-registry'
import { RequireAuth, RequireRole } from '@dualitysol/boilerplate/decorators'

export class UserService extends Microservice<ServiceRegistry> {
  get collectionName() {
    return 'users'
  }

  async initialize() {
    // Subscribe to events
    await this.subscribe('user.created', async (data) => {
      this.logger.info('New user created', data)
    })
  }

  // Use built-in CRUD methods
  async getUser(id: string) {
    return this.findOne({ _id: id })
  }

  // Add Guards for authorization
  @RequireAuth
  async updateProfile(userId: string, data: any, context: Context) {
    return this.updateOne({ _id: userId }, { $set: data })
  }

  @RequireRole('admin')
  async deleteUser(id: string, context: Context) {
    return this.deleteOne({ _id: id })
  }
}
```

### Thin GraphQL Resolvers

```typescript
export const resolvers = {
  Query: {
    // Just delegate to service methods
    user: (_parent, { id }, context) => {
      return context.services.UserService.findOne({ _id: id })
    }
  },
  
  Mutation: {
    updateUser: (_parent, { id, input }, context) => {
      return context.services.UserService.updateOne(
        { _id: id },
        { $set: input }
      )
    }
  }
}
```

## 🎯 Core Concepts

### Built-in CRUD Methods

Every service inherits powerful CRUD operations:

```typescript
// Find operations
await this.findOne({ email: 'user@example.com' })
await this.findMany({ status: 'active' }, { limit: 10, skip: 0 })

// Create
await this.createOne({ name: 'John', email: 'john@example.com' })

// Update
await this.updateOne({ _id: id }, { $set: { name: 'Jane' } })

// Delete
await this.deleteOne({ _id: id })

// Utilities
await this.count({ status: 'active' })
await this.exists({ email: 'user@example.com' })
```

### Guards & Authorization

Protect your methods with decorators:

```typescript
import { RequireAuth, RequireRole, RequirePermission, InternalOnly } from '@dualitysol/boilerplate/decorators'

class OrderService extends Microservice {
  @RequireAuth
  async getMyOrders(userId: string, context: Context) {
    return this.findMany({ userId })
  }

  @RequireRole('admin', 'manager')
  async getAllOrders(context: Context) {
    return this.findMany({})
  }

  @RequirePermission('orders.cancel')
  async cancelOrder(orderId: string, context: Context) {
    return this.updateOne({ _id: orderId }, { $set: { status: 'cancelled' } })
  }

  @InternalOnly
  async internalCalculation(data: any, context: Context) {
    // Only accessible from other services
    return this.complexCalculation(data)
  }
}
```

### Event-Driven Architecture

```typescript
class NotificationService extends Microservice {
  async initialize() {
    // Subscribe to events from other services
    await this.subscribe('user.created', this.sendWelcomeEmail.bind(this))
    await this.subscribe('order.placed', this.sendOrderConfirmation.bind(this))
  }

  async sendWelcomeEmail(data: { userId: string }) {
    const user = await this.services.UserService.findOne({ _id: data.userId })
    // Send email logic
    await this.publish('email.sent', { userId: data.userId, type: 'welcome' })
  }
}
```

### Inter-Service Communication

Type-safe calls between services:

```typescript
class OrderService extends Microservice<ServiceRegistry> {
  async createOrder(orderData: any, context: Context) {
    // Call UserService
    const user = await this.services.UserService.findOne({ _id: orderData.userId })
    
    if (!user) {
      throw new Error('User not found')
    }

    // Create order
    const order = await this.createOne(orderData)

    // Notify other services
    await this.services.NotificationService.sendToUser(
      user._id,
      'Order created successfully',
      'info'
    )

    return order
  }
}
```

## 🔌 Transports

Support for multiple transport layers:

```typescript
import { Bootstrap } from '@dualitysol/boilerplate'

// HTTP/GraphQL
Bootstrap.createServer([UserService, OrderService], {
  transport: { type: 'http', port: 4000 }
})

// WebSocket
Bootstrap.createServer([UserService], {
  transport: { type: 'websocket', port: 4001 }
})

// NATS
Bootstrap.createServer([UserService], {
  transport: { 
    type: 'nats', 
    servers: ['nats://localhost:4222'] 
  }
})

// gRPC
Bootstrap.createServer([UserService], {
  transport: { type: 'grpc', port: 50051 }
})
```

## 🎨 Decorators

### Available Decorators

| Decorator | Description |
|-----------|-------------|
| `@GraphQLQuery` | Mark method as GraphQL query |
| `@GraphQLMutation` | Mark method as GraphQL mutation |
| `@Subscribe(event)` | Subscribe to event |
| `@QueueProcessor(queue)` | Process queue messages |
| `@Cache(options)` | Cache method results |
| `@Log` | Log method execution |
| `@Retry(options)` | Retry on failure |
| `@RequireAuth` | Require authentication |
| `@RequireRole(...roles)` | Require specific roles |
| `@RequirePermission(...perms)` | Require permissions |
| `@InternalOnly` | Only internal calls |
| `@Guard(validator)` | Custom validation |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│            GraphQL Layer (Thin)                 │
│  ┌─────────────────────────────────────────┐   │
│  │  Resolvers (just delegation)            │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│          Service Layer (Business Logic)         │
│  ┌─────────────────────────────────────────┐   │
│  │  UserService                             │   │
│  │  - CRUD methods                          │   │
│  │  - Guards (@RequireAuth, @RequireRole)  │   │
│  │  - Business logic                        │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│             Infrastructure Layer                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Database │  │  Events  │  │  Queues  │     │
│  └──────────┘  └──────────┘  └──────────┘     │
└─────────────────────────────────────────────────┘
```

## 🚢 Deployment

### AWS Lambda

```typescript
import { Bootstrap } from '@dualitysol/boilerplate'

export const handler = Bootstrap.createLambdaHandler([UserService], config)
```

### Google Cloud Functions

```typescript
export const gcpHandler = Bootstrap.createGoogleCloudHandler([UserService], config)
```

### Kubernetes

```typescript
Bootstrap.createServer([UserService], {
  runtime: { type: 'kubernetes' }
})
```

### Local Development

```typescript
Bootstrap.createServer([UserService], {
  runtime: { type: 'local' }
})
```

## 📚 Documentation

- [Architecture Guide](./ARCHITECTURE.md) - Detailed architecture overview
- [Migration Guide](./MIGRATION.md) - Upgrading from previous versions
- [API Reference](./docs/API.md) - Complete API documentation
- [Examples](./examples/) - Working examples

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## 📝 License

ISC © Artem Tantsura

## 🔗 Related Packages

- [@dualitysol/boilerplate-cli](https://www.npmjs.com/package/@dualitysol/boilerplate-cli) - CLI tool for project scaffolding

## 💡 Examples

Check out the [examples](./examples) directory for:
- Basic microservice setup
- GraphQL federation
- Event-driven architecture
- AWS Lambda deployment
- Kubernetes deployment

---

**Built with ❤️ by [Duality Solutions](https://github.com/dualitysol)**
