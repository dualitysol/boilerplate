/**
 * Unit Tests - Mocks
 * 
 * Tests for mock utilities
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { 
  MockDatabase,
  MockHTTPClient,
  createStub,
  createSpy,
  MockWebSocket,
  MockRedisClient
} from '@dualitysol/boilerplate/testing';

test('MockDatabase - create and use collection', async () => {
  const db = new MockDatabase();
  const users = db.collection('users');
  
  await users.insertOne({ name: 'John', age: 30 });
  
  const allUsers = await users.find();
  assert.strictEqual(allUsers.length, 1);
  assert.strictEqual(allUsers[0].name, 'John');
});

test('MockDatabase - insert many', async () => {
  const db = new MockDatabase();
  const users = db.collection('users');
  
  await users.insertMany([
    { name: 'John', age: 30 },
    { name: 'Jane', age: 25 }
  ]);
  
  const allUsers = await users.find();
  assert.strictEqual(allUsers.length, 2);
});

test('MockDatabase - find with query', async () => {
  const db = new MockDatabase();
  const users = db.collection('users');
  
  await users.insertMany([
    { name: 'John', age: 30 },
    { name: 'Jane', age: 25 },
    { name: 'Bob', age: 30 }
  ]);
  
  const age30 = await users.find({ age: 30 });
  assert.strictEqual(age30.length, 2);
});

test('MockDatabase - update document', async () => {
  const db = new MockDatabase();
  const users = db.collection('users');
  
  const inserted = await users.insertOne({ name: 'John', age: 30 });
  
  await users.updateOne({ id: inserted.id }, { age: 31 });
  
  const updated = await users.findById(inserted.id);
  assert.strictEqual(updated.age, 31);
});

test('MockDatabase - delete document', async () => {
  const db = new MockDatabase();
  const users = db.collection('users');
  
  const inserted = await users.insertOne({ name: 'John', age: 30 });
  
  await users.deleteOne({ id: inserted.id });
  
  const found = await users.findById(inserted.id);
  assert.strictEqual(found, null);
});

test('MockDatabase - query history', async () => {
  const db = new MockDatabase();
  const users = db.collection('users');
  
  await users.insertOne({ name: 'John' });
  await users.find();
  await users.updateOne({ name: 'John' }, { age: 30 });
  
  const history = db.getQueryHistory('users');
  assert.strictEqual(history.length, 3);
  assert.strictEqual(history[0].operation, 'insertOne');
  assert.strictEqual(history[1].operation, 'find');
  assert.strictEqual(history[2].operation, 'updateOne');
});

test('MockHTTPClient - mock GET request', async () => {
  const client = new MockHTTPClient();
  
  client.mockGet('https://api.example.com/users', {
    data: [{ id: 1, name: 'John' }]
  });
  
  const response = await client.get('https://api.example.com/users');
  
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.data.length, 1);
  assert.strictEqual(response.data[0].name, 'John');
});

test('MockHTTPClient - mock POST request', async () => {
  const client = new MockHTTPClient();
  
  client.mockPost('https://api.example.com/users', {
    data: { id: 1, name: 'John' }
  });
  
  const response = await client.post('https://api.example.com/users', {
    name: 'John'
  });
  
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.data.name, 'John');
});

test('MockHTTPClient - request history', async () => {
  const client = new MockHTTPClient();
  
  client.mockGet('https://api.example.com/users', { data: [] });
  
  await client.get('https://api.example.com/users');
  await client.get('https://api.example.com/users');
  
  const history = client.getRequestHistory('https://api.example.com/users');
  assert.strictEqual(history.length, 2);
});

test('createStub - basic stub', () => {
  const stub = createStub('testMethod');
  
  stub.returns('test result');
  
  const result = stub('arg1', 'arg2');
  
  assert.strictEqual(result, 'test result');
  assert.strictEqual(stub.callCount(), 1);
  assert.ok(stub.calledWith('arg1', 'arg2'));
});

test('createStub - async stub', async () => {
  const stub = createStub('asyncMethod');
  
  stub.resolves('async result');
  
  const result = await stub();
  
  assert.strictEqual(result, 'async result');
});

test('createStub - throws error', () => {
  const stub = createStub('errorMethod');
  
  stub.throws(new Error('Test error'));
  
  assert.throws(() => stub(), /Test error/);
});

test('createStub - custom implementation', () => {
  const stub = createStub('customMethod');
  
  stub.callsFake((a, b) => a + b);
  
  const result = stub(2, 3);
  
  assert.strictEqual(result, 5);
});

test('createSpy - spy on method', () => {
  const obj = {
    method: (a, b) => a + b
  };
  
  const spy = createSpy(obj, 'method');
  
  const result = obj.method(2, 3);
  
  assert.strictEqual(result, 5);
  assert.strictEqual(spy.callCount(), 1);
  assert.ok(spy.calledWith(2, 3));
});

test('createSpy - restore original', () => {
  const originalMethod = (a, b) => a + b;
  const obj = { method: originalMethod };
  
  const spy = createSpy(obj, 'method');
  
  assert.notStrictEqual(obj.method, originalMethod);
  
  spy.restore();
  
  assert.strictEqual(obj.method, originalMethod);
});

test('MockWebSocket - send and receive', (t, done) => {
  const ws = new MockWebSocket('ws://localhost:8080');
  
  ws.on('open', () => {
    ws.send('Hello');
    
    const sent = ws.getSentMessages();
    assert.strictEqual(sent.length, 1);
    assert.strictEqual(sent[0].data, 'Hello');
    
    done();
  });
});

test('MockWebSocket - receive message', (t, done) => {
  const ws = new MockWebSocket('ws://localhost:8080');
  
  ws.on('open', () => {
    ws.on('message', (event) => {
      assert.strictEqual(event.data, 'Hello from server');
      done();
    });
    
    ws.receive('Hello from server');
  });
});

test('MockRedisClient - set and get', async () => {
  const redis = new MockRedisClient();
  
  await redis.set('key', 'value');
  const value = await redis.get('key');
  
  assert.strictEqual(value, 'value');
});

test('MockRedisClient - expiration', async () => {
  const redis = new MockRedisClient();
  
  await redis.set('key', 'value', { EX: 1 });
  
  // Wait for expiration
  await new Promise(resolve => setTimeout(resolve, 1100));
  
  const value = await redis.get('key');
  assert.strictEqual(value, null);
});

test('MockRedisClient - pub/sub', async () => {
  const redis = new MockRedisClient();
  
  const messages = [];
  
  redis.subscribe('channel', (message) => {
    messages.push(message);
  });
  
  await redis.publish('channel', 'message1');
  await redis.publish('channel', 'message2');
  
  assert.strictEqual(messages.length, 2);
  assert.strictEqual(messages[0], 'message1');
  assert.strictEqual(messages[1], 'message2');
});
