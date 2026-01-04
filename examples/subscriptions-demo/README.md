# WebSocket Subscriptions Demo

Real-time GraphQL subscriptions using **uWebSockets.js** for ultra-high performance.

## Features

- ✅ **Ultra-Fast WebSocket** - uWebSockets.js (C++ core, 3M+ connections/core)
- ✅ **GraphQL Subscriptions** - Real-time data updates
- ✅ **Multiple PubSub Backends** - Memory, Redis, NATS
- ✅ **@Subscribe Decorators** - Easy subscription definition
- ✅ **Authentication** - Token-based auth with connection params
- ✅ **Filtering** - Server-side subscription filtering
- ✅ **Compression** - Automatic message compression
- ✅ **Backpressure Handling** - Automatic flow control
- ✅ **Heartbeat/Ping-Pong** - Connection health monitoring
- ✅ **Graceful Reconnection** - Automatic reconnection on disconnect

## Installation

```bash
npm install
```

### Dependencies

- **uWebSockets.js** - High-performance WebSocket server
- **graphql** - GraphQL execution engine
- **redis** (optional) - For distributed PubSub
- **nats** (optional) - For NATS-based PubSub

## Usage

### Start Server

```bash
npm start
```

Server will start on `ws://localhost:4000/graphql`

### Open Web Client

Open `client.html` in your browser to see real-time subscriptions in action.

Or use GraphQL Playground/Apollo Studio with:
- **URL**: `ws://localhost:4000/graphql`
- **Protocol**: `graphql-transport-ws`
- **Connection params**: `{ "username": "YourName" }`

## Subscriptions

### 1. Message Subscription

Subscribe to chat messages in real-time:

```graphql
subscription {
  messageSent(chatId: "chat1") {
    id
    userId
    username
    text
    createdAt
  }
}
```

Send a message:

```graphql
mutation {
  sendMessage(chatId: "chat1", text: "Hello, world!") {
    id
    text
  }
}
```

### 2. Notification Subscription

Subscribe to user notifications:

```graphql
subscription {
  notificationReceived {
    id
    type
    title
    message
    read
    createdAt
  }
}
```

Create a notification:

```graphql
mutation {
  createNotification(
    userId: "user1"
    type: "info"
    title: "New Message"
    message: "You have a new message!"
  ) {
    id
  }
}
```

### 3. Typing Indicator Subscription

Subscribe to typing indicators:

```graphql
subscription {
  userTyping(chatId: "chat1") {
    userId
    username
    isTyping
  }
}
```

Set typing status:

```graphql
mutation {
  setTyping(chatId: "chat1", isTyping: true)
}
```

### 4. User Presence Subscription

Subscribe to user presence changes:

```graphql
subscription {
  userPresenceChanged {
    userId
    username
    status
    lastSeen
  }
}
```

Update presence:

```graphql
mutation {
  updatePresence(status: "online") {
    userId
    status
  }
}
```

### 5. Post Likes Subscription

Subscribe to post like events:

```graphql
subscription {
  postLiked(postId: "post123") {
    id
    likes
    updatedAt
  }
}
```

Like a post:

```graphql
mutation {
  likePost(postId: "post123") {
    id
    likes
  }
}
```

## Architecture

### Subscription Manager

Core component that manages WebSocket connections and subscriptions:

```javascript
const subscriptionManager = new SubscriptionManager({
  transport: 'uwebsockets',
  pubsub: 'redis',
  schema: graphqlSchema,
  authenticate: async (connectionParams) => {
    // Verify token, return user context
    return { userId: '123', username: 'John' };
  }
});
```

### @Subscribe Decorator

Define subscriptions with decorators:

```javascript
class ChatService {
  @Subscribe({
    topic: 'message.sent',
    filter: (payload, variables) => payload.chatId === variables.chatId
  })
  async messageSent(payload, variables, context) {
    return { messageSent: payload };
  }
}
```

### Publisher

Publish events to subscriptions:

```javascript
const publisher = new SubscriptionPublisher(subscriptionManager);

await publisher.publish('message.sent', {
  id: '1',
  chatId: 'chat1',
  userId: 'user1',
  text: 'Hello!'
});
```

## Transport: uWebSockets.js

uWebSockets.js is the **fastest WebSocket server** available:

### Performance

- **3M+ connections per core** (vs ~100k for ws library)
- **Ultra-low latency** (< 1ms per message)
- **Minimal memory usage** (C++ core)
- **Native compression** (shared compressor)
- **Backpressure handling** (automatic flow control)

### Configuration

```javascript
{
  transport: 'uwebsockets',
  transportOptions: {
    port: 4000,
    path: '/graphql',
    compression: true,              // Enable compression
    maxPayloadLength: 16 * 1024 * 1024,  // 16MB
    maxBackpressure: 1024 * 1024,   // 1MB
    idleTimeout: 120,               // 120 seconds
    ssl: {                          // Optional SSL
      key: 'path/to/key.pem',
      cert: 'path/to/cert.pem'
    }
  }
}
```

### Backpressure

uWebSockets.js automatically handles backpressure:

```javascript
const buffered = ws.getBufferedAmount();
if (buffered > maxBackpressure) {
  // Slow down or drop messages
}
```

## PubSub Backends

### Memory (Development)

```javascript
{
  pubsub: 'memory'
}
```

Pros:
- ✅ No external dependencies
- ✅ Fast for single instance
- ❌ Not distributed
- ❌ Lost on restart

### Redis (Production)

```javascript
{
  pubsub: 'redis',
  pubsubOptions: {
    url: 'redis://localhost:6379'
  }
}
```

