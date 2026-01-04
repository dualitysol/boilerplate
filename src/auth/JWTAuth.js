/**
 * JWT Authentication Manager
 * 
 * Features:
 * - Access tokens (short-lived)
 * - Refresh tokens (long-lived)
 * - Token rotation
 * - Blacklisting
 * - Multiple signing algorithms
 * 
 * @example
 * ```javascript
 * import { JWTAuth } from '@microservice-framework/boilerplate/auth';
 * 
 * const auth = new JWTAuth({
 *   accessSecret: 'secret',
 *   refreshSecret: 'refresh-secret',
 *   accessExpiry: '15m',
 *   refreshExpiry: '7d'
 * });
 * 
 * // Generate tokens
 * const tokens = await auth.generateTokens({ userId: '123', role: 'admin' });
 * 
 * // Verify access token
 * const payload = await auth.verifyAccessToken(tokens.accessToken);
 * 
 * // Refresh tokens
 * const newTokens = await auth.refreshTokens(tokens.refreshToken);
 * ```
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * Parse duration string to seconds
 */
function parseDuration(duration) {
  if (typeof duration === 'number') return duration;
  
  const units = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800
  };
  
  const match = duration.match(/^(\d+)([smhdw])$/);
  if (!match) throw new Error(`Invalid duration: ${duration}`);
  
  return parseInt(match[1]) * units[match[2]];
}

/**
 * JWT Authentication Manager
 */
export class JWTAuth {
  /**
   * @param {Object} options - Configuration options
   * @param {string} options.accessSecret - Secret for access tokens
   * @param {string} options.refreshSecret - Secret for refresh tokens
   * @param {string} options.accessExpiry - Access token expiry (e.g., '15m', '1h')
   * @param {string} options.refreshExpiry - Refresh token expiry (e.g., '7d', '30d')
   * @param {string} options.algorithm - JWT algorithm (default: 'HS256')
   * @param {string} options.issuer - Token issuer
   * @param {string} options.audience - Token audience
   * @param {Object} options.storage - Storage for blacklist/tokens (Memory or Redis)
   */
  constructor(options = {}) {
    if (!options.accessSecret) {
      throw new Error('accessSecret is required');
    }
    
    if (!options.refreshSecret) {
      throw new Error('refreshSecret is required');
    }
    
    this.options = {
      accessSecret: options.accessSecret,
      refreshSecret: options.refreshSecret,
      accessExpiry: options.accessExpiry || '15m',
      refreshExpiry: options.refreshExpiry || '7d',
      algorithm: options.algorithm || 'HS256',
      issuer: options.issuer || 'microservice-framework',
      audience: options.audience,
      storage: options.storage || new Map() // Default: in-memory
    };
    
    // Blacklist for revoked tokens
    this.blacklist = new Set();
    
    // Refresh token store (tokenId -> userId mapping)
    this.refreshTokenStore = new Map();
  }
  
  /**
   * Generate access and refresh tokens
   * @param {Object} payload - Token payload
   * @param {Object} options - Override options
   * @returns {Promise<{accessToken: string, refreshToken: string, expiresIn: number}>}
   */
  async generateTokens(payload, options = {}) {
    // Generate unique token IDs
    const accessTokenId = this.generateTokenId();
    const refreshTokenId = this.generateTokenId();
    
    const accessExpiry = options.accessExpiry || this.options.accessExpiry;
    const refreshExpiry = options.refreshExpiry || this.options.refreshExpiry;
    
    // Access token payload
    const accessPayload = {
      ...payload,
      jti: accessTokenId,
      type: 'access',
      iat: Math.floor(Date.now() / 1000)
    };
    
    // Refresh token payload (minimal data)
    const refreshPayload = {
      userId: payload.userId || payload.sub,
      jti: refreshTokenId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000)
    };
    
    // Sign tokens
    const accessToken = jwt.sign(accessPayload, this.options.accessSecret, {
      expiresIn: accessExpiry,
      algorithm: this.options.algorithm,
      issuer: this.options.issuer,
      audience: this.options.audience
    });
    
    const refreshToken = jwt.sign(refreshPayload, this.options.refreshSecret, {
      expiresIn: refreshExpiry,
      algorithm: this.options.algorithm,
      issuer: this.options.issuer,
      audience: this.options.audience
    });
    
    // Store refresh token
    const refreshExpirySeconds = parseDuration(refreshExpiry);
    await this.storeRefreshToken(refreshTokenId, payload.userId || payload.sub, refreshExpirySeconds);
    
