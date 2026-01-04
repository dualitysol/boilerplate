# Audit Demo

Complete demonstration of audit logging for compliance and security.

## Structure

```
Audit/
├── typeDefs/
│   └── schema.graphql    # GraphQL schema
├── resolvers/
│   ├── queries.js        # Query resolvers
│   └── mutations.js      # Mutation resolvers
├── model/
│   └── index.js          # Audit actions & utilities
└── index.js              # Service entry point
```

## Running

```bash
npm install
npm start
```

Open http://localhost:4003/graphql

## Features

- **Automatic tracking**: Who did what, when, and what changed
- **Before/after diffs**: Track changes to resources
- **Compliance**: GDPR, SOC2, HIPAA exports
- **Query**: By user, action, resource type
- **History**: Full audit trail per resource

## Example Queries

### Get Recent Activity

```graphql
query {
  recentActivity(limit: 10) {
    success
    logs {
      id
      action
      userId
      userName
      resourceType
      resourceId
      changes
      timestamp
    }
    total
  }
}
```

### Get User Activity

```graphql
query {
  userActivity(userId: "user0", limit: 10) {
    success
    logs {
      action
      resourceType
      resourceId
      changes
      timestamp
    }
  }
}
```

### Get Resource History

```graphql
query {
  resourceHistory(resourceType: "Product", resourceId: "prod_123") {
    success
    logs {
      action
      userId
      userName
      changes
      timestamp
    }
  }
}
```

### Query with Filters

```graphql
query {
  auditLogs(input: {
    action: "product.update"
    limit: 20
    offset: 0
  }) {
    success
    logs {
      id
      action
      userId
      resourceId
      changes
      timestamp
    }
    total
  }
}
```

### Export for Compliance

```graphql
query {
  exportAuditLogs(input: {
    userId: "user0"
  }) {
    success
    message
    data
  }
}
```

### Manual Audit Log

```graphql
mutation {
  createAuditLog(
    action: "product.update"
    resourceType: "Product"
    resourceId: "prod_123"
    changes: "{\"price\":{\"old\":99.99,\"new\":89.99}}"
  ) {
    success
    message
    log {
      id
      action
      changes
      timestamp
    }
  }
}
```

## Features Demonstrated

✅ Automatic CRUD tracking  
✅ Who/what/when logging  
✅ Before/after diffs  
✅ Sensitive data redaction  
✅ Query by user/action/resource  
✅ Resource history  
✅ User activity timeline  
✅ Compliance exports (GDPR, SOC2, HIPAA)  
✅ Pagination support  
