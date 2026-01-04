# Migration Guide

## Migrating Existing Code to New Architecture

If you already have code using the old version of the boilerplate, here's how to migrate:

### Before (old version):

```javascript
import { Server, Microservice } from '@dualitysol/boilerplate'

class UserService extends Microservice {
    constructor({ name, context, services, events, storage }) {
        super({ name, context, services, events, storage })
        this.model = this.storage.database.mongo.getCollection('users')
    }
}

const server = new Server({
    host: 'localhost',
    port: 3000,
    mongodb: {
        url: 'mongodb://localhost:27017',
        dbName: 'mydb'
    }
}, __dirname, {
    UserService: { local: true }
})

server.listen()
```

### After (new version):

```javascript
import { createApp, Microservice } from '@dualitysol/boilerplate'

class UserService extends Microservice {
    get collectionName() {
        return 'users'
    }
    // Model available automatically via this.model
}

const app = await createApp({
    runtime: {
        type: 'local',
        port: 3000,
        host: 'localhost'
    },
    
    services: {
        UserService
    },
    
    storage: {
        mongodb: {
            url: 'mongodb://localhost:27017',
            dbName: 'mydb'
        }
    }
})
```

### Main Changes:

#### 1. Application Initialization

**Before:**
```javascript
const server = new Server(config, path, services)
server.listen()
```

**After:**
```javascript
const app = await createApp({ runtime, services, storage })
```

#### 2. Microservice Constructor

**Before:**
```javascript
constructor({ name, context, services, events, storage }) {
    super({ name, context, services, events, storage })
    this.model = this.storage.database.mongo.getCollection('users')
}
```

**After:**
```javascript
// Constructor called automatically, model created from collectionName
get collectionName() {
    return 'users'
}
```

#### 3. Events

**Before:**
```javascript
this.events.publish('user.created', { userId })
this.events.subscribe('user.created', handler)
```

**After:**
```javascript
await this.publish('user.created', { userId })
await this.subscribe('user.created', handler)
```

#### 4. Inter-Service Calls

**Before:**
```javascript
this.services.ProductService.getProduct(id)
```

**After:**
```javascript
// Same!
await this.services.ProductService.getProduct(id)
```

#### 5. Storage

**Before:**
```javascript
this.storage.database.mongo.getCollection('users')
```

**After:**
```javascript
this.storage.getCollection('users')
// or
this.model (if collectionName is specified)
```

### New Features

#### Logging

```javascript
this.info('User created', { userId })
this.error('Error occurred', error)
this.warn('Warning message')
this.debug('Debug info', data)
```

#### Queues

```javascript
await this.enqueue('email-queue', { to: 'user@test.com' })

await this.processQueue('email-queue', async (job) => {
    // Processing
})
```

#### Notifications

```javascript
await this.notify('channel', { message: 'Hello' })
```

### Gradual Migration

You can migrate gradually:

1. First update Bootstrap/Server
2. Then add new features (queue, logger)
3. Rewrite services one by one
4. Add support for different runtime environments

### Backward Compatibility

Old code should continue to work with minimal changes. The main difference is using `createApp` instead of `new Server`.

### Full Migration Example

#### Before:

```javascript
// index.js
import { Server } from '@dualitysol/boilerplate'

const server = new Server({
    host: 'localhost',
    port: 3000,
    mongodb: {
        url: 'mongodb://localhost:27017',
        dbName: 'mydb'
    }
}, __dirname, {
    UserService: { local: true },
    ProductService: { local: true }
})

server.listen(() => {
    console.log('Server started')
})
```

#### After:

```javascript
// index.js
import { createApp } from '@dualitysol/boilerplate'
import UserService from './services/UserService/model.js'
import ProductService from './services/ProductService/model.js'
import userTypeDefs from './services/UserService/typeDefs/index.js'
import userResolvers from './services/UserService/resolvers/index.js'
import productTypeDefs from './services/ProductService/typeDefs/index.js'
import productResolvers from './services/ProductService/resolvers/index.js'

const app = await createApp({
    runtime: {
        type: 'local',
        port: 3000,
        host: 'localhost',
        typeDefs: [userTypeDefs, productTypeDefs].join('\n'),
        resolvers: Object.assign({}, userResolvers, productResolvers),
        contextBuilder: (ctx) => ({
            ...ctx,
            services: ctx.services
        })
    },
    
    services: {
        UserService,
        ProductService
    },
    
    storage: {
        mongodb: {
            url: 'mongodb://localhost:27017',
            dbName: 'mydb'
        }
    },
    
    eventBus: {
        backend: 'local'
    },
    
    queue: {
        backend: 'local'
    },
    
    logger: {
        level: 'debug'
    }
})

console.log('✅ Server started')

// Graceful shutdown
process.on('SIGINT', async () => {
    await app.stop()
    process.exit(0)
})
```

### Recommendations

1. **Start with Local Runtime** for development
2. **Use TypeScript** for better typing (coming soon)
3. **Add health checks** for production
4. **Configure logging** for debugging
5. **Use queues** for asynchronous tasks
6. **Plan deployment** in advance (Lambda, K8s, etc.)

## Troubleshooting

### MongoDB connection failed

```javascript
// Make sure MongoDB is running
docker run -d -p 27017:27017 mongo

// Check connection string
storage: {
    mongodb: {
        url: 'mongodb://localhost:27017',
        dbName: 'mydb'
    }
}
```

### Services not found

```javascript
// Make sure services are exported correctly
export class UserService extends Microservice { ... }
export default UserService

// And imported
import UserService from './services/UserService/model.js'
```

### GraphQL errors

```javascript
// Check that typeDefs and resolvers are defined
runtime: {
    typeDefs: `type Query { ... }`,
    resolvers: { Query: { ... } }
}
```

## Support

If you encounter problems with migration:

1. Check the [examples](../examples/)
2. Read the [architecture documentation](../ARCHITECTURE.md)
3. Create an issue on GitHub

Happy migrating! 🚀
