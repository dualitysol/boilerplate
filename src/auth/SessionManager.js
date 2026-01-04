/**
 * Session Manager
 * 
 * Features:
 * - Session creation and storage
 * - Session validation
 * - Session expiry
 * - Sliding sessions
 * - Multiple storage backends (Memory, Redis)
 * - Session fingerprinting
 * 
 * @example
 * ```javascript
 * import { SessionManager } from '@microservice-framework/boilerplate/auth';
 * 
 * const sessionManager = new SessionManager({
 *   storage: 'redis',
 *   redis: redisClient,
 *   ttl: 3600,
 *   sliding: true
 * });
 * 
 * // Create session
 * const session = await sessionManager.create({
 *   userId: '123',
 *   role: 'admin'
 * });
 * 
 * // Get session
 * const data = await sessionManager.get(session.id);
 * 
 * // Destroy session
 * await sessionManager.destroy(session.id);
 * ```
 */

import crypto from 'crypto';

/**
 * Generate session ID
 */
function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create session fingerprint
 */
function createFingerprint(req) {
  const data = [
    req.headers['user-agent'] || '',
    req.ip || '',
    req.headers['accept-language'] || ''
  ].join('|');
  
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Memory Storage for sessions
 */
class MemorySessionStorage {
  constructor() {
    this.sessions = new Map();
    
    // Cleanup expired sessions every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }
  
  async set(sessionId, data, ttl) {
    this.sessions.set(sessionId, {
      data,
      expiresAt: Date.now() + (ttl * 1000)
    });
  }
  
  async get(sessionId) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }
    
    return session.data;
  }
  
  async delete(sessionId) {
    this.sessions.delete(sessionId);
  }
  
  async exists(sessionId) {
    return this.sessions.has(sessionId);
  }
  
  async touch(sessionId, ttl) {
    const session = this.sessions.get(sessionId);
    
    if (session) {
      session.expiresAt = Date.now() + (ttl * 1000);
    }
  }
  
  cleanup() {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
      }
    }
  }
  
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.sessions.clear();
  }
}

/**
 * Redis Storage for sessions
 */
class RedisSessionStorage {
  constructor(redisClient, prefix = 'session:') {
    this.redis = redisClient;
    this.prefix = prefix;
  }
  
  async set(sessionId, data, ttl) {
    const key = this.prefix + sessionId;
    await this.redis.setex(key, ttl, JSON.stringify(data));
  }
  
  async get(sessionId) {
    const key = this.prefix + sessionId;
    const data = await this.redis.get(key);
    
    return data ? JSON.parse(data) : null;
  }
  
  async delete(sessionId) {
    const key = this.prefix + sessionId;
    await this.redis.del(key);
  }
  
  async exists(sessionId) {
    const key = this.prefix + sessionId;
    const result = await this.redis.exists(key);
    return result === 1;
  }
  
  async touch(sessionId, ttl) {
    const key = this.prefix + sessionId;
    await this.redis.expire(key, ttl);
  }
  
  async destroy() {
    // Redis client managed externally
  }
}

/**
 * Session Manager
 */
export class SessionManager {
  /**
   * @param {Object} options - Configuration
   * @param {string} options.storage - Storage type ('memory' or 'redis')
   * @param {Object} options.redis - Redis client (if storage='redis')
   * @param {number} options.ttl - Session TTL in seconds (default: 3600)
   * @param {boolean} options.sliding - Enable sliding sessions (default: false)
   * @param {boolean} options.fingerprint - Enable session fingerprinting (default: true)
   * @param {string} options.cookieName - Cookie name (default: 'sessionId')
   * @param {Object} options.cookieOptions - Cookie options
   */
  constructor(options = {}) {
    this.options = {
      storage: options.storage || 'memory',
      ttl: options.ttl || 3600,
      sliding: options.sliding || false,
      fingerprint: options.fingerprint !== false,
      cookieName: options.cookieName || 'sessionId',
      cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: (options.ttl || 3600) * 1000,
        ...options.cookieOptions
      }
    };
    
