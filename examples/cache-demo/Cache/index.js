/**
 * Cache Service Entry Point
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import queries from './resolvers/queries.js';
import mutations from './resolvers/mutations.js';
import { ProductModel, CacheKeys, CacheTTL, attachCacheInfo } from './model/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load GraphQL schema
export const typeDefinitions = readFileSync(
  join(__dirname, 'typeDefs', 'schema.graphql'),
  'utf-8'
);

// Export resolvers
export const queryMutations = {
  Query: queries,
  Mutation: mutations
};

// Product Service with Caching
export class ProductService {
  constructor(storage, cacheManager) {
    this.storage = storage || new Map();
    this.cacheManager = cacheManager;
  }
  
  // Cached product fetch (60s TTL)
  async getCachedProduct(id) {
    const cacheKey = CacheKeys.product(id);
    
    const product = await this.cacheManager.get(
      cacheKey,
      async () => {
        console.log(`[CACHE MISS] Fetching product ${id} from database`);
        // Simulate database delay
        await new Promise(resolve => setTimeout(resolve, 100));
        const p = this.storage.get(id);
        return p ? p.toJSON() : null;
      },
      CacheTTL.PRODUCT
    );
    
    if (product) {
      return attachCacheInfo(product, {
        cached: true,
        ttl: await this.cacheManager.ttl(cacheKey),
        key: cacheKey
      });
    }
    
    return null;
  }
  
  // Cached product list (30s TTL)
  async getCachedProducts({ category, limit = 50 }) {
    const cacheKey = CacheKeys.products(category, limit);
    
    const products = await this.cacheManager.get(
      cacheKey,
      async () => {
        console.log(`[CACHE MISS] Fetching products from database`);
        // Simulate database delay
        await new Promise(resolve => setTimeout(resolve, 200));
        
        let result = Array.from(this.storage.values());
        
        if (category) {
          result = result.filter(p => p.category === category);
        }
        
        return result.slice(0, limit).map(p => p.toJSON());
      },
      CacheTTL.PRODUCT_LIST
    );
    
    const ttl = await this.cacheManager.ttl(cacheKey);
    
    return products.map(p => attachCacheInfo(p, {
      cached: true,
      ttl,
      key: cacheKey
    }));
  }
  
  // Expensive stats query (5min TTL)
  async getProductStats(category) {
    const cacheKey = CacheKeys.productStats(category);
    
    const stats = await this.cacheManager.get(
      cacheKey,
      async () => {
        console.log(`[CACHE MISS] Computing expensive stats`);
        // Simulate expensive computation
        await new Promise(resolve => setTimeout(resolve, 500));
        
        let products = Array.from(this.storage.values());
        
        if (category) {
          products = products.filter(p => p.category === category);
        }
        
        // Compute stats
        return products.map(p => ({
          ...p.toJSON(),
          computedValue: Math.random() * 1000
        }));
      },
      CacheTTL.STATS
    );
    
    const ttl = await this.cacheManager.ttl(cacheKey);
    
    return stats.map(p => attachCacheInfo(p, {
      cached: true,
      ttl,
      key: cacheKey
    }));
  }
  
  // Create product (warms cache)
  async createProduct(input) {
    const product = new ProductModel(input);
    this.storage.set(product.id, product);
    
    // Warm cache
    const cacheKey = CacheKeys.product(product.id);
    await this.cacheManager.set(cacheKey, product.toJSON(), CacheTTL.PRODUCT);
    
    // Invalidate list caches
    await this.cacheManager.deletePattern(CacheKeys.products('*', '*'));
    await this.cacheManager.deletePattern(CacheKeys.productStats('*'));
    
    return attachCacheInfo(product.toJSON(), {
      cached: true,
      ttl: CacheTTL.PRODUCT,
      key: cacheKey
    });
  }
  
  // Update product (invalidates cache)
  async updateProduct(id, updates) {
    const product = this.storage.get(id);
    
    if (!product) {
      return null;
    }
    
    Object.assign(product, updates);
    
    // Invalidate product cache
    await this.cacheManager.delete(CacheKeys.product(id));
    
    // Invalidate list caches
    await this.cacheManager.deletePattern(CacheKeys.products('*', '*'));
    await this.cacheManager.deletePattern(CacheKeys.productStats('*'));
    
    return product.toJSON();
  }
  
  // Delete product (invalidates cache)
  async deleteProduct(id) {
    this.storage.delete(id);
    
    // Invalidate product cache
    await this.cacheManager.delete(CacheKeys.product(id));
    
    // Invalidate list caches
    await this.cacheManager.deletePattern(CacheKeys.products('*', '*'));
    await this.cacheManager.deletePattern(CacheKeys.productStats('*'));
  }
}

// Cache Service
export class CacheService {
  constructor(cacheManager) {
    this.cacheManager = cacheManager;
  }
  
  getStats() {
    return this.cacheManager.getStats();
  }
  
  async clear() {
    await this.cacheManager.clear();
  }
}

export { CacheKeys, CacheTTL };

export default {
  typeDefinitions,
  queryMutations,
  ProductService,
  CacheService,
  CacheKeys,
  CacheTTL
};
