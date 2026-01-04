/**
 * Mock and Stub Utilities
 * 
 * Utilities for mocking services, databases, and external APIs
 * 
 * @example
 * import { MockDatabase, MockHTTPClient, createStub } from '@dualitysol/boilerplate/testing';
 * 
 * const db = new MockDatabase();
 * const httpClient = new MockHTTPClient();
 * const stub = createStub('methodName');
 */

import { EventEmitter } from 'events';

/**
 * Mock Database
 */
export class MockDatabase extends EventEmitter {
  constructor() {
    super();
    this.collections = new Map();
    this.transactions = [];
    this.queryHistory = [];
  }

  /**
   * Create collection
   */
  collection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new MockCollection(name, this));
    }
    return this.collections.get(name);
  }

  /**
   * Get all collections
   */
  getCollections() {
    return Array.from(this.collections.keys());
  }

  /**
   * Clear all collections
   */
  clear() {
    this.collections.clear();
    this.queryHistory = [];
  }

  /**
   * Start transaction
   */
  async startTransaction() {
    const transaction = new MockTransaction(this);
    this.transactions.push(transaction);
    return transaction;
  }

  /**
   * Get query history
   */
  getQueryHistory(collectionName) {
    if (collectionName) {
      return this.queryHistory.filter(q => q.collection === collectionName);
    }
    return this.queryHistory;
  }

  /**
   * Log query
   */
  logQuery(collection, operation, query) {
    this.queryHistory.push({
      collection,
      operation,
      query,
      timestamp: Date.now()
    });
    this.emit('query', { collection, operation, query });
  }
}

/**
 * Mock Collection
 */
export class MockCollection {
  constructor(name, database) {
    this.name = name;
    this.database = database;
    this.documents = new Map();
    this.nextId = 1;
  }

  /**
   * Insert document
   */
  async insertOne(document) {
    const id = document.id || `${this.name}_${this.nextId++}`;
    const doc = { ...document, id };
    
    this.documents.set(id, doc);
    this.database.logQuery(this.name, 'insertOne', { document: doc });
    
    return { insertedId: id, ...doc };
  }

  /**
   * Insert many documents
   */
  async insertMany(documents) {
    const inserted = [];
    
    for (const doc of documents) {
      const result = await this.insertOne(doc);
      inserted.push(result);
    }
    
    this.database.logQuery(this.name, 'insertMany', { count: documents.length });
    
    return { insertedIds: inserted.map(d => d.id), insertedCount: inserted.length };
  }

  /**
   * Find documents
   */
  async find(query = {}) {
    const results = Array.from(this.documents.values()).filter(doc => 
      this.matchQuery(doc, query)
    );
    
    this.database.logQuery(this.name, 'find', { query, count: results.length });
    
    return results;
  }

  /**
   * Find one document
   */
  async findOne(query) {
    const results = await this.find(query);
    this.database.logQuery(this.name, 'findOne', { query });
    return results[0] || null;
  }

  /**
   * Find by ID
   */
  async findById(id) {
    const doc = this.documents.get(id);
    this.database.logQuery(this.name, 'findById', { id });
    return doc || null;
  }

  /**
   * Update document
   */
  async updateOne(query, update) {
    const doc = await this.findOne(query);
    
    if (!doc) {
      return { matchedCount: 0, modifiedCount: 0 };
    }
    
    const updated = { ...doc, ...update, updatedAt: new Date() };
    this.documents.set(doc.id, updated);
    
    this.database.logQuery(this.name, 'updateOne', { query, update });
    
    return { matchedCount: 1, modifiedCount: 1, ...updated };
  }

  /**
   * Update many documents
   */
  async updateMany(query, update) {
    const docs = await this.find(query);
    
    for (const doc of docs) {
      const updated = { ...doc, ...update, updatedAt: new Date() };
      this.documents.set(doc.id, updated);
    }
    
    this.database.logQuery(this.name, 'updateMany', { query, update, count: docs.length });
    
    return { matchedCount: docs.length, modifiedCount: docs.length };
  }

  /**
   * Delete document
   */
  async deleteOne(query) {
    const doc = await this.findOne(query);
    
    if (!doc) {
      return { deletedCount: 0 };
    }
    
    this.documents.delete(doc.id);
    this.database.logQuery(this.name, 'deleteOne', { query });
    
    return { deletedCount: 1 };
  }

  /**
   * Delete many documents
   */
  async deleteMany(query) {
    const docs = await this.find(query);
    
    for (const doc of docs) {
      this.documents.delete(doc.id);
    }
    
    this.database.logQuery(this.name, 'deleteMany', { query, count: docs.length });
    
    return { deletedCount: docs.length };
  }

  /**
   * Count documents
   */
  async count(query = {}) {
    const results = await this.find(query);
    this.database.logQuery(this.name, 'count', { query });
    return results.length;
  }

  /**
   * Clear collection
   */
  async clear() {
    const count = this.documents.size;
    this.documents.clear();
    this.nextId = 1;
    return { deletedCount: count };
  }

