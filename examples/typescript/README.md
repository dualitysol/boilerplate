# TypeScript Example

Full-featured example with TypeScript, Guards, and type-safe inter-service communication.

## Structure

```
typescript-example/
├── services/
│   ├── UserService/
│   │   ├── model/
│   │   │   └── index.ts
│   │   ├── resolvers/
│   │   │   └── index.ts
│   │   └── typeDefinitions/
│   │       └── index.gql
│   └── OrderService/
│       ├── model/
│       ├── resolvers/
│       └── typeDefinitions/
├── types/
│   └── service-registry.d.ts
├── tsconfig.json
└── index.ts
```

## services/UserService/model/index.ts

```typescript
import { Microservice, Context } from '@dualitysol/boilerplate'
import { RequireAuth, RequireRole, InternalOnly } from '@dualitysol/boilerplate/decorators'
import type { ServiceRegistry } from '../../types/service-registry'

interface User {
  _id: string
  email: string
  name: string
  role: string
  createdAt: Date
  updatedAt: Date
}

interface CreateUserInput {
  email: string
  name: string
  role?: string
}

export class UserService extends Microservice<ServiceRegistry> {
  get collectionName() {
    return 'users'
  }

  async initialize() {
    await this.subscribe('order.created', async (data: { orderId: string; userId: string }) => {
      this.logger.info('Order created:', data)
      await this.updateOne(
        { _id: data.userId },
        { $inc: { orderCount: 1 } }
      )
    })
  }

  // Public method - no Guards
  async getUser(id: string): Promise<User | null> {
    return this.findOne<User>({ _id: id })
  }

  async getUsers(filter: any = {}, options: any = {}): Promise<User[]> {
    return this.findMany<User>(filter, { ...options, limit: options.limit || 20 })
  }

  // Requires authentication
  @RequireAuth
  async updateProfile(userId: string, data: Partial<User>, context: Context): Promise<User | null> {
    // User can only update their own profile
    if (context.user?.id !== userId && !context.user?.roles?.includes('admin')) {
      throw new Error('Unauthorized')
    }
    
    return this.updateOne<User>(
      { _id: userId },
      { $set: data }
    )
  }

  // Admin only
  @RequireRole('admin')
  async deleteUser(id: string, context: Context): Promise<boolean> {
    const result = await this.deleteOne({ _id: id })
    
    if (result) {
      await this.publish('user.deleted', { userId: id })
    }
    
    return result
  }

  // Admin or manager
  @RequireRole('admin', 'manager')
  async getAllUsers(context: Context): Promise<User[]> {
    return this.findMany<User>({})
  }

  // Internal - only from other services
  @InternalOnly
  async getUsersByIds(ids: string[], context: Context): Promise<User[]> {
    return this.findMany<User>({ _id: { $in: ids } })
  }

  // Service-to-service communication with type safety
  async getUserWithOrders(userId: string): Promise<any> {
    const user = await this.findOne<User>({ _id: userId })
    
    if (!user) return null
    
    // Type-safe call to OrderService
    const orders = await this.services.OrderService.getOrdersByUser(userId)
    
    return {
      ...user,
      orders
    }
  }

  // Check if user exists - utility method
  async checkIfUserExists(id: string): Promise<boolean> {
    return this.exists({ _id: id })
  }

  // Count users by role
  async countUsersByRole(role: string): Promise<number> {
    return this.count({ role })
  }
}
```

## services/UserService/resolvers/index.ts

```typescript
import { Context } from '@dualitysol/boilerplate'

// Thin resolvers - just delegation
export const resolvers = {
  Query: {
    user: (_parent: any, { id }: { id: string }, context: Context) => {
      return context.services.UserService.getUser(id)
    },
    
    users: (_parent: any, { filter, options }: any, context: Context) => {
      return context.services.UserService.getUsers(filter, options)
    },
    
    userWithOrders: (_parent: any, { id }: { id: string }, context: Context) => {
      return context.services.UserService.getUserWithOrders(id)
    },
    
    // Admin only - Guard in service method
    allUsers: (_parent: any, _args: any, context: Context) => {
      return context.services.UserService.getAllUsers(context)
    }
  },
  
  Mutation: {
    updateProfile: (_parent: any, { id, input }: any, context: Context) => {
      return context.services.UserService.updateProfile(id, input, context)
    },
    
    deleteUser: (_parent: any, { id }: { id: string }, context: Context) => {
      return context.services.UserService.deleteUser(id, context)
    }
  }
}
```

## services/UserService/typeDefinitions/index.gql

```graphql
type User {
  id: ID!
  email: String!
  name: String!
  role: String
  orderCount: Int
  createdAt: String
  updatedAt: String
}

type UserWithOrders {
  id: ID!
  email: String!
  name: String!
  orders: [Order!]!
}

input UpdateUserInput {
  name: String
  email: String
}

extend type Query {
  user(id: ID!): User
  users(filter: JSON, options: JSON): [User!]!
  userWithOrders(id: ID!): UserWithOrders
  allUsers: [User!]!
}

extend type Mutation {
  updateProfile(id: ID!, input: UpdateUserInput!): User
  deleteUser(id: ID!): Boolean!
}
```