Pros:
- ✅ Distributed across instances
- ✅ Persistent (optional)
- ✅ Battle-tested
- ❌ Network latency

### NATS (High Performance)

```javascript
{
  pubsub: 'nats',
  pubsubOptions: {
    servers: ['nats://localhost:4222']
  }
}
```

Pros:
- ✅ Extremely fast
- ✅ Built for distributed systems
- ✅ Low latency
- ❌ Requires NATS server

## Authentication

### Connection Params

Pass authentication in connection params:

```javascript
{
  type: 'connection_init',
  payload: {
    token: 'your-jwt-token',
    username: 'John Doe'
  }
}
```

### Server-Side

```javascript
authenticate: async (connectionParams) => {
  const { token } = connectionParams;
  
  // Verify JWT
  const user = await verifyToken(token);
  
  if (!user) {
    throw new Error('Authentication failed');
  }
  
  return {
    userId: user.id,
    username: user.name,
    roles: user.roles
  };
}
```

### Require Auth in Subscription

```javascript
@Subscribe({
  topic: 'notification.created',
  requireAuth: true,
  roles: ['user', 'admin']
})
async notificationReceived(payload, variables, context) {
  // Only authenticated users with proper roles
  return { notificationReceived: payload };
}
```

## Filtering

### Server-Side Filtering

```javascript
@Subscribe({
  topic: 'message.sent',
  filter: (payload, variables, context) => {
    // Only send messages for specific chat
    return payload.chatId === variables.chatId;
  }
})
async messageSent(payload, variables, context) {
  return { messageSent: payload };
}
```

### User-Specific Topics

```javascript
// Publish to user-specific topic
await publisher.publishToUser(userId, 'notification', {
  title: 'New Message',
  message: 'You have a new message'
});

// Subscribe
@Subscribe({
  topic: 'notification.created',
  filter: (payload, variables, context) => 
    payload.userId === context.userId
})
```

## Testing

### Using wscat

```bash
# Install wscat
npm install -g wscat

# Connect
wscat -c ws://localhost:4000/graphql -s graphql-transport-ws

# Send connection init
{"type":"connection_init","payload":{"username":"Test"}}

# Subscribe
{"id":"1","type":"subscribe","payload":{"query":"subscription { messageSent(chatId: \"chat1\") { id text } }"}}
```

### Using curl (for mutations)

```bash
# Send message
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { sendMessage(chatId: \"chat1\", text: \"Hello\") { id } }"}'
```

## Production Deployment

### 1. Use Redis PubSub

```javascript
{
  pubsub: 'redis',
  pubsubOptions: {
    url: process.env.REDIS_URL
  }
}
```

### 2. Enable SSL/TLS

```javascript
{
  transportOptions: {
    ssl: {
      key: '/path/to/privkey.pem',
      cert: '/path/to/fullchain.pem'
    }
  }
}
```

### 3. Configure Limits

```javascript
{
  transportOptions: {
    maxPayloadLength: 16 * 1024 * 1024,  // 16MB
    maxBackpressure: 1024 * 1024,         // 1MB
    idleTimeout: 120,                     // 120s
    compression: true
  }
}
```

### 4. Load Balancing

Use sticky sessions with load balancer:

**NGINX:**
```nginx
upstream websocket {
  ip_hash;  # Sticky sessions
  server 127.0.0.1:4000;
  server 127.0.0.1:4001;
  server 127.0.0.1:4002;
}

server {
  location /graphql {
    proxy_pass http://websocket;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

### 5. Monitoring

```javascript
// Get statistics
const stats = subscriptionManager.getStats();
console.log(`Connections: ${stats.connections}`);
console.log(`Subscriptions: ${stats.subscriptions}`);

// Events
subscriptionManager.on('connection:open', (connection) => {
  console.log(`Client connected: ${connection.id}`);
});

subscriptionManager.on('subscription:start', (subscription) => {
  console.log(`Subscription started: ${subscription.id}`);
});
```

## Performance Benchmarks

### uWebSockets.js vs ws

| Metric | uWebSockets.js | ws (node) |
|--------|---------------|-----------|
| Connections/core | 3M+ | ~100k |
| Latency | < 1ms | 5-10ms |
| Memory/connection | ~1KB | ~10KB |
| Throughput | 10M+ msg/s | ~100k msg/s |
| CPU usage | Very low | Medium |

### Test Setup

```bash
# Install artillery for load testing
npm install -g artillery

# Create test config
cat > artillery.yml <<EOF
config:
  target: "ws://localhost:4000"
  phases:
    - duration: 60
      arrivalRate: 100
  engines:
    ws:
      subprotocols: ["graphql-transport-ws"]
scenarios:
  - engine: ws
    flow:
      - send:
          channel: ""
          data: '{"type":"connection_init"}'
      - think: 1
      - send:
          channel: ""
          data: '{"id":"1","type":"subscribe","payload":{"query":"subscription { messageSent(chatId: \"chat1\") { id text } }"}}'
EOF

# Run test
artillery run artillery.yml
```

## Troubleshooting

### Connection Timeouts

Increase `idleTimeout`:

```javascript
{
  transportOptions: {
    idleTimeout: 300  // 5 minutes
  }
}
```

### Backpressure Issues

Increase `maxBackpressure`:

```javascript
{
  transportOptions: {
    maxBackpressure: 5 * 1024 * 1024  // 5MB
  }
}
```

### Memory Leaks

Monitor subscriptions and clean up:

```javascript
subscriptionManager.on('subscription:stop', (subscription) => {
  // Cleanup resources
});
```

## License

ISC
