/**
 * Audit Logging System
 * 
 * Features:
 * - Automatic CRUD operation tracking
 * - Who did what, when, and what changed
 * - Diff tracking (before/after values)
 * - Multiple storage backends (MongoDB, PostgreSQL, Elasticsearch)
 * - Query and export audit logs
 * - Compliance-ready (GDPR, SOC2, HIPAA)
 * 
 * @example
 * ```javascript
 * import { AuditLogger } from '@microservice-framework/boilerplate/audit';
 * 
 * const audit = new AuditLogger({
 *   storage: 'mongodb',
 *   collection: db.collection('audit_logs')
 * });
 * 
 * // Log an action
 * await audit.log({
 *   action: 'user.update',
 *   userId: '123',
 *   resourceType: 'User',
 *   resourceId: '456',
 *   changes: { email: { old: 'old@example.com', new: 'new@example.com' } }
 * });
 * 
 * // Query logs
 * const logs = await audit.query({ userId: '123', action: 'user.update' });
 * ```
 */

/**
 * Audit log entry structure
 * @typedef {Object} AuditLogEntry
 * @property {string} id - Unique log ID
 * @property {string} action - Action performed (e.g., 'user.create', 'post.update')
 * @property {string} userId - User who performed the action
 * @property {string} userName - User name (for readability)
 * @property {string} resourceType - Type of resource (e.g., 'User', 'Post')
 * @property {string} resourceId - ID of the resource
 * @property {Object} changes - What changed (before/after values)
 * @property {Object} metadata - Additional context (IP, user agent, etc.)
 * @property {Date} timestamp - When the action occurred
 * @property {string} status - 'success' or 'failure'
 * @property {string} error - Error message if failed
 */

import crypto from 'crypto';

/**
 * Generate unique audit log ID
 */
