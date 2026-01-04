# Quick Start Example - Unified Boilerplate

Complete example of using the new unified features.

## Step 1: Initialize Project

```bash
npx @dualitysol/boilerplate init \
  --name todo-app \
  --template monolith \
  --typescript
```

This creates:
```
todo-app/
├── services/
│   └── ExampleService/
├── src/
│   └── index.js
├── types/
├── boilerplate.config.js
├── .env.example
├── package.json
└── README.md
```

## Step 2: Install Dependencies

```bash
cd todo-app
npm install
```

## Step 3: Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
# Database
DATABASE_URL=mongodb://localhost:27017
DATABASE_NAME=todo-app

# Server
PORT=4000
NODE_ENV=development

# Logging
LOG_LEVEL=info
```

## Step 4: Create Todo Service

**services/TodoService/entity/Todo.js:**
```javascript
/**
 * Todo Entity
 */
export class Todo {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.completed = data.completed || false;
    this.priority = data.priority || 1;
    this.tags = data.tags || [];
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  validate() {
    const errors = [];
    if (!this.title) errors.push('Title is required');
    if (this.priority < 1 || this.priority > 5) {
      errors.push('Priority must be between 1 and 5');
    }
    return errors;
  }
}
```

**services/TodoService/service/TodoService.js:**
```javascript
import { Microservice } from '@dualitysol/boilerplate';
import { Todo } from '../entity/Todo.js';

/**
 * TodoService - Manages todo items
 * @service
 */
export class TodoService extends Microservice {
  get collectionName() {
    return 'todos';
  }

  async initialize() {
    this.info('TodoService initialized');
    
    // Subscribe to events
    await this.subscribe('todo.created', this.onTodoCreated.bind(this));
  }

  /**
   * Create a new todo
   * @param {Object} input - Todo creation data
   * @param {string} input.title - Todo title
   * @param {string} [input.description] - Todo description
   * @param {number} [input.priority] - Priority level (1-5)
   * @param {string[]} [input.tags] - Todo tags
   * @returns {Promise<Todo>}
   */
  async createTodo(input) {
    const todo = new Todo(input);
    
    // Validate
    const errors = todo.validate();
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
    
    // Save to database
    const saved = await this.createOne(todo);
    
    // Publish event
    await this.publish('todo.created', saved);
    
    return new Todo(saved);
  }

  /**
   * Get todo by ID
   * @param {string} id - Todo ID
   * @returns {Promise<Todo|null>}
   */
  async getTodo(id) {
    const data = await this.findOne({ _id: id });
    return data ? new Todo(data) : null;
  }

  /**
   * Get all todos with filtering
   * @param {Object} [filter] - Filter options
   * @param {boolean} [filter.completed] - Filter by completed status
   * @param {string[]} [filter.tags] - Filter by tags
   * @param {number} [filter.limit] - Limit results
   * @param {number} [filter.skip] - Skip results
   * @returns {Promise<Todo[]>}
   */
  async getTodos(filter = {}) {
    const { completed, tags, limit = 10, skip = 0 } = filter;
    
    const query = {};
    if (completed !== undefined) query.completed = completed;
    if (tags && tags.length > 0) query.tags = { $in: tags };
    
    const results = await this.findMany(query, { limit, skip });
    return results.map(data => new Todo(data));
  }

  /**
   * Update todo
   * @param {string} id - Todo ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Todo>}
   */
  async updateTodo(id, updates) {
    updates.updatedAt = new Date();
    
    const updated = await this.updateOne({ _id: id }, updates);
    
    if (updated) {
      await this.publish('todo.updated', updated);
    }
    
    return updated ? new Todo(updated) : null;
  }

  /**
   * Delete todo
   * @param {string} id - Todo ID
   * @returns {Promise<boolean>}
   */
  async deleteTodo(id) {
    const deleted = await this.deleteOne({ _id: id });
    
    if (deleted) {
      await this.publish('todo.deleted', { id });
    }
    
    return deleted;
  }

