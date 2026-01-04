/**
 * GraphQL Tests - Queries
 * 
 * Tests for GraphQL queries
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { GraphQLTester, userFactory, MockDatabase } from '@dualitysol/boilerplate/testing';
import { createSchema, createDatabase } from '../../index.js';

test('GraphQL - query all users', async () => {
  const database = createDatabase();
  const { users } = database;
  
  // Seed data
  const testUsers = userFactory.buildMany(3);
  await users.insertMany(testUsers);
  
  const schema = createSchema(database);
  const tester = new GraphQLTester(schema);
  
  const result = await tester.query(`
    query {
      users {
        id
        email
        username
      }
    }
  `);
  
  assert.ok(!result.errors);
  assert.strictEqual(result.data.users.length, 3);
});

test('GraphQL - query single user by ID', async () => {
  const database = createDatabase();
  const { users } = database;
  
  const testUser = userFactory.build({ username: 'testuser' });
  await users.insertOne(testUser);
  
  const schema = createSchema(database);
  const tester = new GraphQLTester(schema);
  
  const result = await tester.query(`
    query GetUser($id: ID!) {
      user(id: $id) {
        id
        username
      }
    }
  `, {
    variables: { id: testUser.id }
  });
  
  assert.ok(!result.errors);
  assert.strictEqual(result.data.user.username, 'testuser');
});

test('GraphQL - query non-existent user returns null', async () => {
  const database = createDatabase();
  const schema = createSchema(database);
  const tester = new GraphQLTester(schema);
  
  const result = await tester.query(`
    query {
      user(id: "non-existent") {
        id
      }
    }
  `);
  
  assert.ok(!result.errors);
  assert.strictEqual(result.data.user, null);
});

test('GraphQL - expectQuery assertion', async () => {
  const database = createDatabase();
  const { users } = database;
  
  await users.insertMany(userFactory.buildMany(2));
  
  const schema = createSchema(database);
  const tester = new GraphQLTester(schema);
  
  const assertion = await tester.expectQuery(`
    query {
      users {
        id
        email
      }
    }
  `);
  
  assertion.toHaveNoErrors();
  
  const usersData = assertion.getDataPath('users');
  assert.strictEqual(usersData.length, 2);
});

test('GraphQL - toMatchData assertion', async () => {
  const database = createDatabase();
  const { users } = database;
  
  await users.insertMany(userFactory.buildMany(5));
  
  const schema = createSchema(database);
  const tester = new GraphQLTester(schema);
  
  const assertion = await tester.expectQuery(`
    query {
      users {
        id
      }
    }
  `);
  
  assertion.toMatchData('users', (users) => users.length === 5);
});

test('GraphQL - snapshot testing', async () => {
  const database = createDatabase();
  const { users } = database;
  
  await users.insertOne(userFactory.build({ 
    email: 'test@example.com',
    username: 'testuser'
  }));
  
  const schema = createSchema(database);
  const tester = new GraphQLTester(schema);
  
  // First call creates snapshot
  await tester.expectSnapshot('users-snapshot', `
    query {
      users {
        email
        username
      }
    }
  `);
  
  // Second call compares against snapshot
  await tester.expectSnapshot('users-snapshot', `
    query {
      users {
        email
        username
      }
    }
  `);
  
  const snapshots = tester.getSnapshots();
  assert.ok(snapshots['users-snapshot']);
});

test('GraphQL - query with context', async () => {
  const database = createDatabase();
  const { users } = database;
  
  await users.insertMany(userFactory.buildMany(3));
  
  const schema = createSchema(database);
  const tester = new GraphQLTester(schema, {
    context: { users }
  });
  
  const result = await tester.query(`
    query {
      users {
        id
      }
    }
  `);
  
  assert.ok(!result.errors);
  assert.ok(result.data.users.length > 0);
});

test('GraphQL - query products', async () => {
  const database = createDatabase();
  const { products } = database;
  
  await products.insertMany([
    { name: 'Product 1', price: 10.99, stock: 100, category: 'Electronics', isPublished: true },
    { name: 'Product 2', price: 20.99, stock: 50, category: 'Books', isPublished: true }
  ]);
  
  const schema = createSchema(database);
  const tester = new GraphQLTester(schema);
  
  const result = await tester.query(`
    query {
      products {
        id
        name
        price
        category
      }
    }
  `);
  
  assert.ok(!result.errors);
  assert.strictEqual(result.data.products.length, 2);
  assert.strictEqual(result.data.products[0].name, 'Product 1');
});

test('GraphQL - query error handling', async () => {
  const database = createDatabase();
  const schema = createSchema(database);
  const tester = new GraphQLTester(schema);
  
  // Invalid query
  const result = await tester.query(`
    query {
      invalidField {
        id
      }
    }
  `);
  
  assert.ok(result.errors);
  assert.ok(result.errors.length > 0);
});