## services/OrderService/model/index.ts

```typescript
import { Microservice, Context } from '@dualitysol/boilerplate'
import { RequireAuth, InternalOnly } from '@dualitysol/boilerplate/decorators'
import type { ServiceRegistry } from '../../types/service-registry'

interface Order {
  _id: string
  userId: string
  productId: string
  quantity: number
  total: number
  status: string
  createdAt: Date
}

export class OrderService extends Microservice<ServiceRegistry> {
  get collectionName() {
    return 'orders'
  }

  async initialize() {
    await this.subscribe('user.deleted', async (data: { userId: string }) => {
      // Archive or delete user's orders
      await this.updateOne(
        { userId: data.userId },
        { $set: { status: 'archived' } }
      )
    })
  }

  @RequireAuth
  async createOrder(orderData: any, context: Context): Promise<Order> {
    // Verify user exists using type-safe call
    const userExists = await this.services.UserService.checkIfUserExists(orderData.userId)
    
    if (!userExists) {
      throw new Error('User not found')
    }
    
    const order = await this.createOne<Order>({
      ...orderData,
      createdBy: context.user?.id,
      status: 'pending'
    })
    
    await this.publish('order.created', {
      orderId: order._id,
      userId: orderData.userId
    })
    
    // Send to queue for processing
    await this.enqueue('order-processing', {
      orderId: order._id,
      action: 'process'
    })
    
    return order
  }

  // Can be called by UserService
  async getOrdersByUser(userId: string): Promise<Order[]> {
    return this.findMany<Order>({ userId })
  }

  // Internal only - for service communication
  @InternalOnly
  async getOrdersByIds(ids: string[], context: Context): Promise<Order[]> {
    return this.findMany<Order>({ _id: { $in: ids } })
  }

  @RequireAuth
  async cancelOrder(orderId: string, context: Context): Promise<Order | null> {
    const order = await this.findOne<Order>({ _id: orderId })
    
    if (!order) {
      throw new Error('Order not found')
    }
    
    // Only order owner or admin can cancel
    if (order.userId !== context.user?.id && !context.user?.roles?.includes('admin')) {
      throw new Error('Unauthorized')
    }
    
    return this.updateOne<Order>(
      { _id: orderId },
      { $set: { status: 'cancelled' } }
    )
  }
}
```

## types/service-registry.d.ts

```typescript
import type { UserService } from '../services/UserService/model'
import type { OrderService } from '../services/OrderService/model'

export interface ServiceRegistry {
  UserService: UserService
  OrderService: OrderService
}
```

## index.ts

```typescript
import { Bootstrap } from '@dualitysol/boilerplate'
import { UserService } from './services/UserService/model'
import { OrderService } from './services/OrderService/model'
import { resolvers as userResolvers } from './services/UserService/resolvers'
import { resolvers as orderResolvers } from './services/OrderService/resolvers'
import { readFileSync } from 'fs'

const userTypeDefs = readFileSync('./services/UserService/typeDefinitions/index.gql', 'utf-8')
const orderTypeDefs = readFileSync('./services/OrderService/typeDefinitions/index.gql', 'utf-8')

await Bootstrap.createServer<[typeof UserService, typeof OrderService]>(
  [UserService, OrderService],
  {
    runtime: {
      type: 'local'
    },
    
    transport: {
      type: 'http',
      port: 4000
    },
    
    graphql: {
      typeDefs: [userTypeDefs, orderTypeDefs],
      resolvers: [userResolvers, orderResolvers]
    },
    
    storage: {
      mongodb: {
        uri: 'mongodb://localhost:27017/typescript-example'
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

console.log('🚀 TypeScript server started at http://localhost:4000/graphql')
```

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["services/**/*", "types/**/*", "index.ts"],
  "exclude": ["node_modules", "dist"]
}
```

## package.json

```json
{
  "name": "typescript-example",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@dualitysol/boilerplate": "*"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.3.0",
    "tsx": "^4.0.0"
  }
}
```

## TypeScript Advantages

1. **Type Safety** - Full typing for all CRUD methods
2. **Autocomplete** - IDE knows all service methods
3. **Guards with Types** - Decorators have correct types
4. **Service Registry** - Type-safe inter-service calls
5. **Compile-time Errors** - Errors found before runtime

## Run

```bash
npm install
npm run dev
```

## GraphQL Queries

```graphql
# Get user with orders (type-safe service communication)
query {
  userWithOrders(id: "123") {
    id
    email
    name
    orders {
      id
      total
      status
    }
  }
}

# Create order (requires auth via @RequireAuth)
mutation {
  createOrder(input: {
    userId: "123"
    productId: "456"
    quantity: 2
  }) {
    id
    status
  }
}

# Admin only (via @RequireRole)
query {
  allUsers {
    id
    email
    role
  }
}
```
