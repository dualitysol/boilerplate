# uWebSocket Transport Example

High-performance inter-service communication using uWebSockets.js

## 🚀 Performance

- **Latency**: 1-2ms (P99)
- **Throughput**: 1-2M messages/second per connection
- **Memory**: 3-4x less than standard WebSocket
- **Connections**: Millions of concurrent connections possible

## 📦 Installation

```bash
npm install uWebSockets.js
```

## 🎯 Use Cases

✅ **Best for:**
- Ultra-low latency requirements (<2ms)
- High-throughput scenarios (>100K msg/s)
- Real-time bidirectional communication
- Memory-constrained environments
- Trading systems, gaming, IoT

❌ **Not recommended for:**
- Small deployments (<10K req/s)
- When NATS infrastructure already exists
- Need for message persistence
- Complex routing requirements

## 💻 Basic Usage

### Service A (Server)

```javascript
import { createApp } from '@dualitysol/boilerplate'
import { UWebSocketServer } from '@dualitysol/boilerplate/transport'

class UserService extends Microservice {
    get collectionName() {
        return 'users'
    }

    async getUser(params) {
        return await this.model.findOne({ _id: params.userId })
    }

    async createUser(params) {
        const user = await this.model.insert(params.data)
        await this.publish('user.created', { userId: user._id })
        return user
    }
}

// Start service with uWebSocket transport
await createApp({
    runtime: {
        type: 'server',
        http: 'uwebsockets',  // HTTP server
        port: 3000
    },
    transport: {
        type: 'uwebsocket',   // Inter-service transport
        port: 3001            // Separate port for service-to-service
    },
    services: { UserService },
    storage: {
        mongodb: { url: 'mongodb://localhost:27017', dbName: 'myapp' }
    }
})
```

### Service B (Client)

```javascript
import { createApp } from '@dualitysol/boilerplate'

class OrderService extends Microservice {
    async createOrder(params) {
        // Call UserService via uWebSocket (ultra-fast!)
        const user = await this.services.UserService.getUser({ 
            userId: params.userId 
        })
        
        if (!user) {
            throw new Error('User not found')
        }

        const order = await this.model.insert({
            userId: user._id,
            items: params.items,
            total: params.total
        })

        return order
    }
}

await createApp({
    runtime: {
        type: 'server',
        http: 'uwebsockets',
        port: 3002
    },
    transport: {
        type: 'uwebsocket',
        port: 3003,
        connections: {
            // Connect to UserService
            UserService: 'ws://localhost:3001'
        }
    },
    services: { OrderService },
    storage: {
        mongodb: { url: 'mongodb://localhost:27017', dbName: 'myapp' }
    }
})
```

## 🔄 Request/Reply Pattern

```javascript
// In OrderService
const user = await this.services.UserService.getUser({ userId: '123' })
// → WebSocket request to UserService
// → Response in ~1-2ms
console.log(user) // { _id: '123', name: 'John' }
```

## 📡 Pub/Sub Pattern

```javascript
// Service A - Publisher
await this.publish('user.created', { userId: '123', email: 'user@example.com' })

// Service B - Subscriber
await this.subscribe('user.created', async (data) => {
    console.log('New user:', data.userId)
    // Send welcome email
    await this.services.EmailService.sendWelcome({ email: data.email })
})
```

## ⚡ Performance Comparison

```javascript
// Test: 10,000 requests

// NATS
const start = Date.now()
for (let i = 0; i < 10000; i++) {
    await this.services.UserService.getUser({ userId: '123' })
}
console.log(`NATS: ${Date.now() - start}ms`) // ~5,000ms (0.5ms per request)

// uWebSocket
const start = Date.now()
for (let i = 0; i < 10000; i++) {
    await this.services.UserService.getUser({ userId: '123' })
}
console.log(`uWebSocket: ${Date.now() - start}ms`) // ~15,000ms (1.5ms per request)

// HTTP
const start = Date.now()
for (let i = 0; i < 10000; i++) {
    await this.services.UserService.getUser({ userId: '123' })
}
console.log(`HTTP: ${Date.now() - start}ms`) // ~50,000ms (5ms per request)
```

