/**
 * Audit Model and Utilities
 */

// Common audit actions
export const AuditActions = {
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  
  PRODUCT_CREATE: 'product.create',
  PRODUCT_UPDATE: 'product.update',
  PRODUCT_DELETE: 'product.delete',
  
  ORDER_CREATE: 'order.create',
  ORDER_UPDATE: 'order.update',
  ORDER_CANCEL: 'order.cancel',
  
  PAYMENT_CREATE: 'payment.create',
  PAYMENT_SUCCESS: 'payment.success',
  PAYMENT_FAILED: 'payment.failed',
  
  DATA_EXPORT: 'data.export',
  DATA_IMPORT: 'data.import',
  
  SETTINGS_UPDATE: 'settings.update',
  CONFIG_UPDATE: 'config.update'
};

// Resource types
export const ResourceTypes = {
  USER: 'User',
  PRODUCT: 'Product',
  ORDER: 'Order',
  PAYMENT: 'Payment',
  SETTINGS: 'Settings',
  CONFIG: 'Config'
};

// Format audit log for display
export const formatAuditLog = (log) => {
  return {
    ...log,
    changes: typeof log.changes === 'string' ? JSON.parse(log.changes) : log.changes,
    metadata: typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata
  };
};

// Create audit context from request
export const createAuditContext = (req) => {
  return {
    userId: req.user?.id || 'anonymous',
    userName: req.user?.email || req.user?.name || 'anonymous',
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers?.['user-agent']
  };
};

// Compliance helpers
export const ComplianceFilters = {
  // GDPR - All data about a user
  gdpr: (userId) => ({
    userId
  }),
  
  // SOC2 - All access to sensitive data
  soc2: (resourceType = 'SensitiveData') => ({
    resourceType,
    action: /\.(read|export|update|delete)$/
  }),
  
  // HIPAA - All PHI access
  hipaa: () => ({
    resourceType: 'PatientRecord'
  }),
  
  // PCI - All payment operations
  pci: () => ({
    resourceType: 'Payment'
  })
};
