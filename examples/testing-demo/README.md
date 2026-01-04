# Testing Demo

Comprehensive testing examples for microservices using the Testing Utilities framework.

## Features

- **GraphQL Testing** - Test GraphQL queries, mutations, and subscriptions
- **Data Factories** - Generate realistic test data with factories
- **Mock Services** - Mock databases, HTTP clients, WebSockets, Redis
- **Fixtures** - Manage and load test fixtures
- **Assertions** - Rich assertion helpers for testing
- **Snapshot Testing** - Compare GraphQL responses against saved snapshots
- **Integration Tests** - Full-stack integration testing
- **Unit Tests** - Isolated unit testing with mocks and stubs

## Installation

```bash
npm install
```

## Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run GraphQL tests only
npm run test:graphql
```

## Project Structure

```
testing-demo/
├── index.js                      # Main application with GraphQL schema
├── tests/
│   ├── unit/
│   │   ├── factories.test.js     # Factory tests
│   │   └── mocks.test.js         # Mock utilities tests
│   ├── graphql/
│   │   ├── queries.test.js       # GraphQL query tests
│   │   └── mutations.test.js     # GraphQL mutation tests
│   └── integration/
│       └── full-stack.test.js    # Full integration tests
└── package.json
```

## Testing Utilities

### 1. GraphQL Tester

Test GraphQL queries, mutations, and subscriptions:

```javascript
import { GraphQLTester } from '@dualitysol/boilerplate/testing';

const tester = new GraphQLTester(schema);

// Query
const result = await tester.query(`
  query {
    users {
      id
      email
    }
  }
`);

// Mutation
const mutationResult = await tester.mutate(`
  mutation {
    createUser(input: { email: "test@example.com" }) {
      id
    }
  }
`);

// Assertions
const assertion = await tester.expectQuery('{ users { id } }');
assertion.toHaveNoErrors();
assertion.toHaveData('users');
```

### 2. Data Factories

Generate realistic test data:

```javascript
import { userFactory, productFactory } from '@dualitysol/boilerplate/testing';

// Single object
const user = userFactory.build();

// Multiple objects
const users = userFactory.buildMany(10);

// With overrides
const admin = userFactory.build({ roles: ['admin'] });

// With traits
const inactiveUser = userFactory.buildWithTrait('inactive');
```

Available factories:
- `userFactory` - User data
- `productFactory` - Product data
- `orderFactory` - Order data
- `postFactory` - Post data
- `commentFactory` - Comment data
- `categoryFactory` - Category data
- `notificationFactory` - Notification data
- `messageFactory` - Message data
- `fileFactory` - File data
- `sessionFactory` - Session data

### 3. Mock Database

In-memory database for testing:

```javascript
import { MockDatabase } from '@dualitysol/boilerplate/testing';

const db = new MockDatabase();
const users = db.collection('users');

// Insert
await users.insertOne({ name: 'John', age: 30 });
await users.insertMany([...]);

// Query
const allUsers = await users.find();
const john = await users.findOne({ name: 'John' });
const user = await users.findById('user_1');

// Update
await users.updateOne({ name: 'John' }, { age: 31 });
await users.updateMany({ age: 30 }, { status: 'active' });

// Delete
await users.deleteOne({ name: 'John' });
await users.deleteMany({ age: 30 });

// Query history
const history = db.getQueryHistory('users');
```

### 4. Mock HTTP Client

Mock external API calls:

```javascript
import { MockHTTPClient } from '@dualitysol/boilerplate/testing';

const client = new MockHTTPClient();

// Mock responses
client.mockGet('https://api.example.com/users', {
  data: [{ id: 1, name: 'John' }]
});

client.mockPost('https://api.example.com/users', {
  data: { id: 1, name: 'John' }
});

// Make requests
const response = await client.get('https://api.example.com/users');

// Request history
const history = client.getRequestHistory();
```

### 5. Stubs and Spies

Create function stubs and spies:

```javascript
import { createStub, createSpy } from '@dualitysol/boilerplate/testing';

// Stub
const stub = createStub('methodName');
stub.returns('result');
stub.resolves('async result');
stub.throws(new Error('error'));
stub.callsFake((a, b) => a + b);

const result = stub('arg1', 'arg2');
console.log(stub.callCount()); // 1
console.log(stub.calledWith('arg1', 'arg2')); // true

// Spy
const obj = { method: () => 'original' };
const spy = createSpy(obj, 'method');

obj.method(); // Still calls original
console.log(spy.callCount()); // 1

spy.restore(); // Restore original
```

### 6. Fixture Manager

Manage test fixtures:

```javascript
import { FixtureManager, userFactory } from '@dualitysol/boilerplate/testing';

const fixtures = new FixtureManager();

// Register fixtures
fixtures.register('users', () => userFactory.buildMany(5));
fixtures.register('products', productData);

// Load fixtures
const users = await fixtures.load('users');
const products = await fixtures.load('products');

// Load multiple
const data = await fixtures.loadMany(['users', 'products']);
```

### 7. Database Test Helper

Helper for database testing:

```javascript
import { DatabaseTestHelper } from '@dualitysol/boilerplate/testing';

const dbHelper = new DatabaseTestHelper(connection);

// Create test records (auto-tracked for cleanup)
const user = await dbHelper.create('users', { email: 'test@example.com' });

// Backup before modification
await dbHelper.backup('users', user.id);

// Modify...

// Restore
await dbHelper.restore('users', user.id);

// Seed database
await dbHelper.seed({
  users: userFactory.buildMany(10),
  products: productFactory.buildMany(20)
});

