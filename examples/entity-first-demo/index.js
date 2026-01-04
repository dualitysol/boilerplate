/**
 * Entity-First Auto-Generation Demo
 * 
 * Demonstrates:
 * - Defining entities once with @Entity decorator
 * - Auto-generating GraphQL schemas
 * - Auto-generating DB schemas
 * - Auto-generating resolvers
 * - Auto-generating TypeScript types
 */

import { Microservice } from '@dualitysol/boilerplate';
import { 
  typeDefinitions as ProductTypeDefs,
  queryMutations as ProductResolvers,
  ProductService 
} from './Product/index.js';

// Initialize microservice
const app = new Microservice({
  name: 'entity-first-demo',
  version: '1.0.0',
  
  transport: {
    type: 'http',
    port: 4000
  },
  
  graphql: {
    enabled: true,
    playground: true
  }
});

// Create storage
const productStorage = new Map();

// Register services
app.registerService('ProductService', new ProductService(productStorage));

// Register GraphQL schema and resolvers
app.registerGraphQL({
  typeDefs: ProductTypeDefs,
  resolvers: ProductResolvers
});

// Start server
await app.start();

console.log('🚀 Entity-First Demo running!');
console.log('📊 GraphQL Playground: http://localhost:4000/graphql');
console.log('');
console.log('Try these queries:');
console.log('');
console.log('# Create a product');
console.log('mutation {');
console.log('  createProduct(input: {');
console.log('    name: "Laptop"');
console.log('    description: "High-performance laptop"');
console.log('    price: 999.99');
console.log('    stock: 50');
console.log('    category: "Electronics"');
console.log('    tags: ["computer", "portable"]');
console.log('  }) {');
console.log('    success');
console.log('    message');
console.log('    product {');
console.log('      id');
console.log('      name');
console.log('      price');
console.log('      stock');
console.log('    }');
console.log('  }');
console.log('}');
console.log('');
console.log('# Get all products');
console.log('query {');
console.log('  products(limit: 10) {');
console.log('    success');
console.log('    products {');
console.log('      id');
console.log('      name');
console.log('      price');
console.log('      stock');
console.log('      category');
console.log('    }');
console.log('    total');
console.log('  }');
console.log('}');
console.log('');
console.log('# Search products');
console.log('query {');
console.log('  searchProducts(query: "laptop", limit: 5) {');
console.log('    success');
console.log('    products {');
console.log('      id');
console.log('      name');
console.log('      price');
console.log('    }');
console.log('  }');
console.log('}');
