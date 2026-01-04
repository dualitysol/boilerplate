/**
 * Audit Query Resolvers
 */

export default {
  async auditLogs(_, { input = {} }, context) {
    const { services } = context;
    
    try {
      const { limit = 50, offset = 0, ...filter } = input;
      
      const logs = await services.AuditService.query(filter, { limit, offset });
      const total = await services.AuditService.count(filter);
      
      return {
        success: true,
        logs: logs.map(formatAuditLog),
        total
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        logs: [],
        total: 0
      };
    }
  },
  
  async resourceHistory(_, { resourceType, resourceId }, context) {
    const { services } = context;
    
    try {
      const logs = await services.AuditService.getResourceHistory(resourceType, resourceId);
      
      return {
        success: true,
        logs: logs.map(formatAuditLog),
        total: logs.length
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        logs: [],
        total: 0
      };
    }
  },
  
  async userActivity(_, { userId, limit = 100 }, context) {
    const { services } = context;
    
    try {
      const logs = await services.AuditService.getUserActivity(userId, { limit });
      
      return {
        success: true,
        logs: logs.map(formatAuditLog),
        total: logs.length
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        logs: [],
        total: 0
      };
    }
  },
  
  async recentActivity(_, { limit = 100 }, context) {
    const { services } = context;
    
    try {
      const logs = await services.AuditService.getRecentActivity(limit);
      
      return {
        success: true,
        logs: logs.map(formatAuditLog),
        total: logs.length
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        logs: [],
        total: 0
      };
    }
  },
  
  async exportAuditLogs(_, { input = {} }, context) {
    const { services } = context;
    
    try {
      const { limit = 10000, offset = 0, ...filter } = input;
      
      const data = await services.AuditService.export(filter, { limit, offset });
      
      return {
        success: true,
        message: `Exported ${JSON.parse(data).length} logs`,
        data
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: null
      };
    }
  }
};

// Helper to format audit log for GraphQL
function formatAuditLog(log) {
  return {
    id: log.id,
    action: log.action,
    userId: log.userId,
    userName: log.userName,
    resourceType: log.resourceType,
    resourceId: log.resourceId,
    changes: JSON.stringify(log.changes),
    metadata: JSON.stringify(log.metadata),
    timestamp: log.timestamp.toISOString ? log.timestamp.toISOString() : log.timestamp,
    status: log.status,
    error: log.error
  };
}
