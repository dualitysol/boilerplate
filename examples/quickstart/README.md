# Quick Start Example

The simplest example to get started with @dualitysol/boilerplate.

## Installation

```bash
npm install @dualitysol/boilerplate
```

## Simple Service

### 1. Create a Service

```javascript
// UserService.js
import { Microservice } from '@dualitysol/boilerplate'
import { RequireAuth } from '@dualitysol/boilerplate/decorators'

export class UserService extends Microservice {
    get collectionName() {
        return 'users'
    }

    async initialize() {
        // Subscribe to events
        await this.subscribe('user.created', async (data) => {
            this.logger.info('New user created:', data.userId)
        })
    }

    // Use built-in CRUD methods
    async getUser(id) {
        return this.findOne({ _id: id })
    }

    async listUsers(filter = {}, options = {}) {
        return this.findMany(filter, { ...options, limit: options.limit || 10 })
    }

    // Protected method with Guard
    @RequireAuth
    async createUser(data, context) {
        this.logger.info('Creating user:', data.email)
        
        const user = await this.createOne({
            ...data,
            createdBy: context.user?.id
        })

        // Publish event
        await this.publish('user.created', { userId: user._id })

        return user
    }

    @RequireAuth
    async updateUser(id, data, context) {
        return this.updateOne({ _id: id }, { $set: data })
    }
}

export default UserService
```

### 2. Create GraphQL Schema

```graphql
# schema.gql
type User {
    id: ID!
    email: String!
    name: String
    createdAt: String!
}

type Query {
    user(id: ID!): User
    users: [User!]!
}

type Mutation {
    createUser(email: String!, name: String): User!
}
```

### 3. Create Resolvers (Thin Resolvers Pattern)

```javascript
// resolvers.js
export default {
    Query: {
        // Just delegate to service methods
        user: (parent, { id }, context) => {
            return context.services.UserService.getUser(id)
        },
        
        users: (parent, { filter, options }, context) => {
            return context.services.UserService.listUsers(filter, options)
        }
    },
    
    Mutation: {
        // Service handles authorization via Guards
        createUser: (parent, args, context) => {
            return context.services.UserService.createUser(args, context)
        },
        
        updateUser: (parent, { id, input }, context) => {
            return context.services.UserService.updateUser(id, input, context)
        }
    }
}
```

### 4. Run the Application

```javascript
// index.js
import { Bootstrap } from '@dualitysol/boilerplate'
import { readFileSync } from 'fs'
import UserService from './UserService.js'
import resolvers from './resolvers.js'

const typeDefs = readFileSync('./schema.gql', 'utf-8')

await Bootstrap.createServer([UserService], {
    runtime: {
        type: 'local'
    },
    
    transport: {
        type: 'http',
        port: 4000
    },
    
    graphql: {
        typeDefs,
        resolvers
    },
    
    storage: {
        mongodb: {
            uri: 'mongodb://localhost:27017/quickstart'
        }
    },
    
    events: {
        backend: 'local'
    }
})

console.log('🚀 Server running at http://localhost:4000/graphql')
```

### 5. Start MongoDB (if needed)

```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 6. Start the Application

```bash
node index.js
```

### 7. Open Browser

Navigate to http://localhost:4000/graphql

### 8. Execute Queries

**Create a user:**
```graphql
mutation {
  createUser(email: "test@example.com", name: "Test User") {
    id
    email
    name
    createdAt
  }
}
```

**Get all users:**
```graphql
query {
  users {
    id
    email
    name
    createdAt
  }
}
```

**Get single user:**
```graphql
query {
  user(id: "...") {
    id
    email
    name
  }
}
```

## Next Steps

1. Add more services
2. Add events and queues
3. Try deploying to Lambda or Kubernetes
4. Study the [full documentation](../README.md)

## package.json

```json
{
  "name": "quickstart-example",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "@dualitysol/boilerplate": "*"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}
```
