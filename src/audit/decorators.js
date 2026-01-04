/**
 * Audit Logging Decorators
 * 
 * Automatically log CRUD operations with decorators
 * 
 * @example
 * ```javascript
 * import { Audited, AuditCreate, AuditUpdate, AuditDelete } from '@microservice-framework/boilerplate/audit';
 * 
 * @Audited({ resourceType: 'User' })
 * class UserService extends Microservice {
 *   @AuditCreate()
 *   async createUser(data, context) {
 *     return this.createOne(data);
 *   }
 *   
 *   @AuditUpdate()
 *   async updateUser(id, data, context) {
 *     const oldValue = await this.findOne({ _id: id });
 *     const result = await this.updateOne({ _id: id }, { $set: data });
 *     return result;
 *   }
 *   
 *   @AuditDelete()
 *   async deleteUser(id, context) {
 *     const oldValue = await this.findOne({ _id: id });
 *     await this.deleteOne({ _id: id });
 *     return { success: true };
 *   }
 * }
 * ```
 */

import 'reflect-metadata';

// Global audit logger instance
let globalAuditLogger = null;

/**
 * Set global audit logger
 */
export function setGlobalAuditLogger(logger) {
  globalAuditLogger = logger;
}

/**
 * Get global audit logger
 */
export function getGlobalAuditLogger() {
  return globalAuditLogger;
}

/**
 * @Audited decorator - Mark class as audited
 */
export function Audited(options = {}) {
  return function(target) {
    Reflect.defineMetadata('audit:enabled', true, target);
    Reflect.defineMetadata('audit:options', options, target);
    return target;
  };
}

/**
 * @AuditCreate decorator - Audit create operations
 */
export function AuditCreate(options = {}) {
  return function(target, context) {
    const methodName = String(context.name);
    
    return async function(...args) {
      const classOptions = Reflect.getMetadata('audit:options', this.constructor) || {};
      const resourceType = options.resourceType || classOptions.resourceType || this.constructor.name;
      
      // Execute original method
      const result = await target.apply(this, args);
      
      // Extract context
      const contextArg = args.find(arg => 
        arg && (arg.user || arg.userId || arg.services)
      );
      
      if (!contextArg) {
        console.warn(`@AuditCreate: Context not found in ${methodName} arguments`);
        return result;
      }
      
      // Get audit logger
      const auditLogger = globalAuditLogger || this.auditLogger;
      
      if (!auditLogger) {
        console.warn(`@AuditCreate: No audit logger configured`);
        return result;
      }
      
      // Log create operation
      try {
        await auditLogger.logCreate({
          userId: contextArg.user?.id || contextArg.userId || 'system',
          userName: contextArg.user?.name || contextArg.user?.email,
          resourceType,
          resourceId: result._id || result.id,
          newValue: result,
          metadata: {
            method: methodName,
            ip: contextArg.ip,
            userAgent: contextArg.userAgent
          }
        });
      } catch (error) {
        console.error('Audit logging error:', error);
      }
      
      return result;
    };
  };
}

/**
 * @AuditUpdate decorator - Audit update operations
 */
export function AuditUpdate(options = {}) {
  return function(target, context) {
    const methodName = String(context.name);
    
    return async function(...args) {
      const classOptions = Reflect.getMetadata('audit:options', this.constructor) || {};
      const resourceType = options.resourceType || classOptions.resourceType || this.constructor.name;
      
      // Extract context
      const contextArg = args.find(arg => 
        arg && (arg.user || arg.userId || arg.services)
      );
      
      if (!contextArg) {
        console.warn(`@AuditUpdate: Context not found in ${methodName} arguments`);
        return target.apply(this, args);
      }
      
      // Get resource ID from arguments
      const resourceId = args[0]; // Usually first argument is ID
      
      // Capture old value
      let oldValue = null;
      if (this.findOne && resourceId) {
        try {
          oldValue = await this.findOne({ _id: resourceId });
        } catch (error) {
          // Ignore if can't find old value
        }
      }
      
      // Execute original method
      const result = await target.apply(this, args);
      
      // Get audit logger
      const auditLogger = globalAuditLogger || this.auditLogger;
      
      if (!auditLogger) {
        console.warn(`@AuditUpdate: No audit logger configured`);
        return result;
      }
      
      // Log update operation
      try {
        await auditLogger.logUpdate({
          userId: contextArg.user?.id || contextArg.userId || 'system',
          userName: contextArg.user?.name || contextArg.user?.email,
          resourceType,
          resourceId: resourceId || result._id || result.id,
          oldValue,
          newValue: result,
          metadata: {
            method: methodName,
            ip: contextArg.ip,
            userAgent: contextArg.userAgent
          }
        });
      } catch (error) {
        console.error('Audit logging error:', error);
      }
      
      return result;
    };
  };
}

