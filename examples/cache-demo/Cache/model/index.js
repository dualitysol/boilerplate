/**
 * Cache Model and Utilities
 */

import crypto from 'crypto';

export class ProductModel {
  constructor(data) {
    this.id = data.id || this.generateId();
    this.name = data.name;
    this.price = data.price;
    this.stock = data.stock;
    this.category = data.category;
  }
  
  generateId() {
    return `prod_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }
  
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      price: this.price,
      stock: this.stock,
      category: this.category
    };
  }
}

// Cache key generators
export const CacheKeys = {
  product: (id) => `product:${id}`,
  products: (category, limit) => `products:${category || 'all'}:${limit}`,
  productStats: (category) => `stats:${category || 'all'}`,
  productList: () => 'product:*'
};

// Cache TTLs
export const CacheTTL = {
  PRODUCT: 60,        // 1 minute
  PRODUCT_LIST: 30,   // 30 seconds
  STATS: 300,         // 5 minutes
  SHORT: 10,          // 10 seconds
  LONG: 3600          // 1 hour
};

// Attach cache info to product
export const attachCacheInfo = (product, cacheInfo = {}) => {
  return {
    ...product,
    cacheInfo: {
      cached: cacheInfo.cached || false,
      ttl: cacheInfo.ttl || null,
      key: cacheInfo.key || null
    }
  };
};