    return {
      accessToken,
      refreshToken,
      expiresIn: parseDuration(accessExpiry),
      tokenType: 'Bearer'
    };
  }
  
  /**
   * Verify access token
   * @param {string} token - Access token
   * @returns {Promise<Object>} - Decoded payload
   */
  async verifyAccessToken(token) {
    try {
      const payload = jwt.verify(token, this.options.accessSecret, {
        algorithms: [this.options.algorithm],
        issuer: this.options.issuer,
        audience: this.options.audience
      });
      
      // Check if token is blacklisted
      if (await this.isBlacklisted(payload.jti)) {
        throw new Error('Token has been revoked');
      }
      
      if (payload.type !== 'access') {
        throw new Error('Invalid token type');
      }
      
      return payload;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Access token expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid access token');
      }
      throw error;
    }
  }
  
  /**
   * Verify refresh token
   * @param {string} token - Refresh token
   * @returns {Promise<Object>} - Decoded payload
   */
  async verifyRefreshToken(token) {
    try {
      const payload = jwt.verify(token, this.options.refreshSecret, {
        algorithms: [this.options.algorithm],
        issuer: this.options.issuer,
        audience: this.options.audience
      });
      
      // Check if token is blacklisted
      if (await this.isBlacklisted(payload.jti)) {
        throw new Error('Token has been revoked');
      }
      
      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      
      // Check if refresh token exists in store
      const storedUserId = await this.getRefreshToken(payload.jti);
      if (!storedUserId || storedUserId !== payload.userId) {
        throw new Error('Refresh token not found or invalid');
      }
      
      return payload;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }
  
  /**
   * Refresh tokens using refresh token
   * @param {string} refreshToken - Current refresh token
   * @param {Object} newPayload - Optional new payload data
   * @returns {Promise<{accessToken: string, refreshToken: string, expiresIn: number}>}
   */
  async refreshTokens(refreshToken, newPayload = {}) {
    // Verify refresh token
    const payload = await this.verifyRefreshToken(refreshToken);
    
    // Revoke old refresh token
    await this.revokeToken(payload.jti);
    await this.deleteRefreshToken(payload.jti);
    
    // Get user data (in real app, fetch from database)
    const userData = {
      userId: payload.userId,
      ...newPayload
    };
    
    // Generate new tokens
    return this.generateTokens(userData);
  }
  
  /**
   * Revoke token (add to blacklist)
   * @param {string} tokenId - Token JTI
   * @param {number} expirySeconds - How long to keep in blacklist
   */
  async revokeToken(tokenId, expirySeconds = 86400) {
    this.blacklist.add(tokenId);
    
    // If using Redis, set with expiry
    if (this.options.storage.setex) {
      await this.options.storage.setex(`blacklist:${tokenId}`, expirySeconds, '1');
    }
  }
  
  /**
   * Check if token is blacklisted
   * @param {string} tokenId - Token JTI
   * @returns {Promise<boolean>}
   */
  async isBlacklisted(tokenId) {
    // Check in-memory blacklist
    if (this.blacklist.has(tokenId)) {
      return true;
    }
    
    // Check Redis if available
    if (this.options.storage.get) {
      const result = await this.options.storage.get(`blacklist:${tokenId}`);
      return result !== null;
    }
    
    return false;
  }
  
  /**
   * Revoke all tokens for user
   * @param {string} userId - User ID
   */
  async revokeAllUserTokens(userId) {
    // Find all refresh tokens for user
    const tokens = [];
    
    for (const [tokenId, storedUserId] of this.refreshTokenStore.entries()) {
      if (storedUserId === userId) {
        tokens.push(tokenId);
      }
    }
    
    // Revoke all tokens
    for (const tokenId of tokens) {
      await this.revokeToken(tokenId);
      await this.deleteRefreshToken(tokenId);
    }
  }
  
  /**
   * Store refresh token
   * @param {string} tokenId - Token ID
   * @param {string} userId - User ID
   * @param {number} expirySeconds - Expiry in seconds
   */
  async storeRefreshToken(tokenId, userId, expirySeconds) {
    this.refreshTokenStore.set(tokenId, userId);
    
    // If using Redis, set with expiry
    if (this.options.storage.setex) {
      await this.options.storage.setex(`refresh:${tokenId}`, expirySeconds, userId);
    }
  }
  
  /**
   * Get refresh token data
   * @param {string} tokenId - Token ID
   * @returns {Promise<string|null>} - User ID or null
   */
  async getRefreshToken(tokenId) {
    // Check in-memory store
    if (this.refreshTokenStore.has(tokenId)) {
      return this.refreshTokenStore.get(tokenId);
    }
    
    // Check Redis if available
    if (this.options.storage.get) {
      return await this.options.storage.get(`refresh:${tokenId}`);
    }
    
    return null;
  }
  
  /**
   * Delete refresh token
   * @param {string} tokenId - Token ID
   */
  async deleteRefreshToken(tokenId) {
    this.refreshTokenStore.delete(tokenId);
    
    // Delete from Redis if available
    if (this.options.storage.del) {
      await this.options.storage.del(`refresh:${tokenId}`);
    }
  }
  
  /**
   * Generate unique token ID
   * @returns {string}
   */
  generateTokenId() {
    return crypto.randomBytes(16).toString('hex');
  }
  
  /**
   * Decode token without verification (for inspection)
   * @param {string} token - JWT token
   * @returns {Object} - Decoded payload
   */
  decode(token) {
    return jwt.decode(token);
  }
  
  /**
   * Extract token from Authorization header
   * @param {string} header - Authorization header value
   * @returns {string|null} - Token or null
   */
  extractFromHeader(header) {
    if (!header) return null;
    
    const match = header.match(/^Bearer\s+(.+)$/i);
    return match ? match[1] : null;
  }
}

/**
 * Create JWT authentication middleware
 */
export function createJWTMiddleware(jwtAuth, options = {}) {
  const {
    required = true,
    skipPaths = [],
    tokenExtractor = (req) => jwtAuth.extractFromHeader(req.headers.authorization)
  } = options;
  
  return async function jwtMiddleware(req, res, next) {
    // Skip authentication for certain paths
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }
    
    try {
      const token = tokenExtractor(req);
      
      if (!token) {
        if (required) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'No token provided'
          });
        }
        return next();
      }
      
      // Verify token
      const payload = await jwtAuth.verifyAccessToken(token);
      
      // Attach user data to request
      req.user = payload;
      req.userId = payload.userId || payload.sub;
      
      next();
    } catch (error) {
      if (required) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: error.message
        });
      }
      next();
    }
  };
}

export default {
  JWTAuth,
  createJWTMiddleware
};
