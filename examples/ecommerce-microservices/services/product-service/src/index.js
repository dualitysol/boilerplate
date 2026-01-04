/**
 * Product Service
 * Handles product catalog and inventory management
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

// In-memory product storage
const products = new Map();

// Seed some sample products
const seedProducts = () => {
  const sampleProducts = [
    {
      id: '1',
      name: 'Laptop Pro 15"',
      description: 'High-performance laptop for professionals',
      price: 1299.99,
      stock: 25,
      category: 'electronics',
      imageUrl: 'https://example.com/laptop.jpg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Wireless Mouse',
      description: 'Ergonomic wireless mouse',
      price: 29.99,
      stock: 150,
      category: 'accessories',
      imageUrl: 'https://example.com/mouse.jpg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '3',
      name: 'USB-C Cable',
      description: '2m USB-C charging cable',
      price: 12.99,
      stock: 200,
      category: 'accessories',
      imageUrl: 'https://example.com/cable.jpg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  sampleProducts.forEach(product => products.set(product.id, product));
};

// Load schema
const typeDefs = readFileSync(join(__dirname, '../schema.graphql'), 'utf-8');

// Resolvers
const resolvers = {
  Query: {
    products: (_, { category, inStock }) => {
      let result = Array.from(products.values());

      if (category) {
        result = result.filter(p => p.category === category);
      }

      if (inStock) {
        result = result.filter(p => p.stock > 0);
      }

      return result;
    },

    product: (_, { id }) => {
      return products.get(id) || null;
    },

    searchProducts: (_, { query }) => {
      const lowerQuery = query.toLowerCase();
      return Array.from(products.values()).filter(p => 
        p.name.toLowerCase().includes(lowerQuery) ||
        p.description?.toLowerCase().includes(lowerQuery)
      );
    },
  },

  Mutation: {
    createProduct: async (_, { input }, { eventBus }) => {
      const product = {
        id: Date.now().toString(),
        ...input,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      products.set(product.id, product);

      await eventBus.publish('product.created', {
        productId: product.id,
        name: product.name,
        price: product.price,
        stock: product.stock
      });

      return {
        success: true,
        message: 'Product created successfully',
        product
      };
    },

    updateProduct: async (_, { id, input }, { eventBus }) => {
      const product = products.get(id);
      if (!product) {
        return {
          success: false,
          message: 'Product not found',
          product: null
        };
      }

      const updated = {
        ...product,
        ...input,
        updatedAt: new Date().toISOString()
      };

      products.set(id, updated);

      await eventBus.publish('product.updated', {
        productId: id,
        changes: input
      });

      return {
        success: true,
        message: 'Product updated successfully',
        product: updated
      };
    },

    deleteProduct: async (_, { id }, { eventBus }) => {
      const product = products.get(id);
      if (!product) {
        return {
          success: false,
          message: 'Product not found'
        };
      }

      products.delete(id);

      await eventBus.publish('product.deleted', {
        productId: id
      });

      return {
        success: true,
        message: 'Product deleted successfully'
      };
    },

    updateStock: async (_, { id, quantity }, { eventBus }) => {
      const product = products.get(id);
      if (!product) {
        return {
          success: false,
          message: 'Product not found',
          product: null
        };
      }

      const updated = {
        ...product,
        stock: product.stock + quantity,
        updatedAt: new Date().toISOString()
      };

      products.set(id, updated);

      await eventBus.publish('product.stock.updated', {
        productId: id,
        oldStock: product.stock,
        newStock: updated.stock,
        quantity
      });

      return {
        success: true,
        message: 'Stock updated successfully',
        product: updated
      };
    },
  },
};

async function start() {
  console.log('🚀 Starting Product Service...\n');

  // Seed products
  seedProducts();

  const eventBus = new EventBus({ backend: 'local' });
  await eventBus.connect();

  // Listen to payment events to update stock
  await eventBus.subscribe('payment.completed', async (data) => {
    console.log('📦 Updating inventory for order:', data.orderId);
    // In real app, reduce stock based on order items
  });

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const yoga = createYoga({
    schema,
    context: () => ({ eventBus }),
  });

  const server = createServer(yoga);
  const PORT = process.env.PORT || 4002;

  server.listen(PORT, () => {
    console.log(`✅ Product Service running at http://localhost:${PORT}/graphql`);
    console.log(`📦 ${products.size} products loaded\n`);
  });
}

start().catch(console.error);