  /**
   * Event handler: Todo created
   */
  async onTodoCreated(data) {
    this.info('Todo created:', data.title);
    
    // Example: Send notification
    // await this.services.NotificationService.sendNotification({
    //   message: `New todo: ${data.title}`
    // });
  }
}
```

**services/TodoService/resolvers/index.js:**
```javascript
/**
 * TodoService GraphQL Resolvers
 */
export const resolvers = {
  Query: {
    /**
     * Get todo by ID
     */
    todo: async (_parent, { id }, { services }) => {
      return services.TodoService.getTodo(id);
    },
    
    /**
     * Get all todos
     */
    todos: async (_parent, { filter }, { services }) => {
      return services.TodoService.getTodos(filter);
    }
  },
  
  Mutation: {
    /**
     * Create new todo
     */
    createTodo: async (_parent, { input }, { services }) => {
      const todo = await services.TodoService.createTodo(input);
      
      return {
        success: true,
        message: 'Todo created successfully',
        data: todo
      };
    },
    
    /**
     * Update todo
     */
    updateTodo: async (_parent, { id, input }, { services }) => {
      const todo = await services.TodoService.updateTodo(id, input);
      
      if (!todo) {
        return {
          success: false,
          message: 'Todo not found'
        };
      }
      
      return {
        success: true,
        message: 'Todo updated successfully',
        data: todo
      };
    },
    
    /**
     * Delete todo
     */
    deleteTodo: async (_parent, { id }, { services }) => {
      const deleted = await services.TodoService.deleteTodo(id);
      
      return {
        success: deleted,
        message: deleted ? 'Todo deleted successfully' : 'Todo not found'
      };
    }
  }
};
```

**services/TodoService/typeDefinitions/index.gql:**
```graphql
type Todo {
  id: ID!
  title: String!
  description: String
  completed: Boolean!
  priority: Int!
  tags: [String!]!
  createdAt: String!
  updatedAt: String!
}

type TodoResponse {
  success: Boolean!
  message: String
  data: Todo
}

type Query {
  todo(id: ID!): Todo
  todos(filter: TodoFilter): [Todo!]!
}

type Mutation {
  createTodo(input: CreateTodoInput!): TodoResponse!
  updateTodo(id: ID!, input: UpdateTodoInput!): TodoResponse!
  deleteTodo(id: ID!): TodoResponse!
}

input TodoFilter {
  completed: Boolean
  tags: [String!]
  limit: Int
  skip: Int
}

input CreateTodoInput {
  title: String!
  description: String
  priority: Int
  tags: [String!]
}

input UpdateTodoInput {
  title: String
  description: String
  completed: Boolean
  priority: Int
  tags: [String!]
}
```

**services/TodoService/index.js:**
```javascript
export { TodoService } from './service/TodoService.js';
export { resolvers } from './resolvers/index.js';
export { default as typeDefs } from './typeDefinitions/index.gql';
```

## Step 5: Configure Auto-Discovery

**boilerplate.config.js:**
```javascript
export default {
  project: {
    name: 'todo-app',
    version: '1.0.0'
  },

  // Auto-discover services
  services: {
    autoDiscover: {
      enabled: true,
      pattern: 'services/**/index.js'
    }
  },

  // Database configuration
  database: {
    type: 'mongodb',
    url: process.env.DATABASE_URL || 'mongodb://localhost:27017',
    name: process.env.DATABASE_NAME || 'todo-app'
  },

  // HTTP transport
  transport: {
    type: 'http',
    http: {
      port: process.env.PORT || 4000,
      host: '0.0.0.0',
      cors: {
        enabled: true,
        origin: '*'
      }
    }
  },

  // GraphQL configuration
  graphql: {
    enabled: true,
    schema: {
      autoGenerate: true,
      entityFirst: false
    }
  },

  // Health checks
  health: {
    enabled: true,
    endpoint: '/health',
    checks: {
      database: true,
      memory: true
    }
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    pretty: process.env.NODE_ENV !== 'production'
  }
};
```

## Step 6: Generate TypeScript Types

```bash
npm run types:generate
```

This generates:
```
types/
└── TodoService/
    ├── requests/
    │   ├── createTodoInput.d.ts
    │   └── updateTodoInput.d.ts
    ├── filters/
    │   └── getTodosFilter.d.ts
    └── index.d.ts
