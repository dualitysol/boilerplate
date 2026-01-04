/**
 * Audit Mutation Resolvers
 */

export default {
  async createAuditLog(_, args, context) {
    const { action, resourceType, resourceId, changes } = args;
    const { services, user } = context;
    
    if (!user) {
      return {
        success: false,
        message: 'Not authenticated',
        log: null
      };
    }
    
    try {
      const logId = await services.AuditService.log({
        action,
        userId: user.id,
        userName: user.email || user.name,
        resourceType,
        resourceId,
        changes: changes ? JSON.parse(changes) : {},
        metadata: {
          ip: context.ip || 'unknown',
          userAgent: context.userAgent
        }
      });
      
      // Get the created log
      const logs = await services.AuditService.query({ id: logId });
      const log = logs[0];
      
      return {
        success: true,
        message: 'Audit log created',
        log: log ? {
          id: log.id,
          action: log.action,
          userId: log.userId,
          userName: log.userName,
          resourceType: log.resourceType,
          resourceId: log.resourceId,
          changes: JSON.stringify(log.changes),
          metadata: JSON.stringify(log.metadata),
          timestamp: log.timestamp.toISOString(),
          status: log.status,
          error: log.error
        } : null
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        log: null
      };
    }
  }
};
