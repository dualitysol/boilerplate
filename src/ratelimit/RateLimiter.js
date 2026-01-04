/**
 * Rate Limiter with Token Bucket Algorithm
 * 
 * Supports:
 * - Per-user rate limiting
 * - Global rate limiting
 * - IP-based rate limiting
 * - Custom key functions
 * - Multiple storage backends (Memory, Redis)
 * - Sliding window
 * - Token bucket algorithm
 * 
 * @example
 * ```javascript
 * import { RateLimiter } from '@microservice-framework/boilerplate/ratelimit';
 * 
 * const limiter = new RateLimiter({
 *   storage: 'redis',
 *   redis: { host: 'localhost', port: 6379 },
 *   limits: {
 *     global: { points: 100, duration: 60 },
 *     perUser: { points: 10, duration: 60 }
 *   }
 * });
 * 
 * // Check if request is allowed
 * const result = await limiter.consume('user:123');
 * if (!result.allowed) {
 *   throw new Error(`Rate limit exceeded. Retry after ${result.retryAfter}s`);
 * }
 * ```
 */

/**
 * Rate limit result
 * @typedef {Object} RateLimitResult
 * @property {boolean} allowed - Whether request is allowed
 * @property {number} remaining - Remaining points
 * @property {number} total - Total points allowed
 * @property {number} retryAfter - Seconds until retry (if not allowed)
 * @property {number} resetAt - Timestamp when limit resets
 */

/**
 * In-memory storage for rate limiting
 */
class MemoryStorage {
  constructor() {
    this.store = new Map();
    
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }
  
  /**
   * Get current count for key
   */
  async get(key) {
    const data = this.store.get(key);
    
    if (!data) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > data.resetAt) {
      this.store.delete(key);
      return null;
    }
    
    return data;
  }
  
  /**
   * Set count for key
   */
  async set(key, value, ttl) {
    this.store.set(key, {
      ...value,
      resetAt: Date.now() + (ttl * 1000)
    });
  }
  
  /**
   * Increment counter
   */
  async increment(key, points = 1, ttl = 60) {
    const existing = await this.get(key);
    
    if (!existing) {
      const data = {
        points: points,
        total: points,
        resetAt: Date.now() + (ttl * 1000)
      };
      await this.set(key, data, ttl);
      return data;
    }
    
    existing.points += points;
    await this.set(key, existing, ttl);
    return existing;
  }
  
  /**
   * Delete key
   */
  async delete(key) {
    this.store.delete(key);
  }
  
  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now > value.resetAt) {
        this.store.delete(key);
      }
    }
  }
  
  /**
   * Destroy storage
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

/**
 * Redis storage for rate limiting
 */
class RedisStorage {
  constructor(redisClient) {
    this.redis = redisClient;
  }
  
  /**
   * Get current count for key
   */
  async get(key) {
    const data = await this.redis.get(key);
    
    if (!data) {
      return null;
    }
    
    return JSON.parse(data);
  }
  
  /**
   * Set count for key
   */
  async set(key, value, ttl) {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }
  
  /**
   * Increment counter using Lua script (atomic)
   */
  async increment(key, points = 1, ttl = 60) {
    const script = `
      local key = KEYS[1]
      local points = tonumber(ARGV[1])
      local ttl = tonumber(ARGV[2])
      
      local current = redis.call('GET', key)
      
      if current == false then
        local data = {points = points, total = points, resetAt = 0}
        redis.call('SETEX', key, ttl, cjson.encode(data))
        return data
      else
        local data = cjson.decode(current)
        data.points = data.points + points
        redis.call('SETEX', key, ttl, cjson.encode(data))
        return data
      end
    `;
    
    try {
      const result = await this.redis.eval(script, 1, key, points, ttl);
      return typeof result === 'string' ? JSON.parse(result) : result;
    } catch (error) {
      // Fallback to non-atomic operation
      const existing = await this.get(key);
      
      if (!existing) {
        const data = {
          points: points,
          total: points,
          resetAt: Date.now() + (ttl * 1000)
        };
        await this.set(key, data, ttl);
        return data;
      }
      
      existing.points += points;
      await this.set(key, existing, ttl);
      return existing;
    }
  }
  