  /**
   * Match document against query
   */
  matchQuery(doc, query) {
    for (const [key, value] of Object.entries(query)) {
      if (doc[key] !== value) {
        return false;
      }
    }
    return true;
  }
}

/**
 * Mock Transaction
 */
export class MockTransaction {
  constructor(database) {
    this.database = database;
    this.operations = [];
    this.committed = false;
    this.aborted = false;
  }

  /**
   * Add operation
   */
  addOperation(operation) {
    if (this.committed || this.aborted) {
      throw new Error('Transaction already completed');
    }
    this.operations.push(operation);
  }

  /**
   * Commit transaction
   */
  async commit() {
    if (this.committed || this.aborted) {
      throw new Error('Transaction already completed');
    }
    
    for (const operation of this.operations) {
      await operation();
    }
    
    this.committed = true;
  }

  /**
   * Abort transaction
   */
  async abort() {
    if (this.committed || this.aborted) {
      throw new Error('Transaction already completed');
    }
    
    this.aborted = true;
    this.operations = [];
  }
}

/**
 * Mock HTTP Client
 */
export class MockHTTPClient {
  constructor() {
    this.responses = new Map();
    this.requestHistory = [];
    this.interceptors = [];
  }

  /**
   * Mock response for URL
   */
  mockResponse(url, response, options = {}) {
    this.responses.set(url, {
      response,
      options
    });
    return this;
  }

  /**
   * Mock GET request
   */
  mockGet(url, response) {
    return this.mockResponse(url, response, { method: 'GET' });
  }

  /**
   * Mock POST request
   */
  mockPost(url, response) {
    return this.mockResponse(url, response, { method: 'POST' });
  }

  /**
   * Mock PUT request
   */
  mockPut(url, response) {
    return this.mockResponse(url, response, { method: 'PUT' });
  }

  /**
   * Mock DELETE request
   */
  mockDelete(url, response) {
    return this.mockResponse(url, response, { method: 'DELETE' });
  }

  /**
   * Make request
   */
  async request(url, options = {}) {
    // Log request
    this.requestHistory.push({
      url,
      options,
      timestamp: Date.now()
    });

    // Apply interceptors
    for (const interceptor of this.interceptors) {
      const result = await interceptor(url, options);
      if (result) {
        return result;
      }
    }

    // Find mocked response
    const mock = this.responses.get(url);
    
    if (!mock) {
      throw new Error(`No mock response for ${url}`);
    }

    // Check method
    if (mock.options.method && mock.options.method !== (options.method || 'GET')) {
      throw new Error(`Method mismatch: expected ${mock.options.method}, got ${options.method || 'GET'}`);
    }

    // Return response
    const response = typeof mock.response === 'function' 
      ? await mock.response(url, options)
      : mock.response;

    return {
      status: response.status || 200,
      data: response.data || response,
      headers: response.headers || {}
    };
  }

