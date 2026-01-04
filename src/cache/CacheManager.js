/**
 * Caching Layer
 * 
 * Multi-level caching with Redis backend and memory fallback.
 * 
 * Features:
 * - Cache-aside pattern (lazy loading)
 * - Write-through pattern (immediate cache update)
 * - TTL (Time To Live) support
 * - Key invalidation (single, pattern, tags)
 * - Automatic serialization/deserialization
 * - Memory and Redis storage
 * - Cache warming
 * - Cache statistics
 * 
 * @example
 * ```javascript
 * import { CacheManager } from '@microservice-framework/boilerplate/cache';
 * 
 * const cache = new CacheManager({
 *   storage: 'redis',
 *   redis: redisClient,
 *   ttl: 3600,
 *   prefix: 'myapp'
 * });
 * 
 * // Cache-aside
 * const value = await cache.get('user:123', async () => {
 *   return await db.users.findOne({ id: '123' });
 * });
 * 
 * // Manual set
 * await cache.set('user:123', userData, 3600);
 * 
 * // Invalidate
 * await cache.delete('user:123');
 * await cache.deletePattern('user:*');
 * ```
 */

import crypto from 'crypto';

/**
 * Generate cache key hash for long keys
 */
function hashKey(key) {
  if (key.length < 200) return key;
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Memory Cache Storage
 */
class MemoryCacheStorage {
  constructor() {
    this.cache = new Map();
    this.expirations = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
    
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }
  
  async get(key) {
    const hashedKey = hashKey(key);
    
    // Check expiration
    const expireAt = this.expirations.get(hashedKey);
    if (expireAt && Date.now() > expireAt) {
      this.cache.delete(hashedKey);
      this.expirations.delete(hashedKey);
      this.stats.misses++;
      return null;
    }
    
    const value = this.cache.get(hashedKey);
    
    if (value === undefined) {
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return JSON.parse(value);
  }
  
  async set(key, value, ttl) {
    const hashedKey = hashKey(key);
    
    this.cache.set(hashedKey, JSON.stringify(value));
    
    if (ttl) {
      this.expirations.set(hashedKey, Date.now() + ttl * 1000);
    }
    
    this.stats.sets++;
  }
  
  async delete(key) {
    const hashedKey = hashKey(key);
    this.cache.delete(hashedKey);
    this.expirations.delete(hashedKey);
    this.stats.deletes++;
  }
  
  async deletePattern(pattern) {
    // Convert glob pattern to regex
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    
    let deleted = 0;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        this.expirations.delete(key);
        deleted++;
      }
    }
    
    this.stats.deletes += deleted;
    return deleted;
  }
  
  async clear() {
    this.cache.clear();
    this.expirations.clear();
  }
  
  async exists(key) {
    const hashedKey = hashKey(key);
    return this.cache.has(hashedKey);
  }
  
  async ttl(key) {
    const hashedKey = hashKey(key);
    const expireAt = this.expirations.get(hashedKey);
    
    if (!expireAt) return -1;
    
    const remaining = Math.floor((expireAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }
  
  cleanup() {
    const now = Date.now();
    
    for (const [key, expireAt] of this.expirations.entries()) {
      if (now > expireAt) {
        this.cache.delete(key);
        this.expirations.delete(key);
      }
    }
  }
  
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }
  
  destroy() {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
    this.expirations.clear();
  }
}

/**
 * Redis Cache Storage
 */
class RedisCacheStorage {
  constructor(redis) {
    this.redis = redis;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }
  
  async get(key) {
    try {
      const value = await this.redis.get(key);
      
      if (value === null) {
        this.stats.misses++;
        return null;
      }
      
      this.stats.hits++;
      return JSON.parse(value);
    } catch (error) {
      console.error('Redis get error:', error);
      this.stats.misses++;
      return null;
    }
  }
  
  async set(key, value, ttl) {
    try {
      const serialized = JSON.stringify(value);
      
      if (ttl) {
        await this.redis.setEx(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
      
      this.stats.sets++;
    } catch (error) {
      console.error('Redis set error:', error);
      throw error;
    }
  }
  
  async delete(key) {
    try {
      await this.redis.del(key);
      this.stats.deletes++;
    } catch (error) {
      console.error('Redis delete error:', error);
    }
  }
  
  async deletePattern(pattern) {
    try {
      let cursor = 0;
      let deleted = 0;
      
      do {
        const reply = await this.redis.scan(cursor, {
          MATCH: pattern,
          COUNT: 100
        });
        
        cursor = reply.cursor;
        const keys = reply.keys;
        
        if (keys.length > 0) {
          await this.redis.del(keys);
          deleted += keys.length;
        }
      } while (cursor !== 0);
      
      this.stats.deletes += deleted;
      return deleted;
    } catch (error) {
      console.error('Redis deletePattern error:', error);
      return 0;
    }
  }
  
  async clear() {
    try {
      await this.redis.flushDb();
    } catch (error) {
      console.error('Redis clear error:', error);
    }
  }
  
  async exists(key) {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }
  
  async ttl(key) {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      console.error('Redis ttl error:', error);
      return -1;
    }
  }
  
  getStats() {
    return {
      ...this.stats,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }
  
  async destroy() {
    // Redis client should be closed by the application
  }
}

/**
 * Cache Manager
 */
export class CacheManager {
  /**
   * @param {Object} options - Configuration
   * @param {string} options.storage - Storage type ('memory' or 'redis')
   * @param {Object} options.redis - Redis client instance
   * @param {number} options.ttl - Default TTL in seconds
   * @param {string} options.prefix - Key prefix
   * @param {boolean} options.compression - Enable compression (future)
   * @param {Function} options.onError - Error callback
   */
  constructor(options = {}) {
    this.options = {
      storage: options.storage || 'memory',
      ttl: options.ttl || 3600,
      prefix: options.prefix || 'cache',
      compression: options.compression || false,
      onError: options.onError || ((err) => console.error('Cache error:', err))
    };
    
    // Initialize storage
    if (this.options.storage === 'redis') {
      if (!options.redis) {
        throw new Error('Redis client required for redis storage');
      }
      this.storage = new RedisCacheStorage(options.redis);
    } else {
      this.storage = new MemoryCacheStorage();
    }
  }
  
  /**
   * Build full cache key with prefix
   */
  buildKey(key) {
    return `${this.options.prefix}:${key}`;
  }
  
  /**
   * Get value from cache or compute it
   * Cache-aside pattern
   * 
   * @param {string} key - Cache key
   * @param {Function} compute - Function to compute value if not cached
   * @param {number} ttl - TTL in seconds (optional)
   * @returns {Promise<any>} - Cached or computed value
   */
  async get(key, compute = null, ttl = null) {
    const fullKey = this.buildKey(key);
    
    try {
      // Try to get from cache
      const cached = await this.storage.get(fullKey);
      
      if (cached !== null) {
        return cached;
      }
      
      // If no compute function, return null
      if (!compute) {
        return null;
      }
      
      // Compute value
      const value = await compute();
      
      // Store in cache
      await this.set(key, value, ttl);
      
      return value;
    } catch (error) {
      this.options.onError(error);
      
      // If compute function exists, return computed value
      if (compute) {
        return await compute();
      }
      
      return null;
    }
  }
  
  /**
   * Set value in cache
   * 
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - TTL in seconds (optional)
   */
  async set(key, value, ttl = null) {
    const fullKey = this.buildKey(key);
    const finalTtl = ttl !== null ? ttl : this.options.ttl;
    
    try {
      await this.storage.set(fullKey, value, finalTtl);
    } catch (error) {
      this.options.onError(error);
    }
  }
  
  /**
   * Delete key from cache
   */
  async delete(key) {
    const fullKey = this.buildKey(key);
    
    try {
      await this.storage.delete(fullKey);
    } catch (error) {
      this.options.onError(error);
    }
  }
  
  /**
   * Delete keys matching pattern
   * Pattern: "user:*", "product:*:details"
   */
  async deletePattern(pattern) {
    const fullPattern = this.buildKey(pattern);
    
    try {
      return await this.storage.deletePattern(fullPattern);
    } catch (error) {
      this.options.onError(error);
      return 0;
    }
  }
  
  /**
   * Delete keys by tags
   */
  async deleteTags(tags) {
    if (!Array.isArray(tags)) {
      tags = [tags];
    }
    
    let deleted = 0;
    
    for (const tag of tags) {
      const pattern = `*:tag:${tag}:*`;
      deleted += await this.deletePattern(pattern);
    }
    
    return deleted;
  }
  
  /**
   * Clear all cache
   */
  async clear() {
    try {
      await this.storage.clear();
    } catch (error) {
      this.options.onError(error);
    }
  }
  
  /**
   * Check if key exists
   */
  async exists(key) {
    const fullKey = this.buildKey(key);
    
    try {
      return await this.storage.exists(fullKey);
    } catch (error) {
      this.options.onError(error);
      return false;
    }
  }
  
  /**
   * Get TTL for key
   */
  async ttl(key) {
    const fullKey = this.buildKey(key);
    
    try {
      return await this.storage.ttl(fullKey);
    } catch (error) {
      this.options.onError(error);
      return -1;
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    return this.storage.getStats();
  }
  
  /**
   * Wrap function with caching
   */
  wrap(fn, options = {}) {
    const { keyGenerator, ttl } = options;
    
    return async (...args) => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
      
      return await this.get(key, () => fn(...args), ttl);
    };
  }
  
  /**
   * Cache warming - preload cache with data
   */
  async warm(entries) {
    const promises = entries.map(({ key, value, ttl }) => 
      this.set(key, value, ttl)
    );
    
    await Promise.all(promises);
  }
  
  /**
   * Destroy cache manager
   */
  async destroy() {
    await this.storage.destroy();
  }
}

export default {
  CacheManager,
  MemoryCacheStorage,
  RedisCacheStorage
};