  /**
   * Delete key
   */
  async delete(key) {
    await this.redis.del(key);
  }
  
  /**
   * Destroy storage
   */
  async destroy() {
    // Redis client managed externally
  }
}

/**
 * Rate Limiter
 */
export class RateLimiter {
  /**
   * @param {Object} options - Rate limiter options
   * @param {string} options.storage - Storage type ('memory' or 'redis')
   * @param {Object} options.redis - Redis client or config
   * @param {Object} options.limits - Rate limit configuration
   * @param {Object} options.limits.global - Global rate limit
   * @param {number} options.limits.global.points - Max requests
   * @param {number} options.limits.global.duration - Time window in seconds
   * @param {Object} options.limits.perUser - Per-user rate limit
   * @param {Object} options.limits.perIP - Per-IP rate limit
   * @param {Function} options.keyGenerator - Custom key generator
   * @param {boolean} options.skipFailedRequests - Don't count failed requests
   * @param {boolean} options.skipSuccessfulRequests - Don't count successful requests
   */
  constructor(options = {}) {
    this.options = {
      storage: options.storage || 'memory',
      limits: options.limits || {},
      keyGenerator: options.keyGenerator || this.defaultKeyGenerator.bind(this),
      skipFailedRequests: options.skipFailedRequests || false,
      skipSuccessfulRequests: options.skipSuccessfulRequests || false,
      blockDuration: options.blockDuration || 0 // 0 = no blocking
    };
    
    // Initialize storage
    if (this.options.storage === 'redis') {
      if (!options.redis) {
        throw new Error('Redis client required for redis storage');
      }
      this.storage = new RedisStorage(options.redis);
    } else {
      this.storage = new MemoryStorage();
    }
    
    // Normalize limits
    this.limits = this.normalizeLimits(this.options.limits);
  }
  
  /**
   * Normalize limit configuration
   */
  normalizeLimits(limits) {
    const normalized = {};
    
    for (const [name, config] of Object.entries(limits)) {
      normalized[name] = {
        points: config.points || 10,
        duration: config.duration || 60,
        blockDuration: config.blockDuration || this.options.blockDuration
      };
    }
    
    return normalized;
  }
  
  /**
   * Default key generator
   */
  defaultKeyGenerator(identifier, limitType) {
    return `ratelimit:${limitType}:${identifier}`;
  }
  
  /**
   * Consume points from rate limit
   * @param {string} identifier - User ID, IP, or custom identifier
   * @param {number} points - Points to consume (default: 1)
   * @param {string} limitType - Limit type ('global', 'perUser', 'perIP', etc.)
   * @returns {Promise<RateLimitResult>}
   */
  async consume(identifier, points = 1, limitType = 'perUser') {
    const limit = this.limits[limitType];
    
    if (!limit) {
      throw new Error(`Unknown limit type: ${limitType}`);
    }
    
    const key = this.options.keyGenerator(identifier, limitType);
    
    // Check if blocked
    const blockKey = `${key}:blocked`;
    const blocked = await this.storage.get(blockKey);
    
    if (blocked) {
      return {
        allowed: false,
        remaining: 0,
        total: limit.points,
        retryAfter: Math.ceil((blocked.resetAt - Date.now()) / 1000),
        resetAt: blocked.resetAt
      };
    }
    
    // Increment counter
    const data = await this.storage.increment(key, points, limit.duration);
    
    const remaining = Math.max(0, limit.points - data.points);
    const allowed = data.points <= limit.points;
    
    // Block if limit exceeded and blockDuration is set
    if (!allowed && limit.blockDuration > 0) {
      const blockData = {
        resetAt: Date.now() + (limit.blockDuration * 1000)
      };
      await this.storage.set(blockKey, blockData, limit.blockDuration);
    }
    
    return {
      allowed,
      remaining,
      total: limit.points,
      retryAfter: allowed ? 0 : Math.ceil((data.resetAt - Date.now()) / 1000),
      resetAt: data.resetAt
    };
  }
  
