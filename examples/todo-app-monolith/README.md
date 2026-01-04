# Todo App - Monolith Example

A complete Todo application demonstrating the **@dualitysol/boilerplate** framework with modern features:

- ✅ **Entity-First Development** - Auto-generate GraphQL schemas and DB migrations
- ✅ **Distributed Tracing** - Monitor and debug with Native Node.js or OpenTelemetry
- ✅ **Three Services** - User, Todo, and Notification services
- ✅ **Event-Driven** - Services communicate via events
- ✅ **GraphQL API** - Single endpoint for all operations
- ✅ **In-Memory Storage** - No external dependencies needed

## What's New in This Version

### 🆕 Entity-First Development

Each service now has an `entity/` folder containing the single source of truth for data models:

```
services/
├── TodoService/
│   ├── entity/
│   │   └── Todo.js          # 👈 Define entity once
│   ├── model/               # Business logic
│   ├── resolvers/           # Auto-generated
│   ├── typeDefinitions/     # Auto-generated
│   └── queryMutation/
```

**Benefits:**
- Define entity once with JSDoc
- Auto-generate GraphQL schema
- Auto-generate database migrations
- Full type safety via .d.ts files

**Example Entity** (`services/TodoService/entity/Todo.js`):

```javascript
/**
 * @type {string}
 * @description Todo title
 * @required
 * @minLength 1
 * @maxLength 255
 */
title

/**
 * @type {boolean}
 * @description Completion status
 * @required
 * @default false
 */
completed
```

Run sync command:
```bash
npm run sync:entity TodoService Todo
```

