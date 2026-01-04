/**
 * Order Service
 * Handles order creation and management
 */

import { createServer } from 'http';
import { createYoga } from 'graphql-yoga';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import EventBus from '@dualitysol/boilerplate/src/events/EventBus.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// In-memory order storage
const orders = new Map();

// Load schema
const typeDefs = readFileSync(join(__dirname, '../schema.graphql'), 'utf-8');

// Resolvers
const resolvers = {
  Query: {
    order: (_, { id }) => {
      return orders.get(id) || null;
    },

    myOrders: (_, __, { currentUser }) => {
      if (!currentUser) return [];
      return Array.from(orders.values()).filter(o => o.userId === currentUser.id);
    },

    allOrders: () => {
      return Array.from(orders.values());
    },
  },

  Mutation: {
    createOrder: async (_, { input }, { currentUser, eventBus }) => {
      if (!currentUser) {
        return {
          success: false,
          message: 'Not authenticated',
          order: null
        };
      }

      const totalAmount = input.items.reduce((sum, item) => 
        sum + (item.price * item.quantity), 0
      );

      const order = {
        id: Date.now().toString(),
        userId: currentUser.id,
        items: input.items,
        totalAmount,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      orders.set(order.id, order);

      // Publish event for payment processing
      await eventBus.publish('order.created', {
        orderId: order.id,
        userId: order.userId,
        totalAmount: order.totalAmount,
        items: order.items
      });

      return {
        success: true,
        message: 'Order created successfully',
        order
      };
    },

    updateOrderStatus: async (_, { id, status }, { eventBus }) => {
      const order = orders.get(id);
      if (!order) {
        return {
          success: false,
          message: 'Order not found',
          order: null
        };
      }

      const updated = {
        ...order,
        status,
        updatedAt: new Date().toISOString()
      };

      orders.set(id, updated);

      await eventBus.publish('order.status.updated', {
        orderId: id,
        oldStatus: order.status,
        newStatus: status
      });

      return {
        success: true,
        message: 'Order status updated',
        order: updated
      };
    },

    cancelOrder: async (_, { id }, { currentUser, eventBus }) => {
      if (!currentUser) {
        return {
          success: false,
          message: 'Not authenticated',
          order: null
        };
      }

      const order = orders.get(id);
      if (!order) {
        return {
          success: false,
          message: 'Order not found',
          order: null
        };
      }

      if (order.userId !== currentUser.id) {
        return {
          success: false,
          message: 'Not authorized',
          order: null
        };
      }

      const updated = {
        ...order,
        status: 'CANCELLED',
        updatedAt: new Date().toISOString()
      };

      orders.set(id, updated);

      await eventBus.publish('order.cancelled', {
        orderId: id,
        userId: order.userId
      });

      return {
        success: true,
        message: 'Order cancelled',
        order: updated
      };
    },
  },
};

async function start() {
  console.log('🚀 Starting Order Service...\n');

  const eventBus = new EventBus({ backend: 'local' });
  await eventBus.connect();

  // Listen to payment completed events
  await eventBus.subscribe('payment.completed', async (data) => {
    console.log('💳 Payment completed for order:', data.orderId);
    const order = orders.get(data.orderId);
    if (order) {
      order.status = 'PAID';
      order.updatedAt = new Date().toISOString();
      orders.set(data.orderId, order);
      
      await eventBus.publish('order.status.updated', {
        orderId: data.orderId,
        oldStatus: 'PENDING',
        newStatus: 'PAID'
      });
    }
  });

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
  const PORT = process.env.PORT || 4003;

  server.listen(PORT, () => {
    console.log(`✅ Order Service running at http://localhost:${PORT}/graphql\n`);
  });
}

start().catch(console.error);