// Cleanup all test data
await dbHelper.cleanup();
```

### 8. Snapshot Testing

Compare responses against saved snapshots:

```javascript
const tester = new GraphQLTester(schema);

// First call saves snapshot
await tester.expectSnapshot('users-query', `
  query {
    users {
      id
      email
    }
  }
`);

// Future calls compare against snapshot
await tester.expectSnapshot('users-query', `
  query {
    users {
      id
      email
    }
  }
`);

// Get all snapshots
const snapshots = tester.getSnapshots();
```

### 9. Test Utilities

Utility functions for testing:

```javascript
import { waitFor, sleep, createTestContext } from '@dualitysol/boilerplate/testing';

// Wait for condition
await waitFor(async () => {
  const user = await db.findOne({ email: 'test@example.com' });
  return user !== null;
}, 5000); // timeout

// Sleep
await sleep(1000);

// Create test context
const context = createTestContext({
  userId: 'user_123',
  roles: ['admin']
});
```

## Example Tests

### Unit Test - Factories

```javascript
import { test } from 'node:test';
import assert from 'node:assert';
import { userFactory } from '@dualitysol/boilerplate/testing';

test('UserFactory - build user', () => {
  const user = userFactory.build();
  
  assert.ok(user.id);
  assert.ok(user.email);
  assert.ok(user.username);
});

test('UserFactory - build with overrides', () => {
  const admin = userFactory.build({ roles: ['admin'] });
  
  assert.ok(admin.roles.includes('admin'));
});
```

### GraphQL Test - Queries

```javascript
import { test } from 'node:test';
import assert from 'node:assert';
import { GraphQLTester, userFactory } from '@dualitysol/boilerplate/testing';

test('GraphQL - query users', async () => {
  const tester = new GraphQLTester(schema);
  
  const result = await tester.query(`
    query {
      users {
        id
        email
      }
    }
  `);
  
  assert.ok(!result.errors);
  assert.ok(Array.isArray(result.data.users));
});
```

### Integration Test - Full Workflow

```javascript
import { test } from 'node:test';
import assert from 'node:assert';
import { GraphQLTester, DatabaseTestHelper } from '@dualitysol/boilerplate/testing';

test('Integration - user CRUD', async () => {
  const dbHelper = new DatabaseTestHelper(db);
  const tester = new GraphQLTester(schema);
  
  // Create
  const createResult = await tester.mutate(`
    mutation {
      createUser(input: { email: "test@example.com" }) {
        id
      }
    }
  `);
  
  const userId = createResult.data.createUser.id;
  
  // Read
  const readResult = await tester.query(`
    query {
      user(id: "${userId}") {
        id
      }
    }
  `);
  
  assert.ok(readResult.data.user);
  
  // Cleanup
  await dbHelper.cleanup();
});
```

## Best Practices

### 1. Use Factories for Test Data

```javascript
// ✅ Good - Consistent, maintainable
const users = userFactory.buildMany(10);

// ❌ Bad - Brittle, hard to maintain
const users = [
  { id: '1', email: 'user1@example.com', ... },
  { id: '2', email: 'user2@example.com', ... }
];
```

### 2. Mock External Dependencies

```javascript
// ✅ Good - Isolated, fast
const httpClient = new MockHTTPClient();
httpClient.mockGet('https://api.example.com/users', { data: [] });

// ❌ Bad - Slow, unreliable
const response = await fetch('https://api.example.com/users');
```

### 3. Use Database Test Helper

```javascript
// ✅ Good - Auto cleanup
const dbHelper = new DatabaseTestHelper(db);
await dbHelper.create('users', userData);
// ... tests ...
await dbHelper.cleanup();

// ❌ Bad - Manual cleanup, error-prone
await db.users.create(userData);
// ... tests ...
await db.users.delete(userData.id); // May be skipped on error
```

### 4. Snapshot Testing for Stability

```javascript
// ✅ Good - Detect unexpected changes
await tester.expectSnapshot('users-query', query);

// ❌ Bad - Manual comparison
const result = await tester.query(query);
assert.deepStrictEqual(result, expectedResult);
```

### 5. Use Assertions for Better Errors

```javascript
// ✅ Good - Clear error messages
const assertion = await tester.expectQuery(query);
assertion.toHaveNoErrors();
assertion.toHaveData('users');

// ❌ Bad - Generic errors
const result = await tester.query(query);
assert.ok(!result.errors);
assert.ok(result.data.users);
```

## Running the Demo

```bash
# Run the main demo
node index.js

# Run all tests
npm test
```

## Output Example

```
🧪 Testing Demo

📝 Seeding test data...
   ✓ Created 5 users

🔍 Running GraphQL queries...

Query: users
Result: {
  "users": [
    {
      "id": "user_1",
      "email": "john@example.com",
      "username": "john123"
    },
    ...
  ]
}

✏️  Running GraphQL mutations...

Mutation: createUser
Result: {
  "createUser": {
    "id": "user_6",
    "email": "newuser@example.com"
  }
}

✅ Running assertions...
   ✓ Query has no errors
   ✓ Found 6 users

📸 Snapshot testing...
   ✓ Snapshot saved: users-query

💾 Database operations...
   ✓ Total users in database: 6
   ✓ Active users: 6

✨ Demo complete!
```

## Learn More

- [Testing Utilities Documentation](../../docs/testing.md)
- [GraphQL Testing Guide](../../docs/graphql-testing.md)
- [Factory Patterns](../../docs/factories.md)
- [Mock Objects](../../docs/mocks.md)