This generates:
- ✅ GraphQL type definitions
- ✅ GraphQL Query/Mutation types
- ✅ Database migration (MongoDB/SQL)
- ✅ Resolvers (if they don't exist)

### 🆕 Distributed Tracing

Monitor your application in real-time:

```javascript
// boilerplate.config.js
features: {
  tracing: {
    enabled: true,
    provider: 'native', // or 'opentelemetry'
    config: {
      serviceName: 'todo-app-monolith',
      exporter: 'console' // or 'jaeger', 'file'
    }
  }
}
```

**What gets traced:**
- HTTP requests
- GraphQL operations
- Database queries
- Event bus messages
- Service-to-service calls

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure (Optional)

```bash
# .env
NODE_ENV=development
PORT=4000

# Enable tracing (optional)
TRACING_ENABLED=true
TRACING_PROVIDER=native

# Enable metrics (optional)
METRICS_ENABLED=true
```

### 3. Run Application

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The GraphQL API will be available at: `http://localhost:4000/graphql`

### 4. Sync Entities (Optional)

If you modify entities, run:

```bash
# Sync single entity
npm run sync:entity TodoService Todo

# Sync all entities
npm run sync:entity --all
```

## Architecture

### Services

#### UserService
- User registration and authentication
- User profile management
- Role-based access control

**Entity:** `services/UserService/entity/User.js`
- Fields: id, email, name, avatar, password, emailVerified, roles
- Methods: hasRole(), isAdmin(), verifyEmail()

#### TodoService
- Todo CRUD operations
- Priority management
- Due date tracking
- Tag-based categorization

**Entity:** `services/TodoService/entity/Todo.js`
- Fields: id, title, description, completed, userId, priority, dueDate, tags
- Methods: isOverdue(), markCompleted(), markIncomplete()

#### NotificationService
- Send notifications on todo events
- Mark notifications as read/unread
- Get unread notification count

**Entity:** `services/NotificationService/entity/Notification.js`
- Fields: id, userId, type, title, message, read, readAt
- Methods: markAsRead(), markAsUnread(), isRecent()

### Event Flow

```
User creates todo
      ↓
TodoService.createTodo()
      ↓
Emit "todo.created" event
      ↓
NotificationService listens
      ↓
Create notification
      ↓
Emit "notification.sent" event
```

## API Examples

### GraphQL Playground

Visit `http://localhost:4000/graphql` for interactive API exploration.

### Create User

```graphql
mutation {
  createUser(input: {
    email: "john@example.com"
    name: "John Doe"
    password: "secret123"
  }) {
    id
    email
    name
  }
}
```

### Create Todo

```graphql
mutation {
  createTodo(input: {
    title: "Buy groceries"
    description: "Milk, eggs, bread"
    priority: 4
    dueDate: "2024-12-10"
    tags: ["shopping", "urgent"]
  }) {
    id
    title
    completed
    priority
    dueDate
  }
}
```

### Get All Todos

```graphql
query {
  todos(limit: 10, offset: 0) {
    id
    title
    description
    completed
    priority
    dueDate
    tags
    createdAt
  }
}
```

### Mark Todo as Complete

```graphql
mutation {
  updateTodo(id: "todo123", input: {
    completed: true
  }) {
    id
    completed
  }
}
```

### Get Notifications

```graphql
query {
  notifications(userId: "user123", limit: 5) {
    id
    type
    title
    message
    read
    createdAt
  }
}
```

## Entity-First Workflow

### 1. Define Entity

Edit `services/TodoService/entity/Todo.js`:

```javascript
/**
 * @type {string}
 * @description Todo category
 * @required
 */
category
```

### 2. Sync Entity

```bash
npm run sync:entity TodoService Todo
```

This automatically:
- ✅ Updates GraphQL schema
- ✅ Creates migration file
- ✅ Updates resolvers
- ✅ Generates .d.ts types

### 3. Run Migration

```bash
npm run migrate:up
```

### 4. Start Using

```graphql
mutation {
  createTodo(input: {
    title: "Test"
    category: "work"  # 👈 New field
  }) {
    id
    category
  }
}
```

## Tracing Examples

### Enable Tracing

```bash
# .env
TRACING_ENABLED=true
```

### Console Output

```
📊 Trace: GraphQL:createTodo
  ├─ Span: TodoService.createTodo
  │   ├─ Attribute: user.id = user123
  │   ├─ Attribute: todo.title = "Buy groceries"
  │   └─ Duration: 15ms
  ├─ Span: Database.insert
  │   ├─ Attribute: collection = todos
  │   └─ Duration: 3ms
  └─ Span: EventBus.publish
      ├─ Attribute: event = todo.created
      └─ Duration: 1ms
Total: 19ms
```

### Jaeger Integration

```javascript
// boilerplate.config.js
features: {
  tracing: {
    enabled: true,
    provider: 'opentelemetry',
    config: {
      endpoint: 'http://localhost:4318/v1/traces'
    }
  }
}
```

Start Jaeger:
```bash
docker run -d -p 16686:16686 -p 4318:4318 jaegertracing/all-in-one
```

View traces: `http://localhost:16686`

## Project Structure

```
todo-app-monolith/
├── boilerplate.config.js    # Configuration
├── index.js                  # Entry point
├── package.json
├── .env.example
├── services/
│   ├── UserService/
│   │   ├── entity/
│   │   │   └── User.js      # 👈 Entity definition
│   │   ├── model/
│   │   │   └── index.js     # Business logic
│   │   ├── resolvers/
│   │   │   └── index.js     # GraphQL resolvers
│   │   ├── typeDefinitions/
│   │   │   └── index.gql    # GraphQL schema
│   │   └── queryMutation/
│   │       └── index.js
│   ├── TodoService/
│   │   ├── entity/
│   │   │   └── Todo.js      # 👈 Entity definition
│   │   ├── model/
│   │   ├── resolvers/
│   │   ├── typeDefinitions/
│   │   └── queryMutation/
│   └── NotificationService/
│       ├── entity/
│       │   └── Notification.js  # 👈 Entity definition
│       ├── model/
│       ├── resolvers/
│       ├── typeDefinitions/
│       └── queryMutation/
└── migrations/              # Auto-generated
    ├── 2024-12-04-create-user.js
    ├── 2024-12-04-create-todo.js
    └── 2024-12-04-create-notification.js
```

## Configuration

### Database

Switch from in-memory to MongoDB:

```javascript
// boilerplate.config.js
databases: {
  primary: {
    type: 'mongodb',
    config: {
      url: process.env.MONGODB_URL || 'mongodb://localhost:27017/todo_app'
    }
  }
}
```

### Cache

Enable Redis cache:

```javascript
databases: {
  cache: {
    enabled: true,
    type: 'redis',
    config: {
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    }
  }
}
```

### Event Bus

Switch to NATS for distributed events:

```javascript
eventBus: {
  type: 'nats',
  config: {
    servers: [process.env.NATS_URL || 'nats://localhost:4222']
  }
}
```

## Development

### Watch Mode

```bash
npm run dev
```

### Sync Entities on Change

```bash
# Watch for entity changes and auto-sync
npm run dev:entities
```

### View Logs

```bash
# Tail application logs
npm run logs

# View traces
npm run traces
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific service tests
npm run test:service TodoService
```

## Deployment

### Docker

```bash
# Build image
docker build -t todo-app .

# Run container
docker run -p 4000:4000 todo-app
```

### Kubernetes

```bash
# Apply manifests
kubectl apply -f k8s/

# Check status
kubectl get pods
```

## Learn More

- [Entity-First Development](../../docs/ENTITY_FIRST.md)
- [Distributed Tracing](../../docs/TRACING.md)
- [CLI Reference](../../docs/CLI_REFERENCE.md)
- [Boilerplate Documentation](../../README.md)

## License

ISC

---

**Built with ❤️ using @dualitysol/boilerplate**