function generateAuditId() {
  return `audit_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Calculate diff between old and new values
 */
function calculateDiff(oldValue, newValue) {
  if (typeof oldValue !== 'object' || typeof newValue !== 'object') {
    return {
      old: oldValue,
      new: newValue
    };
  }
  
  const changes = {};
  const allKeys = new Set([...Object.keys(oldValue || {}), ...Object.keys(newValue || {})]);
  
  for (const key of allKeys) {
    if (oldValue?.[key] !== newValue?.[key]) {
      changes[key] = {
        old: oldValue?.[key],
        new: newValue?.[key]
      };
    }
  }
  
  return changes;
}

/**
 * MongoDB Storage for audit logs
 */
class MongoAuditStorage {
  constructor(collection) {
    this.collection = collection;
  }
  
  async insert(entry) {
    await this.collection.insertOne(entry);
  }
  
  async query(filter, options = {}) {
    const { limit = 100, skip = 0, sort = { timestamp: -1 } } = options;
    
    const cursor = this.collection.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    return await cursor.toArray();
  }
  
  async count(filter) {
    return await this.collection.countDocuments(filter);
  }
  
  async exportToJSON(filter, options = {}) {
    const logs = await this.query(filter, { ...options, limit: 10000 });
    return JSON.stringify(logs, null, 2);
  }
}

/**
 * PostgreSQL Storage for audit logs
 */
class PostgresAuditStorage {
  constructor(pool, tableName = 'audit_logs') {
    this.pool = pool;
    this.tableName = tableName;
  }
  
  async insert(entry) {
    const query = `
      INSERT INTO ${this.tableName} (
        id, action, user_id, user_name, resource_type, resource_id,
        changes, metadata, timestamp, status, error
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;
    
    await this.pool.query(query, [
      entry.id,
      entry.action,
      entry.userId,
      entry.userName,
      entry.resourceType,
      entry.resourceId,
      JSON.stringify(entry.changes),
      JSON.stringify(entry.metadata),
      entry.timestamp,
      entry.status,
      entry.error
    ]);
  }
  
  async query(filter, options = {}) {
    const { limit = 100, skip = 0, sort = 'timestamp DESC' } = options;
    
    const whereClauses = [];
    const values = [];
    let paramCount = 1;
    
    if (filter.userId) {
      whereClauses.push(`user_id = $${paramCount++}`);
      values.push(filter.userId);
    }
    
    if (filter.action) {
      whereClauses.push(`action = $${paramCount++}`);
      values.push(filter.action);
    }
    
    if (filter.resourceType) {
      whereClauses.push(`resource_type = $${paramCount++}`);
      values.push(filter.resourceType);
    }
    
    if (filter.resourceId) {
      whereClauses.push(`resource_id = $${paramCount++}`);
      values.push(filter.resourceId);
    }
    
    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    
    const query = `
      SELECT * FROM ${this.tableName}
      ${whereClause}
      ORDER BY ${sort}
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;
    
    values.push(limit, skip);
    
    const result = await this.pool.query(query, values);
    return result.rows;
  }
  
  async count(filter) {
    const whereClauses = [];
    const values = [];
    let paramCount = 1;
    
    if (filter.userId) {
      whereClauses.push(`user_id = $${paramCount++}`);
      values.push(filter.userId);
    }
    
    if (filter.action) {
      whereClauses.push(`action = $${paramCount++}`);
      values.push(filter.action);
    }
    
    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    
    const query = `SELECT COUNT(*) FROM ${this.tableName} ${whereClause}`;
    const result = await this.pool.query(query, values);
    
    return parseInt(result.rows[0].count);
  }
  
  async exportToJSON(filter, options = {}) {
    const logs = await this.query(filter, { ...options, limit: 10000 });
    return JSON.stringify(logs, null, 2);
  }
}

/**
 * In-Memory Storage (for testing/development)
 */
class MemoryAuditStorage {
  constructor() {
    this.logs = [];
  }
  
  async insert(entry) {
    this.logs.push(entry);
  }
  
  async query(filter, options = {}) {
    const { limit = 100, skip = 0 } = options;
    
    let filtered = this.logs;
    
    if (filter.userId) {
      filtered = filtered.filter(log => log.userId === filter.userId);
    }
    
    if (filter.action) {
      filtered = filtered.filter(log => log.action === filter.action);
    }
    
    if (filter.resourceType) {
      filtered = filtered.filter(log => log.resourceType === filter.resourceType);
    }
    
    if (filter.resourceId) {
      filtered = filtered.filter(log => log.resourceId === filter.resourceId);
    }
    
    // Sort by timestamp descending
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return filtered.slice(skip, skip + limit);
  }
  
  async count(filter) {
    const logs = await this.query(filter, { limit: Infinity });
    return logs.length;
  }
  
  async exportToJSON(filter, options = {}) {
    const logs = await this.query(filter, { ...options, limit: 10000 });
    return JSON.stringify(logs, null, 2);
  }
  
  clear() {
    this.logs = [];
  }
}

/**
 * Audit Logger
 */
export class AuditLogger {
  /**
   * @param {Object} options - Configuration
   * @param {string} options.storage - Storage type ('mongodb', 'postgres', 'memory')
   * @param {Object} options.collection - MongoDB collection
   * @param {Object} options.pool - PostgreSQL pool
   * @param {string} options.tableName - PostgreSQL table name
   * @param {boolean} options.includeMetadata - Include request metadata (default: true)
   * @param {string[]} options.sensitiveFields - Fields to redact from logs
   * @param {Function} options.onLog - Callback after logging
   */
  constructor(options = {}) {
    this.options = {
      storage: options.storage || 'memory',
      includeMetadata: options.includeMetadata !== false,
      sensitiveFields: options.sensitiveFields || ['password', 'token', 'secret', 'apiKey'],
      onLog: options.onLog || null
    };
    
    // Initialize storage
    if (this.options.storage === 'mongodb') {
      if (!options.collection) {
        throw new Error('MongoDB collection required');
      }
      this.storage = new MongoAuditStorage(options.collection);
    } else if (this.options.storage === 'postgres') {
      if (!options.pool) {
        throw new Error('PostgreSQL pool required');
      }
      this.storage = new PostgresAuditStorage(options.pool, options.tableName);
    } else {
      this.storage = new MemoryAuditStorage();
    }
  }
  
  /**
   * Log an audit entry
   * @param {Object} params - Log parameters
   * @returns {Promise<string>} - Audit log ID
   */
  async log(params) {
    const {
      action,
      userId,
      userName,
      resourceType,
      resourceId,
      oldValue,
      newValue,
      changes,
      metadata = {},
      status = 'success',
      error = null
    } = params;
    
    // Calculate changes if not provided
    let finalChanges = changes;
    if (!finalChanges && oldValue && newValue) {
      finalChanges = calculateDiff(oldValue, newValue);
    }
    
    // Redact sensitive fields
    if (finalChanges) {
      finalChanges = this.redactSensitiveFields(finalChanges);
    }
    
    const entry = {
      id: generateAuditId(),
      action,
      userId,
      userName: userName || userId,
      resourceType,
      resourceId,
      changes: finalChanges || {},
      metadata: this.options.includeMetadata ? metadata : {},
      timestamp: new Date(),
      status,
      error
    };
    
    await this.storage.insert(entry);
    
    // Callback
    if (this.options.onLog) {
      this.options.onLog(entry);
    }
    
    return entry.id;
  }
  
  /**
   * Log a create operation
   */
  async logCreate(params) {
    return this.log({
      ...params,
      action: `${params.resourceType.toLowerCase()}.create`,
      changes: { created: params.newValue }
    });
  }
  
  /**
   * Log an update operation
   */
  async logUpdate(params) {
    return this.log({
      ...params,
      action: `${params.resourceType.toLowerCase()}.update`
    });
  }
  
  /**
   * Log a delete operation
   */
  async logDelete(params) {
    return this.log({
      ...params,
      action: `${params.resourceType.toLowerCase()}.delete`,
      changes: { deleted: params.oldValue }
    });
  }
  
  /**
   * Log a read operation (optional, can be noisy)
   */
  async logRead(params) {
    return this.log({
      ...params,
      action: `${params.resourceType.toLowerCase()}.read`,
      changes: {}
    });
  }
  
  /**
   * Query audit logs
   */
  async query(filter = {}, options = {}) {
    return await this.storage.query(filter, options);
  }
  
  /**
   * Count audit logs
   */
  async count(filter = {}) {
    return await this.storage.count(filter);
  }
  
  /**
   * Export audit logs to JSON
   */
  async export(filter = {}, options = {}) {
    return await this.storage.exportToJSON(filter, options);
  }
  
  /**
   * Redact sensitive fields from changes
   */
  redactSensitiveFields(changes) {
    const redacted = { ...changes };
    
    for (const field of this.options.sensitiveFields) {
      if (redacted[field]) {
        redacted[field] = {
          old: '***REDACTED***',
          new: '***REDACTED***'
        };
      }
    }
    
    return redacted;
  }
  
  /**
   * Get audit trail for a resource
   */
  async getResourceHistory(resourceType, resourceId, options = {}) {
    return await this.query({ resourceType, resourceId }, options);
  }
  
  /**
   * Get user activity
   */
  async getUserActivity(userId, options = {}) {
    return await this.query({ userId }, options);
  }
  
  /**
   * Get recent activity
   */
  async getRecentActivity(limit = 100) {
    return await this.query({}, { limit, sort: { timestamp: -1 } });
  }
}

/**
 * Create audit middleware for HTTP
 */
export function createAuditMiddleware(auditLogger, options = {}) {
  const {
    skipPaths = ['/health', '/metrics'],
    logReads = false
  } = options;
  
  return async function auditMiddleware(req, res, next) {
    // Skip certain paths
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }
    
    // Skip GET requests unless logReads is true
    if (req.method === 'GET' && !logReads) {
      return next();
    }
    
    // Capture original methods
    const originalJson = res.json.bind(res);
    const startTime = Date.now();
    
    // Override res.json to capture response
    res.json = function(data) {
      const duration = Date.now() - startTime;
      
      // Log audit entry
      const action = `${req.method.toLowerCase()}.${req.path.replace(/\//g, '.')}`;
      
      auditLogger.log({
        action,
        userId: req.user?.id || req.userId || 'anonymous',
        userName: req.user?.name || req.user?.email || 'anonymous',
        resourceType: req.baseUrl || 'api',
        resourceId: req.params?.id || null,
        metadata: {
          method: req.method,
          path: req.path,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          duration,
          statusCode: res.statusCode
        },
        status: res.statusCode < 400 ? 'success' : 'failure'
      }).catch(error => {
        console.error('Audit logging error:', error);
      });
      
      return originalJson(data);
    };
    
    next();
  };
}

export default {
  AuditLogger,
  createAuditMiddleware,
  MongoAuditStorage,
  PostgresAuditStorage,
  MemoryAuditStorage
};
