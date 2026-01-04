/**
 * Cache Demo
 * 
 * Demonstrates:
 * - Cache-aside pattern
 * - Write-through caching
 * - TTL (Time To Live)
 * - Cache invalidation (single, pattern)
 * - Cache warming
 * - Cache statistics
 * - Memory and Redis storage
 */

import { Microservice } from '@dualitysol/boilerplate';
import { CacheManager } from '@dualitysol/boilerplate/cache';
import { 
  typeDefinitions,
  queryMutations,
  ProductService,
  CacheService
} from './Cache/index.js';

// Initialize microservice
const app = new Microservice({
  name: 'cache-demo',
  version: '1.0.0',
  
  transport: {
    type: 'http',
    port: 4004
  },
  
  graphql: {
    enabled: true,
    playground: true
  }
});

// Create cache manager (memory storage for demo)
const cacheManager = new CacheManager({
  storage: 'memory',
  ttl: 60,
  prefix: 'cache-demo'
});

// Create product storage
const productStorage = new Map();

// Register services
app.registerService('ProductService', new ProductService(productStorage, cacheManager));
app.registerService('CacheService', new CacheService(cacheManager));

// Register GraphQL schema and resolvers
app.registerGraphQL({
  typeDefs: typeDefinitions,
  resolvers: queryMutations
});

// Create sample products
setTimeout(() => {
  const service = app.getService('ProductService');
  
  const sampleProducts = [
    { name: 'Laptop', price: 999.99, stock: 50, category: 'Electronics' },
    { name: 'Mouse', price: 29.99, stock: 200, category: 'Electronics' },
    { name: 'Keyboard', price: 79.99, stock: 150, category: 'Electronics' },
    { name: 'Monitor', price: 299.99, stock: 75, category: 'Electronics' },
    { name: 'Desk', price: 399.99, stock: 30, category: 'Furniture' }
  ];
  
  for (const product of sampleProducts) {
    service.createProduct(product);
  }
  
  console.log('✅ Created 5 sample products');
}, 1000);

// Start server
await app.start();

console.log('🚀 Cache Demo running!');
console.log('📊 GraphQL Playground: http://localhost:4004/graphql');
console.log('');
console.log('Cache Features:');
console.log('  ✅ Cache-aside pattern (lazy loading)');
console.log('  ✅ Write-through caching');
console.log('  ✅ TTL support (60s, 30s, 300s)');
console.log('  ✅ Pattern-based invalidation');
console.log('  ✅ Cache statistics (hit rate)');
console.log('  ✅ Cache warming');
console.log('');
console.log('Try these queries:');
console.log('');
console.log('# Get cached product (60s TTL)');
console.log('query {');
console.log('  cachedProduct(id: "prod_xxx") {');
console.log('    success');
console.log('    product {');
console.log('      id');
console.log('      name');
console.log('      price');
console.log('      cacheInfo {');
console.log('        cached');
console.log('        ttl');
console.log('        key');
console.log('      }');
console.log('    }');
console.log('  }');
console.log('}');
console.log('');
console.log('# Get cached products (30s TTL)');
console.log('query {');
console.log('  cachedProducts(category: "Electronics", limit: 10) {');
console.log('    success');
console.log('    products {');
console.log('      name');
console.log('      price');
console.log('      cacheInfo { cached ttl }');
console.log('    }');
console.log('  }');
console.log('}');
console.log('');
console.log('# Cache statistics');
console.log('query {');
console.log('  cacheStats {');
console.log('    success');
console.log('    stats {');
console.log('      hits');
console.log('      misses');
console.log('      hitRate');
console.log('      size');
console.log('    }');
console.log('  }');
console.log('}');
console.log('');
console.log('# Update product (invalidates cache)');
console.log('mutation {');
console.log('  updateProduct(id: "prod_xxx", input: {');
console.log('    name: "Updated Laptop"');
console.log('    price: 899.99');
console.log('    stock: 45');
console.log('    category: "Electronics"');
console.log('  }) {');
console.log('    success');
console.log('    message');
console.log('  }');
console.log('}');
console.log('');
console.log('# Clear all cache');
console.log('mutation {');
console.log('  clearCache {');
console.log('    success');
console.log('    stats { hits misses hitRate }');
console.log('  }');
console.log('}');
