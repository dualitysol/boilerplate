/**
 * Audit Logging Demo
 * 
 * Demonstrates:
 * - Automatic CRUD audit logging
 * - Decorator-based audit (@AuditCreate, @AuditUpdate, @AuditDelete)
 * - Query audit logs
 * - Export for compliance (GDPR, SOC2, HIPAA)
 * - Resource history
 * - User activity tracking
 */

import { Microservice } from '@dualitysol/boilerplate';
import { AuditLogger, setGlobalAuditLogger } from '@dualitysol/boilerplate/audit';
import { 
  typeDefinitions,
  queryMutations,
  AuditService,
  AuditActions
} from './Audit/index.js';

// Initialize microservice
const app = new Microservice({
  name: 'audit-demo',
  version: '1.0.0',
  
  transport: {
    type: 'http',
    port: 4003
  },
  
  graphql: {
    enabled: true,
    playground: true
  }
});

// Create audit logger
const auditLogger = new AuditLogger({
  storage: 'memory',
  sensitiveFields: ['password', 'creditCard', 'ssn', 'apiKey'],
  includeMetadata: true
});

// Set as global logger for decorators
setGlobalAuditLogger(auditLogger);

// Register service
app.registerService('AuditService', new AuditService(auditLogger));

// Register GraphQL schema and resolvers
app.registerGraphQL({
  typeDefs: typeDefinitions,
  resolvers: queryMutations
});

// Add mock auth middleware (for demo)
app.use((req, res, next) => {
  // Mock user for testing
  req.user = {
    id: 'demo-user-123',
    email: 'demo@example.com',
    name: 'Demo User',
    role: 'admin'
  };
  
  req.ip = req.connection?.remoteAddress || '127.0.0.1';
  req.userAgent = req.headers['user-agent'];
  
  next();
});

// Create some sample audit logs
setTimeout(async () => {
  const actions = [
    AuditActions.USER_CREATE,
    AuditActions.USER_UPDATE,
    AuditActions.PRODUCT_CREATE,
    AuditActions.ORDER_CREATE,
    AuditActions.PAYMENT_SUCCESS
  ];
  
  for (let i = 0; i < 10; i++) {
    await auditLogger.log({
      action: actions[i % actions.length],
      userId: `user${i % 3}`,
      userName: `user${i % 3}@example.com`,
      resourceType: actions[i % actions.length].split('.')[0],
      resourceId: `res_${i}`,
      changes: { field: { old: `old${i}`, new: `new${i}` } },
      metadata: { ip: '127.0.0.1', userAgent: 'Demo' }
    });
  }
  
  console.log('✅ Created 10 sample audit logs');
}, 1000);

// Start server
await app.start();

console.log('🚀 Audit Demo running!');
console.log('📊 GraphQL Playground: http://localhost:4003/graphql');
console.log('');
console.log('Audit Features:');
console.log('  ✅ Automatic CRUD tracking');
console.log('  ✅ Who/What/When logging');
console.log('  ✅ Before/after diffs');
console.log('  ✅ Compliance exports (GDPR, SOC2, HIPAA)');
console.log('  ✅ Resource history');
console.log('  ✅ User activity');
console.log('');
console.log('Try these queries:');
console.log('');
console.log('# Get recent activity');
console.log('query {');
console.log('  recentActivity(limit: 10) {');
console.log('    success');
console.log('    logs {');
console.log('      id');
console.log('      action');
console.log('      userId');
console.log('      userName');
console.log('      resourceType');
console.log('      timestamp');
console.log('      changes');
console.log('    }');
console.log('    total');
console.log('  }');
console.log('}');
console.log('');
console.log('# Get user activity');
console.log('query {');
console.log('  userActivity(userId: "user0", limit: 10) {');
console.log('    success');
console.log('    logs {');
console.log('      action');
console.log('      resourceType');
console.log('      timestamp');
console.log('    }');
console.log('  }');
console.log('}');
console.log('');
console.log('# Export for compliance');
console.log('query {');
console.log('  exportAuditLogs(input: { userId: "user0" }) {');
console.log('    success');
console.log('    message');
console.log('    data');
console.log('  }');
console.log('}');
console.log('');
console.log('# Create audit log (manual)');
console.log('mutation {');
console.log('  createAuditLog(');
console.log('    action: "product.update"');
console.log('    resourceType: "Product"');
console.log('    resourceId: "prod_123"');
console.log('    changes: "{\\"price\\":{\\"old\\":99.99,\\"new\\":89.99}}"');
console.log('  ) {');
console.log('    success');
console.log('    log {');
console.log('      id');
console.log('      action');
console.log('      changes');
console.log('    }');
console.log('  }');
console.log('}');
