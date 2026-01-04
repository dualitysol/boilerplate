# Todo App - Monolith Example

A complete Todo application built as a monolith using the @dualitysol/boilerplate framework.

## Features

- ✅ User authentication and authorization
- ✅ Create, read, update, delete todos
- ✅ GraphQL API
- ✅ In-memory storage (easily swappable to PostgreSQL/MongoDB)
- ✅ Event-driven architecture
- ✅ Task queue for background processing

## Architecture

This is a **monolith** application where all services run in a single process:
- **UserService** - Handles user management and authentication
- **TodoService** - Manages todo items and categories
- **NotificationService** - Sends notifications when todos are created/completed

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run in production mode
npm start
```

## API Endpoints

The GraphQL API will be available at: `http://localhost:4000/graphql`

### Sample Queries

```graphql
# Get current user
query {
  me {
    id
    username
    email
  }
}

# Get all todos
query {
  todos {
    id
    title
    completed
    createdAt
  }
}

# Get single todo
query {
  todo(id: "1") {
    id
    title
    description
    completed
    category
    dueDate
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
  }) {
    success
    message
    user {
      id
      username
    }
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
    todo {
      id
      title
      completed
    }
  }
}

# Update todo
mutation {
  updateTodo(id: "1", input: {
    completed: true
  }) {
    success
    todo {
      id
      completed
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

## Project Structure

```
todo-app-monolith/
├── src/
│   ├── index.js              # Application entry point
│   ├── services/
│   │   ├── UserService.js    # User management
│   │   ├── TodoService.js    # Todo management
│   │   └── NotificationService.js  # Notifications
│   ├── graphql/
│   │   ├── schema.graphql    # GraphQL schema
│   │   └── resolvers.js      # GraphQL resolvers
│   └── storage/
│       └── InMemoryStorage.js  # Simple in-memory storage
├── package.json
└── README.md
```

## Storage

By default, this example uses in-memory storage. To switch to PostgreSQL or MongoDB:

```javascript
// In src/index.js
import { PostgreSQL } from '@dualitysol/boilerplate/storage/databases/postgres';
// or
import { MongoDB } from '@dualitysol/boilerplate/storage/databases/mongodb';

const storage = new PostgreSQL({
  host: 'localhost',
  database: 'todoapp',
  user: 'postgres',
  password: 'password'
});
```

## Event System

The app uses an event-driven architecture:

```javascript
// Todo created event
eventBus.publish('todo.created', { todoId, userId, title });

// Todo completed event
eventBus.publish('todo.completed', { todoId, userId });

// User registered event
eventBus.publish('user.registered', { userId, email });
```

Services can subscribe to these events:

```javascript
// NotificationService listens for todo events
eventBus.subscribe('todo.created', async (data) => {
  await sendNotification(data.userId, `New todo: ${data.title}`);
});
```

## Next Steps

- Add authentication with JWT
- Connect to real database (PostgreSQL/MongoDB)
- Add file uploads for todo attachments
- Add real-time subscriptions with GraphQL
- Deploy to AWS Lambda or Kubernetes

## Learn More

- [Boilerplate Documentation](../../README.md)
- [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
