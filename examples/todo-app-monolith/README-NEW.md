# Todo App - Monolith Example (Unified Architecture)

A complete Todo application built with the @dualitysol/boilerplate framework using the **unified service structure**. This example demonstrates how to build a monolith application where all services share the same consistent structure.

## 🎯 What This Example Demonstrates

- ✅ **Unified Service Structure** - All services use identical folder layout
- ✅ **Config-Driven Architecture** - All infrastructure defined in `boilerplate.config.js`
- ✅ **Auto-Discovery** - Services automatically discovered and wired
- ✅ **GraphQL API** - Aggregated schema from all services
- ✅ **Event-Driven** - Services communicate via events
- ✅ **Queue Processing** - Background jobs with queue manager
- ✅ **In-Memory Storage** - No external dependencies for quick start

## 📁 Unified Service Structure

**Every service follows the same pattern:**

```
services/UserService/
├── model/
│   └── index.js           # Business logic (UserModel class)
├── resolvers/
│   └── index.js           # GraphQL resolvers
├── queryMutation/
│   └── index.js           # GraphQL operation helpers
├── typeDefinitions/
│   └── index.gql          # GraphQL schema
└── tests/
    └── service.test.js    # Unit tests
```

## 🏗️ Architecture

### Services

1. **UserService** - User management and authentication
   - Register/login users
   - User profiles
   - Password hashing

2. **TodoService** - Todo item management
   - CRUD operations for todos
   - Category filtering
   - Completion tracking
   - Statistics

3. **NotificationService** - Event-based notifications
   - Welcome messages
   - Todo creation alerts
   - Completion celebrations
   - Queue processing

### Configuration (`boilerplate.config.js`)

```javascript
{
  type: 'monolith',
  transport: { type: 'http', port: 4000 },
  eventBus: { type: 'local' },
  queue: { type: 'local' },
  databases: { primary: { type: 'memory' } },
  graphql: { mode: 'monolith' }
}
```

### Event Flow

```
UserService → user.registered → NotificationService → Welcome notification
                             → TodoService → Create welcome todo

TodoService → todo.created → NotificationService → Creation notification
           → todo.completed → NotificationService → Completion notification
```

## 🚀 Getting Started

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

The server will start at `http://localhost:4000`

### Access GraphQL Playground

Open `http://localhost:4000/graphql` in your browser

## 📊 GraphQL API

### Sample Queries

```graphql
# Get current user
query {
  me {
    id
    username
    email
    createdAt
  }
}

# Get all todos
query {
  todos {
    id
    title
    completed
    category
    user {
      username
    }
  }
}

# Get my todos
query {
  myTodos(completed: false) {
    id
    title
    dueDate
  }
}

# Get todo statistics
query {
  todoStats {
    total
    completed
    pending
    completionRate
  }
}
```

### Sample Mutations

```graphql
# Register user
mutation {
  registerUser(input: {
    username: "john"
    email: "john@example.com"
    password: "secret123"
    firstName: "John"
    lastName: "Doe"
  }) {
    success
    message
    user {
      id
      username
    }
    token
  }
}

# Login
mutation {
  loginUser(input: {
    username: "john"
    password: "secret123"
  }) {
    success
    user {
      id
      username
      email
    }
    token
  }
}

# Create todo
mutation {
  createTodo(input: {
    title: "Buy groceries"
    description: "Milk, bread, eggs"
    category: "shopping"
    dueDate: "2025-12-10"
  }) {
    success
    message
    todo {
      id
      title
      completed
    }
  }
}

# Toggle todo
mutation {
  toggleTodo(id: "1") {
    success
    todo {
      id
      completed
      updatedAt
    }
  }
}

# Delete todo
mutation {
  deleteTodo(id: "1") {
    success
    message
  }
}
```

## 🔧 Switching to Production

### Use PostgreSQL Database

Edit `boilerplate.config.js`:

```javascript
databases: {
  primary: {
    type: 'postgres',
    config: {
      host: 'localhost',
      port: 5432,
      database: 'todo_app',
      user: 'postgres',
      password: 'your_password'
    }
  }
}
```

### Use NATS for Events

```javascript
eventBus: {
  type: 'nats',
  config: {
    servers: ['nats://localhost:4222']
  }
}
```

### Use Redis for Queues

```javascript
queue: {
  type: 'redis',
  config: {
    url: 'redis://localhost:6379'
  }
}
```

### Enable Caching

```javascript
databases: {
  primary: { type: 'postgres', config: {...} },
  cache: {
    enabled: true,
    type: 'redis',
    config: { url: 'redis://localhost:6379' }
  }
}
```

## 🧪 Testing

```bash
npm test
```

Each service has unit tests in `tests/service.test.js`

## 📦 Migration Path

This monolith can easily become microservices:

1. Change `boilerplate.config.js`:
   ```javascript
   {
     type: 'microservices',
     transport: { type: 'nats' },
     graphql: { mode: 'federated' }
   }
   ```

2. Deploy each service separately
3. **No code changes needed!** Same structure works everywhere

## 🎓 Learning Points

### 1. Service Independence

Each service is self-contained:
- Own business logic in `model/`
- Own GraphQL schema in `typeDefinitions/`
- Own resolvers in `resolvers/`
- Own tests in `tests/`

### 2. Dependency Injection

Bootstrap automatically injects dependencies:

```javascript
class UserModel {
  constructor({ storage, eventBus, queueManager }) {
    // Dependencies provided by bootstrap
  }
}
```

### 3. Event-Driven Communication

Services don't directly depend on each other:

```javascript
// TodoService publishes event
await this.eventBus.publish('todo.created', data);

// NotificationService subscribes
await this.eventBus.subscribe('todo.created', handler);
```

### 4. Configuration Over Code

Infrastructure is configured, not hardcoded:

```javascript
// ❌ Old way
const nats = connect('nats://localhost:4222');

// ✅ New way
// In boilerplate.config.js:
eventBus: { type: 'nats' }
```

## 📚 Next Steps

- Add JWT authentication
- Implement authorization with decorators
- Add file uploads for todo attachments
- Add real-time subscriptions
- Deploy to cloud (AWS/GCP/Azure)

## 🔗 Related Examples

- [E-commerce Microservices](../ecommerce-microservices/) - Same structure, different deployment
- [Serverless Lambda](../serverless-lambda/) - Same structure, serverless deployment

## 📖 Documentation

- [Bootstrap Architecture](../../BOOTSTRAP.md)
- [Framework Documentation](../../README.md)
- [Migration Guide](../../MIGRATION.md)

---

**Key Insight**: This exact same service structure works for monoliths, microservices, and serverless. Only the configuration changes!
