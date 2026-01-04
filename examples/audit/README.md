# Audit Logging System

Complete audit trail system for compliance and security monitoring.

## Features

✅ **Automatic CRUD Tracking** - Who did what, when, and what changed  
✅ **Decorator-Based** - `@AuditCreate`, `@AuditUpdate`, `@AuditDelete`  
✅ **Multiple Storage** - Memory, MongoDB, PostgreSQL, Elasticsearch  
✅ **Before/After Diff** - Automatic change tracking  
✅ **Sensitive Data Redaction** - Auto-redact passwords, tokens, etc.  
✅ **Query & Export** - Compliance reports (GDPR, SOC2, HIPAA)  
✅ **HTTP Middleware** - Automatic request logging  
✅ **Resource History** - Full audit trail per resource  

## Quick Start

```javascript
import { AuditLogger, Audited, AuditCreate, AuditUpdate, AuditDelete } from '@microservice-framework/boilerplate/audit';

// 1. Create logger
const audit = new AuditLogger({
  storage: 'mongodb',
  collection: db.collection('audit_logs'),
  sensitiveFields: ['password', 'creditCard']
});

// 2. Use decorators
@Audited({ resourceType: 'User' })
class UserService {
  @AuditCreate()
  async createUser(data, context) {
    return await this.db.insert(data);
  }
  
  @AuditUpdate()
  async updateUser(id, updates, context) {
    const old = await this.db.findOne({ _id: id });
    return await this.db.update({ _id: id }, updates);
  }
  
  @AuditDelete()
  async deleteUser(id, context) {
    const old = await this.db.findOne({ _id: id });
    await this.db.delete({ _id: id });
    return { success: true };
  }
}

// 3. Query logs
const userActivity = await audit.getUserActivity('user123');
const resourceHistory = await audit.getResourceHistory('User', 'user456');
const recentActivity = await audit.getRecentActivity(100);

// 4. Export for compliance
const jsonExport = await audit.export({ userId: 'user123' });
```

## Storage Backends

### MongoDB

```javascript
import { MongoClient } from 'mongodb';

const client = new MongoClient('mongodb://localhost:27017');
const db = client.db('myapp');
const collection = db.collection('audit_logs');

// Create indexes
await collection.createIndex({ userId: 1, timestamp: -1 });
await collection.createIndex({ resourceType: 1, resourceId: 1 });
await collection.createIndex({ action: 1 });

const audit = new AuditLogger({
  storage: 'mongodb',
  collection: collection
});
```

### PostgreSQL

```javascript
import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  database: 'myapp'
});

// Create table
await pool.query(`
  CREATE TABLE audit_logs (
    id VARCHAR(255) PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    user_id VARCHAR(100),
    user_name VARCHAR(255),
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    changes JSONB,
    metadata JSONB,
    timestamp TIMESTAMP NOT NULL,
    status VARCHAR(20),
    error TEXT
  );
  
  CREATE INDEX idx_audit_user ON audit_logs(user_id, timestamp DESC);
  CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
`);

const audit = new AuditLogger({
  storage: 'postgres',
  pool: pool,
  tableName: 'audit_logs'
});
```

### Memory (Development)

```javascript
const audit = new AuditLogger({ storage: 'memory' });
```

## Manual Logging

```javascript
// Create
await audit.logCreate({
  userId: 'user123',
  userName: 'john@example.com',
  resourceType: 'Order',
  resourceId: 'order456',
  newValue: { total: 99.99, items: 3 },
  metadata: { ip: '192.168.1.1' }
});

// Update
await audit.logUpdate({
  userId: 'user123',
  userName: 'john@example.com',
  resourceType: 'Order',
  resourceId: 'order456',
  oldValue: { status: 'pending' },
  newValue: { status: 'shipped' },
  metadata: { ip: '192.168.1.1' }
});

// Delete
await audit.logDelete({
  userId: 'user123',
  userName: 'john@example.com',
  resourceType: 'Order',
  resourceId: 'order456',
  oldValue: { total: 99.99 },
  metadata: { ip: '192.168.1.1' }
});
```

## HTTP Middleware

```javascript
import { createAuditMiddleware } from '@microservice-framework/boilerplate/audit';

const auditMiddleware = createAuditMiddleware(audit, {
  skipPaths: ['/health', '/metrics'],
  logReads: false // Don't log GET requests
});

app.use(auditMiddleware);
```

## Querying

```javascript
// By user
const userLogs = await audit.query({ userId: 'user123' });

// By action
const creates = await audit.query({ action: 'user.create' });

// By resource
const userChanges = await audit.query({ 
  resourceType: 'User',
  resourceId: 'user456'
});

// Pagination
const page1 = await audit.query({}, { limit: 50, skip: 0 });
const page2 = await audit.query({}, { limit: 50, skip: 50 });

// Count
const total = await audit.count({ userId: 'user123' });

// Resource history
const history = await audit.getResourceHistory('User', 'user456');

// User activity
const activity = await audit.getUserActivity('user123');

// Recent activity
const recent = await audit.getRecentActivity(100);
```

## Compliance Reports

```javascript
// Export all logs for a user (GDPR)
const gdprExport = await audit.export({ userId: 'user123' });

// Export all data access
const dataAccessLogs = await audit.query({ 
  action: 'data.export',
  // Add time range filter
});

// Export for specific time period
const monthlyReport = await audit.export({
  // Filter by timestamp range in query
});

// Save to file
import fs from 'fs';
fs.writeFileSync('audit-report.json', gdprExport);
```

## Sensitive Data Redaction