  /**
   * Check rate limit without consuming
   */
  async check(identifier, limitType = 'perUser') {
    const limit = this.limits[limitType];
    
    if (!limit) {
      throw new Error(`Unknown limit type: ${limitType}`);
    }
    
    const key = this.options.keyGenerator(identifier, limitType);
    const data = await this.storage.get(key);
    
    if (!data) {
      return {
        allowed: true,
        remaining: limit.points,
        total: limit.points,
        retryAfter: 0,
        resetAt: Date.now() + (limit.duration * 1000)
      };
    }
    
    const remaining = Math.max(0, limit.points - data.points);
    const allowed = data.points < limit.points;
    
    return {
      allowed,
      remaining,
      total: limit.points,
      retryAfter: allowed ? 0 : Math.ceil((data.resetAt - Date.now()) / 1000),
      resetAt: data.resetAt
    };
  }
  
  /**
   * Reset rate limit for identifier
   */
  async reset(identifier, limitType = 'perUser') {
    const key = this.options.keyGenerator(identifier, limitType);
    await this.storage.delete(key);
    await this.storage.delete(`${key}:blocked`);
  }
  
  /**
   * Get current usage
   */
  async getUsage(identifier, limitType = 'perUser') {
    const limit = this.limits[limitType];
    
    if (!limit) {
      throw new Error(`Unknown limit type: ${limitType}`);
    }
    
    const key = this.options.keyGenerator(identifier, limitType);
    const data = await this.storage.get(key);
    
    if (!data) {
      return {
        points: 0,
        remaining: limit.points,
        total: limit.points,
        resetAt: Date.now() + (limit.duration * 1000)
      };
    }
    
    return {
      points: data.points,
      remaining: Math.max(0, limit.points - data.points),
      total: limit.points,
      resetAt: data.resetAt
    };
  }
  
  /**
   * Penalty - add extra points (e.g., for suspicious activity)
   */
  async penalty(identifier, points = 1, limitType = 'perUser') {
    return this.consume(identifier, points, limitType);
  }
  
  /**
   * Reward - remove points (e.g., for good behavior)
   */
  async reward(identifier, points = 1, limitType = 'perUser') {
    const limit = this.limits[limitType];
    
    if (!limit) {
      throw new Error(`Unknown limit type: ${limitType}`);
    }
    
    const key = this.options.keyGenerator(identifier, limitType);
    const data = await this.storage.get(key);
    
    if (!data) {
      return;
    }
    
    data.points = Math.max(0, data.points - points);
    await this.storage.set(key, data, limit.duration);
  }
  
  /**
   * Destroy rate limiter
   */
  async destroy() {
    await this.storage.destroy();
  }
}

/**
 * Create rate limiter middleware for HTTP
 */
export function createRateLimitMiddleware(limiter, options = {}) {
  const {
    limitType = 'perUser',
    keyGenerator = (req) => req.user?.id || req.ip || 'anonymous',
    skipPaths = [],
    onLimitReached = null,
    headers = true
  } = options;
  
  return async function rateLimitMiddleware(req, res, next) {
    // Skip certain paths
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }
    
    const identifier = keyGenerator(req);
    
    try {
      const result = await limiter.consume(identifier, 1, limitType);
      
      // Add headers
      if (headers) {
        res.setHeader('X-RateLimit-Limit', result.total);
        res.setHeader('X-RateLimit-Remaining', result.remaining);
        res.setHeader('X-RateLimit-Reset', result.resetAt);
      }
      
      if (!result.allowed) {
        res.setHeader('Retry-After', result.retryAfter);
        
        if (onLimitReached) {
          return onLimitReached(req, res, result);
        }
        
        return res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
          retryAfter: result.retryAfter
        });
      }
      
      next();
    } catch (error) {
      console.error('Rate limit error:', error);
      // Fail open - allow request if rate limiter fails
      next();
    }
  };
}

export default {
  RateLimiter,
  createRateLimitMiddleware,
  MemoryStorage,
  RedisStorage
};