```

**types/TodoService/requests/createTodoInput.d.ts:**
```typescript
export interface CreateTodoInput {
  /** Todo title */
  title: string;
  
  /** Todo description */
  description?: string;
  
  /** Priority level (1-5) */
  priority?: number;
  
  /** Todo tags */
  tags?: string[];
}
```

## Step 7: Start Development Server

```bash
npm run dev
```

Output:
```
🔍 Discovering services...
   Found 1 potential service files
   ✓ TodoService (services/TodoService/index.js)
✅ Discovered 1 services

❤️ Health checks enabled
   /health - Basic health status
   /health/live - Liveness probe
   /health/ready - Readiness probe

🚀 Starting todo-app...
✓ Database connected
✓ TodoService initialized
✓ Application started successfully
✓ Server running on port 4000
✓ GraphQL endpoint: http://localhost:4000/graphql
✓ Health endpoint: http://localhost:4000/health
```

## Step 8: Test GraphQL API

### Create Todo

```graphql
mutation {
  createTodo(input: {
    title: "Learn Boilerplate Framework"
    description: "Study the new unified features"
    priority: 5
    tags: ["learning", "framework"]
  }) {
    success
    message
    data {
      id
      title
      completed
      priority
      tags
      createdAt
    }
  }
}
```

### Get Todos

```graphql
query {
  todos(filter: { completed: false, limit: 10 }) {
    id
    title
    description
    completed
    priority
    tags
  }
}
```

### Update Todo

```graphql
mutation {
  updateTodo(
    id: "123"
    input: { completed: true }
  ) {
    success
    message
    data {
      id
      completed
      updatedAt
    }
  }
}
```

## Step 9: Check Health Endpoints

### Basic Health

```bash
curl http://localhost:4000/health
```

Response:
```json
{
  "service": "todo-app",
  "status": "UP",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "duration": "15ms"
}
```

### Detailed Health

```bash
curl http://localhost:4000/health/detailed
```

Response:
```json
{
  "service": "todo-app",
  "status": "UP",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "duration": "15ms",
  "checks": [
    {
      "name": "database",
      "status": "UP",
      "duration": "5ms",
      "type": "mongodb",
      "responseTime": "5ms"
    },
    {
      "name": "memory",
      "status": "UP",
      "heapUsed": "45MB",
      "heapTotal": "128MB",
      "heapPercent": "35.16%"
    },
    {
      "name": "uptime",
      "status": "UP",
      "uptime": 120000,
      "uptimeHuman": "2m 0s"
    }
  ],
  "summary": {
    "total": 3,
    "up": 3,
    "down": 0,
    "degraded": 0
  }
}
```

## Step 10: Watch Type Generation

In another terminal:

```bash
npm run types:watch
```

Now when you update JSDoc in your services, types are automatically regenerated!

## What We Got

✅ **Auto-Discovery** - TodoService automatically registered  
✅ **Type Generation** - TypeScript types from JSDoc  
✅ **Health Checks** - Production-ready monitoring  
✅ **GraphQL API** - Fully functional with resolvers  
✅ **Event System** - todo.created, todo.updated, todo.deleted  
✅ **Unified Config** - Environment variables support  
✅ **Development Mode** - Hot reload enabled  

## Next Steps

1. **Add more services:**
   ```bash
   boilerplate service Notification
   ```

2. **Deploy to Kubernetes:**
   - Use `/health/live` and `/health/ready` probes
   - Set environment variables via ConfigMap

3. **Enable Distributed Tracing:**
   ```javascript
   tracing: {
     enabled: true,
     type: 'opentelemetry'
   }
   ```

4. **Add Authentication:**
   ```javascript
   security: {
     auth: {
       enabled: true,
       jwt: { secret: process.env.JWT_SECRET }
     }
   }
   ```

---

**Total Time:** ~10 minutes to full working application! 🚀