```javascript
const audit = new AuditLogger({
  storage: 'mongodb',
  collection: collection,
  sensitiveFields: ['password', 'creditCard', 'ssn', 'apiKey', 'token']
});

// Will automatically redact
await audit.logUpdate({
  userId: 'user123',
  userName: 'john@example.com',
  resourceType: 'User',
  resourceId: 'user456',
  changes: {
    password: { old: 'oldpass', new: 'newpass' },  // Redacted
    email: { old: 'old@example.com', new: 'new@example.com' }  // Not redacted
  }
});

// Result in database:
// {
//   changes: {
//     password: { old: '***REDACTED***', new: '***REDACTED***' },
//     email: { old: 'old@example.com', new: 'new@example.com' }
//   }
// }
```

## Decorators

### @Audited

Mark class as audited:

```javascript
@Audited({ resourceType: 'Product' })
class ProductService {
  // All @Audit* methods will use resourceType: 'Product'
}
```

### @AuditCreate

Automatically log create operations:

```javascript
@AuditCreate()
async createProduct(data, context) {
  return await this.db.insert(data);
}
```

### @AuditUpdate

Automatically log update operations with before/after:

```javascript
@AuditUpdate()
async updateProduct(id, updates, context) {
  // Decorator automatically captures old value
  return await this.db.update({ _id: id }, updates);
}
```

### @AuditDelete

Automatically log delete operations:

```javascript
@AuditDelete()
async deleteProduct(id, context) {
  // Decorator automatically captures old value before deletion
  await this.db.delete({ _id: id });
  return { success: true };
}
```

### @AuditRead

Optionally log read operations (can be noisy):

```javascript
@AuditRead()
async getProduct(id, context) {
  return await this.db.findOne({ _id: id });
}
```

### @Audit (Generic)

Custom audit action:

```javascript
@Audit('product.approve', { includeResult: true })
async approveProduct(id, context) {
  return await this.db.update({ _id: id }, { approved: true });
}
```

## Context Requirement

All audit decorators require a `context` parameter with user info:

```javascript
const context = {
  user: { id: 'user123', name: 'John Doe', email: 'john@example.com' },
  userId: 'user123',  // Alternative to user.id
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...'
};

await service.createProduct({ name: 'Laptop' }, context);
```

## Global Audit Logger

Set global logger for all decorators:

```javascript
import { setGlobalAuditLogger } from '@microservice-framework/boilerplate/audit';

const audit = new AuditLogger({ storage: 'mongodb', collection });
setGlobalAuditLogger(audit);

// Now all @Audit* decorators will use this logger
```

Or inject into service:

```javascript
class ProductService {
  constructor(auditLogger) {
    this.auditLogger = auditLogger;
  }
  
  @AuditCreate()
  async createProduct(data, context) {
    // Uses this.auditLogger
  }
}
```

## Audit Log Structure

```typescript
interface AuditLogEntry {
  id: string;              // Unique ID: "audit_1234567890_abc123"
  action: string;          // "user.create", "user.update", etc.
  userId: string;          // Who performed the action
  userName: string;        // User's name/email
  resourceType: string;    // "User", "Product", etc.
  resourceId: string;      // ID of affected resource
  changes: object;         // Before/after values
  metadata: object;        // IP, user agent, duration, etc.
  timestamp: Date;         // When it occurred
  status: string;          // "success" or "failure"
  error?: string;          // Error message if failed
}
```

## Best Practices

1. **Index your database** - Add indexes on `userId`, `resourceType`, `resourceId`, `timestamp`
2. **Set retention policy** - Delete old logs (e.g., keep 90 days)
3. **Use read-replicas** - Query audit logs from read replicas
4. **Don't log reads** - Unless required for compliance (too noisy)
5. **Redact sensitive data** - Configure `sensitiveFields`
6. **Use async logging** - Don't block main operations
7. **Monitor storage size** - Audit logs grow quickly
8. **Export regularly** - For compliance archives

## Compliance Use Cases

### GDPR - Right to Access

```javascript
// Export all data about a user
const userAudit = await audit.export({ userId: 'user123' });
```

### SOC2 - Access Logging

```javascript
// Track all data access
const accessLogs = await audit.query({ 
  action: /\.(read|export)$/,
  resourceType: 'SensitiveData'
});
```

### HIPAA - Audit Trail

```javascript
// Track all PHI access
const phiAccess = await audit.query({
  resourceType: 'PatientRecord'
});
```

## Examples

See [examples/audit/complete-example.js](../../examples/audit/complete-example.js) for:
- Basic audit logging
- Decorator usage
- Query and export
- HTTP middleware
- Database storage setup
- Compliance reports

## API Reference

### AuditLogger

```typescript
class AuditLogger {
  constructor(options: {
    storage: 'memory' | 'mongodb' | 'postgres';
    collection?: MongoCollection;
    pool?: Pool;
    tableName?: string;
    includeMetadata?: boolean;
    sensitiveFields?: string[];
    onLog?: (entry: AuditLogEntry) => void;
  });
  
  log(params: LogParams): Promise<string>;
  logCreate(params: LogParams): Promise<string>;
  logUpdate(params: LogParams): Promise<string>;
  logDelete(params: LogParams): Promise<string>;
  logRead(params: LogParams): Promise<string>;
  
  query(filter: object, options?: QueryOptions): Promise<AuditLogEntry[]>;
  count(filter: object): Promise<number>;
  export(filter: object, options?: QueryOptions): Promise<string>;
  
  getResourceHistory(resourceType: string, resourceId: string): Promise<AuditLogEntry[]>;
  getUserActivity(userId: string): Promise<AuditLogEntry[]>;
  getRecentActivity(limit?: number): Promise<AuditLogEntry[]>;
}
```

### Middleware

```typescript
function createAuditMiddleware(
  auditLogger: AuditLogger,
  options?: {
    skipPaths?: string[];
    logReads?: boolean;
  }
): Middleware;
```

---

**Production-ready audit logging for compliance and security!** 🔒
