# Local Monolith Example

Run all services locally in a single process for development.

## Structure

```
local-monolith/
├── services/
│   ├── UserService/
│   ├── ProductService/
│   └── OrderService/
├── config.js
└── index.js
```

## Run

```bash
npm install
npm run dev
```

## index.js

```javascript
import { Bootstrap } from '@dualitysol/boilerplate'
import UserService from './services/UserService/model.js'
import ProductService from './services/ProductService/model.js'
import OrderService from './services/OrderService/model.js'

// Import GraphQL schemas and resolvers
import userTypeDefs from './services/UserService/typeDefs/index.js'
import userResolvers from './services/UserService/resolvers/index.js'
import productTypeDefs from './services/ProductService/typeDefs/index.js'
import productResolvers from './services/ProductService/resolvers/index.js'
import orderTypeDefs from './services/OrderService/typeDefs/index.js'
import orderResolvers from './services/OrderService/resolvers/index.js'

await Bootstrap.createServer(
    [UserService, ProductService, OrderService],
    {
        runtime: {
            type: 'local'
        },
        
        transport: {
            type: 'http',
            port: 4000
        },
        
        graphql: {
            typeDefs: [userTypeDefs, productTypeDefs, orderTypeDefs],
            resolvers: [userResolvers, productResolvers, orderResolvers]
        },
        
        storage: {
            mongodb: {
                uri: 'mongodb://localhost:27017/myapp'
            }
        },
        
        events: {
            backend: 'local'
        },
        
        queue: {
            backend: 'local'
        }
    }
)

console.log('🚀 Development server started at http://localhost:4000/graphql')

// Graceful shutdown
process.on('SIGINT', async () => {
    process.exit(0)
})
```

## services/UserService/model.js

```javascript
import { Microservice } from '@dualitysol/boilerplate'
import { RequireAuth, InternalOnly } from '@dualitysol/boilerplate/decorators'

export class UserService extends Microservice {
    get collectionName() {
        return 'users'
    }

    async initialize() {
        // Subscribe to events from other services
        await this.subscribe('order.created', async (data) => {
            this.logger.info('Order created for user:', data.userId)
            // Update user stats, send notification, etc.
            await this.updateOne(
                { _id: data.userId },
                { $inc: { orderCount: 1 } }
            )
        })
    }

    // Public method - no auth needed
    async getUser(id) {
        return this.findOne({ _id: id })
    }

    // Protected - requires authentication
    @RequireAuth
    async createUser(data, context) {
        const user = await this.createOne(data)
        
        // Publish event for other services
        await this.publish('user.created', { userId: user._id })
        
        return user
    }

    // Internal - only callable from other services
    @InternalOnly
    async getUserOrders(userId, context) {
        // Call OrderService directly
        const orders = await this.services.OrderService.getOrdersByUser(userId, context)
        return orders
    }

    // Service-to-service communication
    async enrichUserWithOrders(userId) {
        const user = await this.findOne({ _id: userId })
        
        if (!user) return null
        
        // Call OrderService
        const orders = await this.services.OrderService.getOrdersByUser(userId)
        
        return {
            ...user,
            orders
        }
    }
}

export default UserService
```

## services/UserService/resolvers/index.js

```javascript
// Thin resolvers - just delegate to service
export default {
    Query: {
        user: (_, { id }, context) => {
            return context.services.UserService.getUser(id)
        },
        
        userWithOrders: (_, { id }, context) => {
            return context.services.UserService.enrichUserWithOrders(id)
        }
    },
    
    Mutation: {
        createUser: (_, { input }, context) => {
            return context.services.UserService.createUser(input, context)
        }
    }
}
```

## services/OrderService/model.js

```javascript
import { Microservice } from '@dualitysol/boilerplate'
import { RequireAuth } from '@dualitysol/boilerplate/decorators'

export class OrderService extends Microservice {
    get collectionName() {
        return 'orders'
    }

    async initialize() {
        await this.subscribe('user.created', async (data) => {
            this.logger.info('New user, ready to receive orders:', data.userId)
        })
    }

    @RequireAuth
    async createOrder(orderData, context) {
        // Verify user exists
        const user = await this.services.UserService.getUser(orderData.userId)
        
        if (!user) {
            throw new Error('User not found')
        }
        
        const order = await this.createOne({
            ...orderData,
            createdBy: context.user.id,
            status: 'pending'
        })
        
        // Publish event
        await this.publish('order.created', {
            orderId: order._id,
            userId: orderData.userId
        })
        
        return order
    }

    async getOrdersByUser(userId) {
        return this.findMany({ userId })
    }
}

export default OrderService
```

## package.json

```json
{
  "name": "local-monolith-example",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "nodemon index.js",
    "start": "node index.js"
  },
  "dependencies": {
    "@dualitysol/boilerplate": "*"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}
```

## Monolith Advantages for Development

1. **Fast Start** - All services in one process
2. **Simple Debugging** - Single entry point
3. **Synchronous Calls** - No network latency between services
4. **Local Events** - No external dependencies
5. **Easy Switch to Microservices** - Same codebase

## Transition to Microservices

When ready for production, simply split the services:

```javascript
// user-service/index.js
await Bootstrap.createServer([UserService], {
    runtime: { type: 'kubernetes' },
    transport: { type: 'http', port: 3000 },
    events: { backend: 'nats', servers: ['nats://nats:4222'] }
})

// order-service/index.js
await Bootstrap.createServer([OrderService], {
    runtime: { type: 'kubernetes' },
    transport: { type: 'http', port: 3001 },
    events: { backend: 'nats', servers: ['nats://nats:4222'] }
})
```

Service code remains **the same**! Only configuration changes.