/**
 * @AuditDelete decorator - Audit delete operations
 */
export function AuditDelete(options = {}) {
  return function(target, context) {
    const methodName = String(context.name);
    
    return async function(...args) {
      const classOptions = Reflect.getMetadata('audit:options', this.constructor) || {};
      const resourceType = options.resourceType || classOptions.resourceType || this.constructor.name;
      
      // Extract context
      const contextArg = args.find(arg => 
        arg && (arg.user || arg.userId || arg.services)
      );
      
      if (!contextArg) {
        console.warn(`@AuditDelete: Context not found in ${methodName} arguments`);
        return target.apply(this, args);
      }
      
      // Get resource ID from arguments
      const resourceId = args[0];
      
      // Capture old value before deletion
      let oldValue = null;
      if (this.findOne && resourceId) {
        try {
          oldValue = await this.findOne({ _id: resourceId });
        } catch (error) {
          // Ignore if can't find old value
        }
      }
      
      // Execute original method
      const result = await target.apply(this, args);
      
      // Get audit logger
      const auditLogger = globalAuditLogger || this.auditLogger;
      
      if (!auditLogger) {
        console.warn(`@AuditDelete: No audit logger configured`);
        return result;
      }
      
      // Log delete operation
      try {
        await auditLogger.logDelete({
          userId: contextArg.user?.id || contextArg.userId || 'system',
          userName: contextArg.user?.name || contextArg.user?.email,
          resourceType,
          resourceId: resourceId,
          oldValue,
          metadata: {
            method: methodName,
            ip: contextArg.ip,
            userAgent: contextArg.userAgent
          }
        });
      } catch (error) {
        console.error('Audit logging error:', error);
      }
      
      return result;
    };
  };
}

/**
 * @AuditRead decorator - Audit read operations (optional, can be noisy)
 */
export function AuditRead(options = {}) {
  return function(target, context) {
    const methodName = String(context.name);
    
    return async function(...args) {
      const classOptions = Reflect.getMetadata('audit:options', this.constructor) || {};
      const resourceType = options.resourceType || classOptions.resourceType || this.constructor.name;
      
      // Execute original method
      const result = await target.apply(this, args);
      
      // Extract context
      const contextArg = args.find(arg => 
        arg && (arg.user || arg.userId || arg.services)
      );
      
      if (!contextArg) {
        return result;
      }
      
      // Get audit logger
      const auditLogger = globalAuditLogger || this.auditLogger;
      
      if (!auditLogger) {
        return result;
      }
      
      // Log read operation
      try {
        const resourceId = args[0];
        
        await auditLogger.logRead({
          userId: contextArg.user?.id || contextArg.userId || 'system',
          userName: contextArg.user?.name || contextArg.user?.email,
          resourceType,
          resourceId: resourceId || 'list',
          metadata: {
            method: methodName,
            ip: contextArg.ip,
            userAgent: contextArg.userAgent
          }
        });
      } catch (error) {
        console.error('Audit logging error:', error);
      }
      
      return result;
    };
  };
}

/**
 * @Audit decorator - Generic audit decorator
 */
export function Audit(action, options = {}) {
  return function(target, context) {
    const methodName = String(context.name);
    
    return async function(...args) {
      const classOptions = Reflect.getMetadata('audit:options', this.constructor) || {};
      const resourceType = options.resourceType || classOptions.resourceType || this.constructor.name;
      
      // Execute original method
      const result = await target.apply(this, args);
      
      // Extract context
      const contextArg = args.find(arg => 
        arg && (arg.user || arg.userId || arg.services)
      );
      
      if (!contextArg) {
        return result;
      }
      
      // Get audit logger
      const auditLogger = globalAuditLogger || this.auditLogger;
      
      if (!auditLogger) {
        return result;
      }
      
      // Log operation
      try {
        await auditLogger.log({
          action,
          userId: contextArg.user?.id || contextArg.userId || 'system',
          userName: contextArg.user?.name || contextArg.user?.email,
          resourceType,
          resourceId: args[0] || result._id || result.id,
          metadata: {
            method: methodName,
            ip: contextArg.ip,
            userAgent: contextArg.userAgent,
            result: options.includeResult ? result : undefined
          }
        });
      } catch (error) {
        console.error('Audit logging error:', error);
      }
      
      return result;
    };
  };
}

export default {
  Audited,
  AuditCreate,
  AuditUpdate,
  AuditDelete,
  AuditRead,
  Audit,
  setGlobalAuditLogger,
  getGlobalAuditLogger
};
