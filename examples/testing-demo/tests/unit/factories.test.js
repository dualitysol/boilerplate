/**
 * Unit Tests - Factories
 * 
 * Tests for data factories
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { 
  userFactory, 
  productFactory,
  UserFactory 
} from '@dualitysol/boilerplate/testing';

test('UserFactory - build single user', () => {
  const user = userFactory.build();
  
  assert.ok(user.id);
  assert.ok(user.email);
  assert.ok(user.username);
  assert.ok(user.firstName);
  assert.ok(user.lastName);
  assert.strictEqual(typeof user.age, 'number');
  assert.ok(Array.isArray(user.roles));
  assert.strictEqual(user.isActive, true);
});

test('UserFactory - build with overrides', () => {
  const user = userFactory.build({
    email: 'custom@example.com',
    roles: ['admin']
  });
  
  assert.strictEqual(user.email, 'custom@example.com');
  assert.deepStrictEqual(user.roles, ['admin']);
});

test('UserFactory - build many users', () => {
  const users = userFactory.buildMany(5);
  
  assert.strictEqual(users.length, 5);
  
  // Check all users have unique IDs
  const ids = users.map(u => u.id);
  const uniqueIds = new Set(ids);
  assert.strictEqual(uniqueIds.size, 5);
});

test('UserFactory - build with trait', () => {
  const admin = userFactory.buildWithTrait('admin');
  
  assert.ok(admin.roles.includes('admin'));
});

test('ProductFactory - build single product', () => {
  const product = productFactory.build();
  
  assert.ok(product.id);
  assert.ok(product.name);
  assert.ok(product.description);
  assert.strictEqual(typeof product.price, 'number');
  assert.strictEqual(typeof product.stock, 'number');
  assert.ok(product.category);
  assert.strictEqual(product.isPublished, true);
});

test('ProductFactory - build with trait', () => {
  const outOfStock = productFactory.buildWithTrait('outOfStock');
  
  assert.strictEqual(outOfStock.stock, 0);
});

test('ProductFactory - build on sale product', () => {
  const onSale = productFactory.buildWithTrait('onSale');
  
  assert.ok(onSale.salePrice);
  assert.strictEqual(onSale.onSale, true);
  assert.ok(onSale.salePrice < onSale.price);
});

test('Custom Factory - create and use', () => {
  const factory = new UserFactory();
  
  factory.trait('premium', {
    isPremium: true,
    premiumSince: new Date()
  });
  
  const premium = factory.buildWithTrait('premium');
  
  assert.strictEqual(premium.isPremium, true);
  assert.ok(premium.premiumSince instanceof Date);
});

test('Factory sequences - generate unique values', () => {
  const factory = new UserFactory();
  
  const users = [
    factory.build(),
    factory.build(),
    factory.build()
  ];
  
  const ids = users.map(u => u.id);
  const uniqueIds = new Set(ids);
  
  assert.strictEqual(uniqueIds.size, 3);
});
