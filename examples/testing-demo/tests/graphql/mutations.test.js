/**
 * GraphQL Tests - Mutations
 * 
 * Tests for GraphQL mutations
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { GraphQLTester, MockDatabase } from '@dualitysol/boilerplate/testing';
import { createSchema, createDatabase } from '../../index.js';

test('GraphQL - create user mutation', async () => {
  const database = createDatabase();
  const schema = createSchema(database);
  const tester = new GraphQLTester(schema);
  
  const result = await tester.mutate(`
    mutation CreateUser($input: CreateUserInput!) {
      createUser(input: $input) {
        id
        email
        username
        firstName
        lastName
      }
    }
  `, {
    variables: {
      input: {
        email: 'newuser@example.com',
        username: 'newuser',
        firstName: 'New',
        lastName: 'User',
        password: 'password123'
      }
    }
  });
  
  assert.ok(!result.errors);
  assert.strictEqual(result.data.createUser.email, 'newuser@example.com');
  assert.strictEqual(result.data.createUser.username, 'newuser');
  assert.ok(result.data.createUser.id);
});

test('GraphQL - update user mutation', async () => {
  const database = createDatabase();
  const { users } = database;
  
  // Create initial user
  const user = await users.insertOne({
    email: 'original@example.com',
    username: 'original',
    firstName: 'Original',
    lastName: 'User'
  });
  
  const schema = createSchema(database);
  const tester = new GraphQLTester(schema);
  
  const result = await tester.mutate(`
    mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
      updateUser(id: $id, input: $input) {
        id
        email
        firstName
      }
    }
  `, {
    variables: {
      id: user.id,
      input: {
        email: 'updated@example.com',
        firstName: 'Updated'
      }
    }
  });
  
  assert.ok(!result.errors);
  assert.strictEqual(result.data.updateUser.email, 'updated@example.com');
  assert.strictEqual(result.data.updateUser.firstName, 'Updated');
});

test('GraphQL - delete user mutation', async () => {
  const database = createDatabase();
  const { users } = database;
  
  const user = await users.insertOne({
    email: 'delete@example.com',
    username: 'deleteuser'
  });
  
  const schema = createSchema(database);
  const tester = new GraphQLTester(schema);
  
  const result = await tester.mutate(`
    mutation DeleteUser($id: ID!) {
      deleteUser(id: $id)
    }
  `, {
    variables: { id: user.id }
  });
  
  assert.ok(!result.errors);
  assert.strictEqual(result.data.deleteUser, true);
  
  // Verify user was deleted
  const found = await users.findById(user.id);
  assert.strictEqual(found, null);
});

test('GraphQL - create product mutation', async () => {
  const database = createDatabase();
  const schema = createSchema(database);
  const tester = new GraphQLTester(schema);
  
  const result = await tester.mutate(`
    mutation CreateProduct($input: CreateProductInput!) {
      createProduct(input: $input) {
        id
        name
        price
        stock
      }
    }
  `, {
    variables: {
      input: {
        name: 'New Product',
        description: 'Product description',
        price: 29.99,
        stock: 100,
        category: 'Electronics'
      }
    }
  });
  
  assert.ok(!result.errors);
  assert.strictEqual(result.data.createProduct.name, 'New Product');
  assert.strictEqual(result.data.createProduct.price, 29.99);
  assert.strictEqual(result.data.createProduct.stock, 100);
});

test('GraphQL - update product mutation', async () => {
  const database = createDatabase();
  const { products } = database;
  
  const product = await products.insertOne({
    name: 'Original Product',
    price: 19.99,
    stock: 50,
    category: 'Books'
  });
  
  const schema = createSchema(database);
  const tester = new GraphQLTester(schema);
  
  const result = await tester.mutate(`
    mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {
      updateProduct(id: $id, input: $input) {
        id
        name
        price
      }
    }
  `, {
    variables: {
      id: product.id,
      input: {
        name: 'Updated Product',
        price: 24.99
      }
    }
  });
  
  assert.ok(!result.errors);
  assert.strictEqual(result.data.updateProduct.name, 'Updated Product');
  assert.strictEqual(result.data.updateProduct.price, 24.99);
});

test('GraphQL - mutation with expectMutation', async () => {
  const database = createDatabase();
  const schema = createSchema(database);
  const tester = new GraphQLTester(schema);
  
  const assertion = await tester.expectMutation(`
    mutation {
      createUser(input: {
        email: "test@example.com"
        username: "testuser"
        firstName: "Test"
        lastName: "User"
        password: "password"
      }) {
        id
        email
      }
    }
  `);
  
  assertion.toHaveNoErrors();
  assertion.toHaveData('createUser.email', 'test@example.com');
});

test('GraphQL - mutation error handling', async () => {
  const database = createDatabase();
  const schema = createSchema(database);
  const tester = new GraphQLTester(schema);
  
  // Try to update non-existent user
  const result = await tester.mutate(`
    mutation {
      updateUser(id: "non-existent", input: { email: "test@example.com" }) {
        id
      }
    }
  `);
  
  // Should return null for non-existent user (not an error in this implementation)
  assert.ok(!result.errors);
});

test('GraphQL - chained mutations', async () => {
  const database = createDatabase();
  const schema = createSchema(database);
  const tester = new GraphQLTester(schema);
  
  // Create user
  const createResult = await tester.mutate(`
    mutation {
      createUser(input: {
        email: "chain@example.com"
        username: "chainuser"
        firstName: "Chain"
        lastName: "User"
        password: "password"
      }) {
        id
        email
      }
    }
  `);
  
  assert.ok(!createResult.errors);
  const userId = createResult.data.createUser.id;
  
  // Update user
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
  
  // Delete user
  const deleteResult = await tester.mutate(`
    mutation DeleteUser($id: ID!) {
      deleteUser(id: $id)
    }
  `, {
    variables: { id: userId }
  });
  
  assert.ok(!deleteResult.errors);
  assert.strictEqual(deleteResult.data.deleteUser, true);
});
