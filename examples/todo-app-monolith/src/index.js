/**
 * Todo App - Monolith Example
 * 
 * A complete todo application demonstrating the @dualitysol/boilerplate framework
 * running as a monolith (all services in one process).
 */

import { createServer } from 'http';
import { createYoga } from 'graphql-yoga';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Boilerplate imports
import EventBus from '@dualitysol/boilerplate/src/events/EventBus.js';
import QueueManager from '@dualitysol/boilerplate/src/queue/index.js';

// Local imports
import { InMemoryStorage } from './storage/InMemoryStorage.js';
import { UserService } from './services/UserService.js';
import { TodoService } from './services/TodoService.js';
import { NotificationService } from './services/NotificationService.js';
import { resolvers } from './graphql/resolvers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load GraphQL schema
const typeDefs = readFileSync(join(__dirname, 'graphql', 'schema.graphql'), 'utf-8');

async function bootstrap() {
  console.log('🚀 Starting Todo App (Monolith)...\n');

  // Initialize core components
  const eventBus = new EventBus({ backend: 'local' });
  await eventBus.connect();

  const queueManager = new QueueManager({ eventBus });
  
  const storage = new InMemoryStorage();
  await storage.connect();

  // Initialize services
  const userService = new UserService({ storage, eventBus });
  await userService.initialize();

  const todoService = new TodoService({ storage, eventBus });
  await todoService.initialize();

  const notificationService = new NotificationService({ eventBus, queueManager });
  await notificationService.initialize();

  console.log('');

  // Create GraphQL schema
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  // Create GraphQL server with Yoga
  const yoga = createYoga({
    schema,
    context: ({ request }) => {
      // In production, parse JWT from Authorization header
      // For demo, we'll use a simple header
      const userId = request.headers.get('x-user-id');
      let currentUser = null;

      if (userId) {
        // This would be async in production with real auth
        currentUser = { id: userId };
      }

      return {
        currentUser,
        userService,
        todoService,
        eventBus,
        queueManager,
      };
    },
    graphiql: {
      title: 'Todo App GraphQL API',
      defaultQuery: `# Welcome to Todo App GraphQL API! 🎉
#
# Try these example queries:

# 1. Register a new user
mutation RegisterUser {
  registerUser(input: {
    username: "alice"
    email: "alice@example.com"
    password: "secret123"
  }) {
    success
    message
    user {
      id
      username
      email
    }
    token
  }
}

# 2. Create a todo (after registration, use the user ID in headers)
mutation CreateTodo {
  createTodo(input: {
    title: "Buy groceries"
    description: "Milk, bread, eggs"
    category: "shopping"
  }) {
    success
    todo {
      id
      title
      completed
    }
  }
}

# 3. Get all todos
query GetTodos {
  todos {
    id
    title
    description
    completed
    category
    user {
      username
    }
  }
}

# 4. Get my todos (requires authentication)
query MyTodos {
  myTodos {
    id
    title
    completed
  }
}

# Note: To authenticate, add this HTTP header:
# x-user-id: <your-user-id-from-registration>
`
    },
  });

  // Create HTTP server
  const server = createServer(yoga);
  const PORT = process.env.PORT || 4000;

  server.listen(PORT, () => {
    console.log(`\n🎯 Todo App is running!\n`);
    console.log(`📍 GraphQL API: http://localhost:${PORT}/graphql`);
    console.log(`🔍 GraphiQL UI: http://localhost:${PORT}/graphql`);
    console.log(`\n💡 Tip: Open GraphiQL in your browser to try the API\n`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    server.close();
    await queueManager.close();
    await eventBus.close();
    await storage.disconnect();
    console.log('✅ Shutdown complete');
    process.exit(0);
  });
}

// Start the application
bootstrap().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});
