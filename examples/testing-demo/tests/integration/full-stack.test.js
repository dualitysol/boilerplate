/**
 * Integration Tests - Full Stack
 * 
 * Tests for full application integration
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { 
  GraphQLTester, 
  DatabaseTestHelper,
  FixtureManager,
  userFactory,
  productFactory,
  waitFor
} from '@dualitysol/boilerplate/testing';
import { createSchema, createDatabase } from '../../index.js';

test('Integration - user CRUD workflow', async () => {
  const database = createDatabase();
  const { users } = database;
  const schema = createSchema(database);
  const tester = new GraphQLTester(schema);
  
  // 1. Create user
  const createResult = await tester.mutate(`
    mutation {
      createUser(input: {
        email: "workflow@example.com"
        username: "workflowuser"
        firstName: "Work"
        lastName: "Flow"
        password: "password123"
      }) {
        id
        email
      }
    }
  `);
  
  assert.ok(!createResult.errors);
  const userId = createResult.data.createUser.id;
  
  // 2. Read user
  const readResult = await tester.query(`
    query GetUser($id: ID!) {
      user(id: $id) {
        id
        email
        username
      }
    }
  `, {
    variables: { id: userId }
  });
  
  assert.ok(!readResult.errors);
  assert.strictEqual(readResult.data.user.email, 'workflow@example.com');
  
  // 3. Update user
  const updateResult = await tester.mutate(`
    mutation UpdateUser($id: ID!) {
      updateUser(id: $id, input: { firstName: "Updated" }) {
        id
        firstName
      }
    }
  `, {
    variables: { id: userId }
  });
  
  assert.ok(!updateResult.errors);
  assert.strictEqual(updateResult.data.updateUser.firstName, 'Updated');
  
  // 4. Delete user
  const deleteResult = await tester.mutate(`
    mutation DeleteUser($id: ID!) {
      deleteUser(id: $id)
    }
  `, {
    variables: { id: userId }
  });
  
  assert.ok(!deleteResult.errors);
  assert.strictEqual(deleteResult.data.deleteUser, true);
  
  // 5. Verify deletion
  const verifyResult = await tester.query(`
    query GetUser($id: ID!) {
      user(id: $id) {
        id
      }
    }
  `, {
    variables: { id: userId }
  });
  
  assert.strictEqual(verifyResult.data.user, null);
});

test('Integration - database test helper', async () => {
  const database = createDatabase();
  const { users } = database;
  const schema = createSchema(database);
  
  const dbHelper = new DatabaseTestHelper({
    users
  });
  
  // Create test data
  const user = await dbHelper.create('users', {
    email: 'helper@example.com',
    username: 'helper'
  });
  
  assert.ok(user.id);
  
  // Backup before modification
  await dbHelper.backup('users', user.id);
  
  // Modify
  await users.updateOne({ id: user.id }, { email: 'modified@example.com' });
  
  // Restore
  await dbHelper.restore('users', user.id);
  
  // Verify restoration
  const restored = await users.findById(user.id);
  assert.strictEqual(restored.email, 'helper@example.com');
  
  // Cleanup
  await dbHelper.cleanup();
  
  const found = await users.findById(user.id);
  assert.strictEqual(found, null);
});

test('Integration - fixture manager', async () => {
  const database = createDatabase();
  const { users, products } = database;
  
  const fixtures = new FixtureManager();
  
  // Register fixtures
  fixtures.register('users', () => userFactory.buildMany(5));
  fixtures.register('products', () => productFactory.buildMany(10));
  
  // Load fixtures
  const userData = await fixtures.load('users');
  const productData = await fixtures.load('products');
  
  assert.strictEqual(userData.length, 5);
  assert.strictEqual(productData.length, 10);
  
  // Insert into database
  await users.insertMany(userData);
  await products.insertMany(productData);
  
  // Verify
  const allUsers = await users.find();
  assert.strictEqual(allUsers.length, 5);
});

test('Integration - seeding with fixtures', async () => {
  const database = createDatabase();
  const { users, products } = database;
  
  const dbHelper = new DatabaseTestHelper({
    users,
    products
  });
  
  // Seed database
  const seeded = await dbHelper.seed({
    users: userFactory.buildMany(3),
    products: productFactory.buildMany(5)
  });
  
  assert.strictEqual(seeded.users.length, 3);
  assert.strictEqual(seeded.products.length, 5);
  
  // Query to verify
  const allUsers = await users.find();
  const allProducts = await products.find();
  
  assert.strictEqual(allUsers.length, 3);
  assert.strictEqual(allProducts.length, 5);
  
  // Cleanup
  await dbHelper.cleanup();
  
  const afterCleanup = await users.find();
  assert.strictEqual(afterCleanup.length, 0);
});

test('Integration - complex query with relationships', async () => {
  const database = createDatabase();
  const { users, posts } = database;
  const schema = createSchema(database);
  const tester = new GraphQLTester(schema, { context: { users } });
  
  // Create user
  const user = await users.insertOne(userFactory.build());
  
  // Create posts
  await posts.insertMany([
    {
      title: 'Post 1',
      content: 'Content 1',
      authorId: user.id,
      status: 'published',
      viewCount: 100
    },
    {
      title: 'Post 2',
      content: 'Content 2',
      authorId: user.id,
      status: 'published',
      viewCount: 200
    }
  ]);
  
  // Query posts with author
  const result = await tester.query(`
    query {
      posts {
        id
        title
        author {
          id
          username
        }
      }
    }
  `);
  
  assert.ok(!result.errors);
  assert.strictEqual(result.data.posts.length, 2);
  assert.strictEqual(result.data.posts[0].author.id, user.id);
});

test('Integration - transaction rollback', async () => {
  const database = createDatabase();
  const { users } = database;
  
  const transaction = await database.db.startTransaction();
  
  // Add operations to transaction
  transaction.addOperation(async () => {
    await users.insertOne({ email: 'tx1@example.com' });
  });
  
  transaction.addOperation(async () => {
    await users.insertOne({ email: 'tx2@example.com' });
  });
  
  // Abort transaction
  await transaction.abort();
  
  // Verify no data was inserted
  const allUsers = await users.find();
  assert.strictEqual(allUsers.length, 0);
});

test('Integration - wait for condition', async () => {
  const database = createDatabase();
  const { users } = database;
  
  // Insert user after delay
  setTimeout(async () => {
    await users.insertOne({ email: 'delayed@example.com' });
  }, 100);
  
  // Wait for user to appear
  await waitFor(async () => {
    const found = await users.findOne({ email: 'delayed@example.com' });
    return found !== null;
  }, 2000);
  
  const user = await users.findOne({ email: 'delayed@example.com' });
  assert.ok(user);
});

test('Integration - snapshot consistency', async () => {
  const database = createDatabase();
  const { users } = database;
  const schema = createSchema(database);
  const tester = new GraphQLTester(schema);
  
  // Seed consistent data
  await users.insertMany([
    { email: 'user1@example.com', username: 'user1', firstName: 'User', lastName: 'One' },
    { email: 'user2@example.com', username: 'user2', firstName: 'User', lastName: 'Two' }
  ]);
  
  // Create snapshot
  await tester.expectSnapshot('users-list', `
    query {
      users {
        email
        username
      }
    }
  `);
  
  // Query again should match
  await tester.expectSnapshot('users-list', `
    query {
      users {
        email
        username
      }
    }
  `);
  
  const snapshots = tester.getSnapshots();
  assert.ok(snapshots['users-list']);
  assert.strictEqual(snapshots['users-list'].data.users.length, 2);
});