  /**
   * GET request
   */
  async get(url, options = {}) {
    return await this.request(url, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post(url, data, options = {}) {
    return await this.request(url, { ...options, method: 'POST', body: data });
  }

  /**
   * PUT request
   */
  async put(url, data, options = {}) {
    return await this.request(url, { ...options, method: 'PUT', body: data });
  }

  /**
   * DELETE request
   */
  async delete(url, options = {}) {
    return await this.request(url, { ...options, method: 'DELETE' });
  }

  /**
   * Add interceptor
   */
  intercept(interceptor) {
    this.interceptors.push(interceptor);
    return this;
  }

  /**
   * Get request history
   */
  getRequestHistory(url) {
    if (url) {
      return this.requestHistory.filter(r => r.url === url);
    }
    return this.requestHistory;
  }

  /**
   * Clear mocks
   */
  clear() {
    this.responses.clear();
    this.requestHistory = [];
    this.interceptors = [];
  }

  /**
   * Reset
   */
  reset() {
    this.clear();
  }
}

/**
 * Create stub
 */
export function createStub(name) {
  const stub = {
    name,
    calls: [],
    returnValue: undefined,
    implementation: null,
    throws: null
  };

  const fn = function(...args) {
    stub.calls.push({
      args,
      timestamp: Date.now(),
      context: this
    });

    if (stub.throws) {
      throw stub.throws;
    }

    if (stub.implementation) {
      return stub.implementation.apply(this, args);
    }

    return stub.returnValue;
  };

  fn.returns = (value) => {
    stub.returnValue = value;
    return fn;
  };

  fn.resolves = (value) => {
    stub.returnValue = Promise.resolve(value);
    return fn;
  };

  fn.rejects = (error) => {
    stub.returnValue = Promise.reject(error);
    return fn;
  };

  fn.throws = (error) => {
    stub.throws = error;
    return fn;
  };

  fn.callsFake = (implementation) => {
    stub.implementation = implementation;
    return fn;
  };

  fn.getCalls = () => stub.calls;

  fn.callCount = () => stub.calls.length;

  fn.calledWith = (...expectedArgs) => {
    return stub.calls.some(call => 
      expectedArgs.every((arg, i) => call.args[i] === arg)
    );
  };

  fn.reset = () => {
    stub.calls = [];
    stub.returnValue = undefined;
    stub.implementation = null;
    stub.throws = null;
  };

  return fn;
}

/**
 * Create spy
 */
export function createSpy(target, methodName) {
  const original = target[methodName];
  const spy = {
    calls: [],
    original
  };

  target[methodName] = function(...args) {
    spy.calls.push({
      args,
      timestamp: Date.now(),
      context: this
    });

    return original.apply(this, args);
  };

  target[methodName].restore = () => {
    target[methodName] = original;
  };

  target[methodName].getCalls = () => spy.calls;

  target[methodName].callCount = () => spy.calls.length;

  target[methodName].calledWith = (...expectedArgs) => {
    return spy.calls.some(call => 
      expectedArgs.every((arg, i) => call.args[i] === arg)
    );
  };

  return target[methodName];
}

/**
 * Mock WebSocket
 */
export class MockWebSocket extends EventEmitter {
  constructor(url) {
    super();
    this.url = url;
    this.readyState = 0; // CONNECTING
    this.sentMessages = [];
    this.receivedMessages = [];
    
    // Simulate connection
    setTimeout(() => {
      this.readyState = 1; // OPEN
      this.emit('open');
    }, 10);
  }

  /**
   * Send message
   */
  send(data) {
    if (this.readyState !== 1) {
      throw new Error('WebSocket is not open');
    }
    
    this.sentMessages.push({
      data,
      timestamp: Date.now()
    });
    
    this.emit('send', data);
  }

  /**
   * Simulate receiving message
   */
  receive(data) {
    this.receivedMessages.push({
      data,
      timestamp: Date.now()
    });
    
    this.emit('message', { data });
  }

  /**
   * Close connection
   */
  close(code = 1000, reason = '') {
    this.readyState = 3; // CLOSED
    this.emit('close', { code, reason });
  }

  /**
   * Get sent messages
   */
  getSentMessages() {
    return this.sentMessages;
  }

  /**
   * Get received messages
   */
  getReceivedMessages() {
    return this.receivedMessages;
  }

  /**
   * Clear history
   */
  clear() {
    this.sentMessages = [];
    this.receivedMessages = [];
  }
}

/**
 * Mock Redis Client
 */
export class MockRedisClient {
  constructor() {
    this.store = new Map();
    this.expirations = new Map();
    this.subscribers = new Map();
  }

  /**
   * Set key
   */
  async set(key, value, options = {}) {
    this.store.set(key, value);
    
    if (options.EX) {
      this.expirations.set(key, Date.now() + options.EX * 1000);
    }
    
    return 'OK';
  }

  /**
   * Get key
   */
  async get(key) {
    if (this.isExpired(key)) {
      this.store.delete(key);
      this.expirations.delete(key);
      return null;
    }
    
    return this.store.get(key) || null;
  }

  /**
   * Delete key
   */
  async del(key) {
    const existed = this.store.has(key);
    this.store.delete(key);
    this.expirations.delete(key);
    return existed ? 1 : 0;
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    return this.store.has(key) ? 1 : 0;
  }

  /**
   * Set expiration
   */
  async expire(key, seconds) {
    if (!this.store.has(key)) {
      return 0;
    }
    
    this.expirations.set(key, Date.now() + seconds * 1000);
    return 1;
  }

  /**
   * Get TTL
   */
  async ttl(key) {
    if (!this.expirations.has(key)) {
      return -1;
    }
    
    const expireAt = this.expirations.get(key);
    const ttl = Math.floor((expireAt - Date.now()) / 1000);
    
    return ttl > 0 ? ttl : -2;
  }

  /**
   * Publish message
   */
  async publish(channel, message) {
    const subscribers = this.subscribers.get(channel) || [];
    subscribers.forEach(callback => callback(message));
    return subscribers.length;
  }

  /**
   * Subscribe to channel
   */
  subscribe(channel, callback) {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, []);
    }
    this.subscribers.get(channel).push(callback);
  }

  /**
   * Unsubscribe from channel
   */
  unsubscribe(channel, callback) {
    const subscribers = this.subscribers.get(channel) || [];
    const index = subscribers.indexOf(callback);
    if (index > -1) {
      subscribers.splice(index, 1);
    }
  }

  /**
   * Check if key is expired
   */
  isExpired(key) {
    if (!this.expirations.has(key)) {
      return false;
    }
    
    return Date.now() > this.expirations.get(key);
  }

  /**
   * Clear all data
   */
  async flushall() {
    this.store.clear();
    this.expirations.clear();
    return 'OK';
  }
}

export default {
  MockDatabase,
  MockCollection,
  MockTransaction,
  MockHTTPClient,
  MockWebSocket,
  MockRedisClient,
  createStub,
  createSpy
};
