/**
 * Payment Service
 * Handles payment processing
 */

import { createServer } from 'http';
import { createYoga } from 'graphql-yoga';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import EventBus from '@dualitysol/boilerplate/src/events/EventBus.js';
import QueueManager from '@dualitysol/boilerplate/src/queue/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// In-memory payment storage
const payments = new Map();

// Load schema
const typeDefs = readFileSync(join(__dirname, '../schema.graphql'), 'utf-8');

// Resolvers
const resolvers = {
  Query: {
    payment: (_, { orderId }) => {
      return Array.from(payments.values()).find(p => p.orderId === orderId) || null;
    },

    payments: () => {
      return Array.from(payments.values());
    },
  },

  Mutation: {
    processPayment: async (_, { input }, { eventBus }) => {
      // Simulate payment processing
      const payment = {
        id: Date.now().toString(),
        orderId: input.orderId,
        amount: input.amount,
        method: input.method,
        status: 'COMPLETED', // Simulated success
        transactionId: `txn_${Date.now()}`,
        createdAt: new Date().toISOString()
      };

      payments.set(payment.id, payment);

      // Publish payment completed event
      await eventBus.publish('payment.completed', {
        paymentId: payment.id,
        orderId: input.orderId,
        amount: input.amount,
        transactionId: payment.transactionId
      });

      return {
        success: true,
        message: 'Payment processed successfully',
        payment
      };
    },

    refundPayment: async (_, { orderId }, { eventBus }) => {
      const payment = Array.from(payments.values()).find(p => p.orderId === orderId);
      
      if (!payment) {
        return {
          success: false,
          message: 'Payment not found',
          payment: null
        };
      }

      const refunded = {
        ...payment,
        status: 'REFUNDED'
      };

      payments.set(payment.id, refunded);

      await eventBus.publish('payment.refunded', {
        paymentId: payment.id,
        orderId,
        amount: payment.amount
      });

      return {
        success: true,
        message: 'Payment refunded successfully',
        payment: refunded
      };
    },
  },
};

async function start() {
  console.log('🚀 Starting Payment Service...\n');

  const eventBus = new EventBus({ backend: 'local' });
  await eventBus.connect();

  const queueManager = new QueueManager({ eventBus });

  // Listen to order created events and auto-process payment
  await eventBus.subscribe('order.created', async (data) => {
    console.log('💰 Processing payment for order:', data.orderId);
    
    // Add to payment queue for processing
    queueManager.send('payments', {
      orderId: data.orderId,
      amount: data.totalAmount,
      userId: data.userId
    });
  });

  // Process payment queue
  queueManager.process('payments', async (job) => {
    console.log('⏳ Processing payment:', job.orderId);
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const payment = {
      id: Date.now().toString(),
      orderId: job.orderId,
      amount: job.amount,
      method: 'credit_card',
      status: 'COMPLETED',
      transactionId: `txn_${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    payments.set(payment.id, payment);

    // Publish completed event
    await eventBus.publish('payment.completed', {
      paymentId: payment.id,
      orderId: job.orderId,
      amount: job.amount,
      transactionId: payment.transactionId
    });

    console.log('✅ Payment completed:', job.orderId);
  }, { interval: 1000 });

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const yoga = createYoga({
    schema,
    context: () => ({ eventBus, queueManager }),
  });

  const server = createServer(yoga);
  const PORT = process.env.PORT || 4004;

  server.listen(PORT, () => {
    console.log(`✅ Payment Service running at http://localhost:${PORT}/graphql`);
    console.log(`💳 Payment queue processing enabled\n`);
  });
}

start().catch(console.error);