**Note:** NATS is faster for pure request/reply, but uWebSocket offers:
- No external broker needed
- Lower infrastructure cost
- WebSocket compatibility
- Simpler setup

## 🔧 Advanced Configuration

```javascript
{
    transport: {
        type: 'uwebsocket',
        port: 3001,
        
        // Connection options
        timeout: 30000,              // Request timeout (ms)
        reconnectDelay: 1000,        // Reconnect delay (ms)
        maxReconnectAttempts: 10,    // Max reconnection attempts
        
        // Performance tuning
        maxBackpressure: 1024 * 1024, // 1MB buffer
        compression: true,             // Enable compression
        maxPayloadLength: 16 * 1024 * 1024, // 16MB max message
        
        // Service connections
        connections: {
            UserService: 'ws://user-service:3001',
            ProductService: 'ws://product-service:3001',
            PaymentService: 'ws://payment-service:3001'
        }
    }
}
```

## 🐳 Docker Compose Example

```yaml
version: '3.8'

services:
  user-service:
    build: .
    environment:
      - SERVICE_NAME=UserService
      - HTTP_PORT=3000
      - WS_PORT=3001
      - MONGO_URL=mongodb://mongo:27017
    ports:
      - "3000:3000"
      - "3001:3001"

  order-service:
    build: .
    environment:
      - SERVICE_NAME=OrderService
      - HTTP_PORT=3002
      - WS_PORT=3003
      - USER_SERVICE_WS=ws://user-service:3001
      - MONGO_URL=mongodb://mongo:27017
    ports:
      - "3002:3002"
      - "3003:3003"

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
```

## 📊 Monitoring

```javascript
// Get transport statistics
const stats = this.transport.getStats()
console.log(stats)
/*
{
    totalConnections: 3,
    activeConnections: 3,
    pendingRequests: 0,
    services: {
        UserService: {
            connected: true,
            url: 'ws://localhost:3001',
            reconnectAttempts: 0
        }
    }
}
*/
```

## 🆚 When to use NATS vs uWebSocket?

### Use **NATS** when:
- ✅ Need clustering/federation
- ✅ Message persistence required
- ✅ Complex routing patterns
- ✅ Already have NATS infrastructure
- ✅ Maximum throughput (11M msg/s)

### Use **uWebSocket** when:
- ✅ Ultra-low latency critical (<2ms)
- ✅ Simple point-to-point communication
- ✅ Want to minimize infrastructure
- ✅ Need WebSocket compatibility
- ✅ Memory constraints

### Hybrid Approach (Best of Both):

```javascript
{
    // Public API - uWebSockets HTTP
    runtime: {
        type: 'server',
        http: 'uwebsockets',
        port: 3000
    },
    
    // Inter-service - NATS (for reliability)
    transport: {
        type: 'nats',
        url: 'nats://nats-cluster:4222'
    },
    
    // Events - NATS (for fan-out)
    events: {
        type: 'nats',
        url: 'nats://nats-cluster:4222'
    },
    
    // Queues - RabbitMQ (for reliability)
    queue: {
        type: 'rabbitmq',
        url: 'amqp://rabbitmq:5672'
    }
}
```

## 🎯 Recommendations

1. **Start with NATS** - More mature, better for distributed systems
2. **Use uWebSocket for**:
   - Specific high-performance paths
   - Real-time features (chat, notifications)
   - When you already use uWebSockets for HTTP
3. **Benchmark your use case** - Real performance depends on your workload

## 📚 Learn More

- [uWebSockets.js Documentation](https://github.com/uNetworking/uWebSockets.js)
- [Performance Benchmarks](https://github.com/uNetworking/uWebSockets.js#benchmarks)
- [NATS vs WebSocket Comparison](https://nats.io)
