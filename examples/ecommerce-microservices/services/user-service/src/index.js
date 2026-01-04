/**
 * User Service
 * Handles user authentication and profile management
 */

import { createServer } from 'http';
import { createYoga } from 'graphql-yoga';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

import EventBus from '@dualitysol/boilerplate/src/events/EventBus.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// In-memory user storage (replace with real DB in production)
const users = new Map();

// Simple password hashing
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

// Load schema
const typeDefs = readFileSync(join(__dirname, '../schema.graphql'), 'utf-8');

// Resolvers
const resolvers = {
  Query: {
    me: (_, __, { currentUser }) => {
      if (!currentUser) return null;
      return users.get(currentUser.id);
    },

    user: (_, { id }) => {
      return users.get(id) || null;
    },

    users: () => {
      return Array.from(users.values());
    },
  },

  Mutation: {
    registerUser: async (_, { input }, { eventBus }) => {
      const { username, email, password, firstName, lastName } = input;

      // Check if user exists
      for (const user of users.values()) {
        if (user.username === username) {
          return {
            success: false,
            message: 'Username already exists',
            user: null,
            token: null
          };
        }
        if (user.email === email) {
          return {
            success: false,
            message: 'Email already registered',
            user: null,
            token: null
          };
        }
      }

      // Create user
      const user = {
        id: Date.now().toString(),
        username,
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        password: hashPassword(password),
        role: 'CUSTOMER',
        createdAt: new Date().toISOString()
      };

      users.set(user.id, user);

      // Publish event
      await eventBus.publish('user.registered', {
        userId: user.id,
        username: user.username,
        email: user.email
      });

      const { password: _, ...userWithoutPassword } = user;
      return {
        success: true,
        message: 'User registered successfully',
        user: userWithoutPassword,
        token: `token-${user.id}`
      };
    },

    loginUser: async (_, { input }, { eventBus }) => {
      const { username, password } = input;
      const hashedPassword = hashPassword(password);

      let foundUser = null;
      for (const user of users.values()) {
        if (user.username === username && user.password === hashedPassword) {
          foundUser = user;
          break;
        }
      }

      if (!foundUser) {
        return {
          success: false,
          message: 'Invalid username or password',
          user: null,
          token: null
        };
      }

      // Publish event
      await eventBus.publish('user.loggedIn', {
        userId: foundUser.id,
        username: foundUser.username
      });

      const { password: _, ...userWithoutPassword } = foundUser;
      return {
        success: true,
        message: 'Login successful',
        user: userWithoutPassword,
        token: `token-${foundUser.id}`
      };
    },

    updateProfile: async (_, { input }, { currentUser }) => {
      if (!currentUser) {
        return {
          success: false,
          message: 'Not authenticated',
          user: null
        };
      }

      const user = users.get(currentUser.id);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
          user: null
        };
      }

      // Update user
      const updated = {
        ...user,
        ...input
      };
      users.set(user.id, updated);

      const { password: _, ...userWithoutPassword } = updated;
      return {
        success: true,
        message: 'Profile updated successfully',
        user: userWithoutPassword
      };
    },
  },
};

async function start() {
  console.log('🚀 Starting User Service...\n');

  const eventBus = new EventBus({ backend: 'local' });
  await eventBus.connect();

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const yoga = createYoga({
    schema,
    context: ({ request }) => {
      const token = request.headers.get('authorization')?.replace('Bearer ', '');
      let currentUser = null;

      if (token && token.startsWith('token-')) {
        const userId = token.substring(6);
        currentUser = { id: userId };
      }

      return { currentUser, eventBus };
    },
  });

  const server = createServer(yoga);
  const PORT = process.env.PORT || 4001;

  server.listen(PORT, () => {
    console.log(`✅ User Service running at http://localhost:${PORT}/graphql\n`);
  });
}

start().catch(console.error);