    // Initialize storage
    if (this.options.storage === 'redis') {
      if (!options.redis) {
        throw new Error('Redis client required for redis storage');
      }
      this.storage = new RedisSessionStorage(options.redis);
    } else {
      this.storage = new MemorySessionStorage();
    }
  }
  
  /**
   * Create new session
   * @param {Object} data - Session data
   * @param {Object} req - Request object (for fingerprinting)
   * @returns {Promise<{id: string, expiresAt: number}>}
   */
  async create(data, req = null) {
    const sessionId = generateSessionId();
    
    const sessionData = {
      ...data,
      createdAt: Date.now(),
      lastAccessedAt: Date.now()
    };
    
    // Add fingerprint if enabled
    if (this.options.fingerprint && req) {
      sessionData.fingerprint = createFingerprint(req);
    }
    
    await this.storage.set(sessionId, sessionData, this.options.ttl);
    
    return {
      id: sessionId,
      expiresAt: Date.now() + (this.options.ttl * 1000)
    };
  }
  
  /**
   * Get session data
   * @param {string} sessionId - Session ID
   * @param {Object} req - Request object (for fingerprinting)
   * @returns {Promise<Object|null>}
   */
  async get(sessionId, req = null) {
    if (!sessionId) {
      return null;
    }
    
    const data = await this.storage.get(sessionId);
    
    if (!data) {
      return null;
    }
    
    // Validate fingerprint
    if (this.options.fingerprint && req && data.fingerprint) {
      const currentFingerprint = createFingerprint(req);
      
      if (currentFingerprint !== data.fingerprint) {
        // Session hijacking detected
        await this.destroy(sessionId);
        throw new Error('Session fingerprint mismatch');
      }
    }
    
    // Update last accessed time
    data.lastAccessedAt = Date.now();
    
    // Sliding session - extend TTL
    if (this.options.sliding) {
      await this.storage.touch(sessionId, this.options.ttl);
    }
    
    // Save updated data
    await this.storage.set(sessionId, data, this.options.ttl);
    
    return data;
  }
  
  /**
   * Update session data
   * @param {string} sessionId - Session ID
   * @param {Object} updates - Data to update
   */
  async update(sessionId, updates) {
    const data = await this.storage.get(sessionId);
    
    if (!data) {
      throw new Error('Session not found');
    }
    
    const updated = {
      ...data,
      ...updates,
      lastAccessedAt: Date.now()
    };
    
    await this.storage.set(sessionId, updated, this.options.ttl);
  }
  
  /**
   * Destroy session
   * @param {string} sessionId - Session ID
   */
  async destroy(sessionId) {
    await this.storage.delete(sessionId);
  }
  
  /**
   * Check if session exists
   * @param {string} sessionId - Session ID
   * @returns {Promise<boolean>}
   */
  async exists(sessionId) {
    return await this.storage.exists(sessionId);
  }
  
  /**
   * Regenerate session ID (prevent fixation attacks)
   * @param {string} oldSessionId - Old session ID
   * @returns {Promise<{id: string, expiresAt: number}>}
   */
  async regenerate(oldSessionId) {
    const data = await this.storage.get(oldSessionId);
    
    if (!data) {
      throw new Error('Session not found');
    }
    
    // Delete old session
    await this.storage.delete(oldSessionId);
    
    // Create new session with same data
    const newSessionId = generateSessionId();
    await this.storage.set(newSessionId, data, this.options.ttl);
    
    return {
      id: newSessionId,
      expiresAt: Date.now() + (this.options.ttl * 1000)
    };
  }
  
  /**
   * Destroy storage
   */
  async destroyStorage() {
    await this.storage.destroy();
  }
}

/**
 * Create session middleware
 */
export function createSessionMiddleware(sessionManager, options = {}) {
  const {
    required = false,
    skipPaths = []
  } = options;
  
  return async function sessionMiddleware(req, res, next) {
    // Skip session for certain paths
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }
    
    try {
      // Get session ID from cookie
      const sessionId = req.cookies?.[sessionManager.options.cookieName];
      
      if (!sessionId) {
        if (required) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'No session found'
          });
        }
        return next();
      }
      
      // Get session data
      const sessionData = await sessionManager.get(sessionId, req);
      
      if (!sessionData) {
        if (required) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or expired session'
          });
        }
        return next();
      }
      
      // Attach session to request
      req.session = sessionData;
      req.sessionId = sessionId;
      
      // Helper to save session
      req.saveSession = async (updates) => {
        await sessionManager.update(sessionId, updates);
      };
      
      // Helper to destroy session
      req.destroySession = async () => {
        await sessionManager.destroy(sessionId);
        res.clearCookie(sessionManager.options.cookieName);
      };
      
      next();
    } catch (error) {
      if (error.message === 'Session fingerprint mismatch') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Session hijacking detected'
        });
      }
      
      if (required) {
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Session error'
        });
      }
      
      next();
    }
  };
}

export default {
  SessionManager,
  createSessionMiddleware,
  MemorySessionStorage,
  RedisSessionStorage
};
