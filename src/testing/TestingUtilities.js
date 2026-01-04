/**
 * Testing Utilities for Microservices
 * 
 * Features:
 * - Mock service creation
 * - GraphQL testing utilities
 * - Fixture management
 * - Test data generators
 * - Integration test helpers
 * - Snapshot testing for GraphQL responses
 * - Database seeding and cleanup
 * - HTTP/WebSocket mocking
 * 
 * @example
 * import { createTestService, GraphQLTester } from '@dualitysol/boilerplate/testing';
 * 
 * const tester = new GraphQLTester(schema);
 * const result = await tester.query('{ users { id name } }');
 * expect(result.data.users).toMatchSnapshot();
 */

import { graphql, execute } from 'graphql';
import { EventEmitter } from 'events';

/**
 * GraphQL Tester
 * Utility for testing GraphQL schemas and resolvers
 */
export class GraphQLTester {
  constructor(schema, options = {}) {
    this.schema = schema;
    this.defaultContext = options.context || {};
    this.defaultRootValue = options.rootValue || {};
    this.snapshots = new Map();
  }

  /**
   * Execute GraphQL query
   */
  async query(source, options = {}) {
    const result = await graphql({
      schema: this.schema,
      source,
      rootValue: options.rootValue || this.defaultRootValue,
      contextValue: { ...this.defaultContext, ...options.context },
      variableValues: options.variables
    });

    return result;
  }

  /**
   * Execute GraphQL mutation
   */
  async mutate(source, options = {}) {
    return await this.query(source, options);
  }

  /**
   * Execute GraphQL subscription
   */
  async subscribe(source, options = {}) {
    const result = await execute({
      schema: this.schema,
      document: typeof source === 'string' ? parse(source) : source,
      rootValue: options.rootValue || this.defaultRootValue,
      contextValue: { ...this.defaultContext, ...options.context },
      variableValues: options.variables
    });

    return result;
  }

  /**
   * Assert query result
   */
  async expectQuery(source, options = {}) {
    const result = await this.query(source, options);
    return new QueryAssertion(result);
  }

  /**
   * Assert mutation result
   */
  async expectMutation(source, options = {}) {
    const result = await this.mutate(source, options);
    return new QueryAssertion(result);
  }

  /**
   * Snapshot testing
   */
  async expectSnapshot(name, source, options = {}) {
    const result = await this.query(source, options);
    
    if (this.snapshots.has(name)) {
      const snapshot = this.snapshots.get(name);
      if (JSON.stringify(result) !== JSON.stringify(snapshot)) {
        throw new Error(`Snapshot mismatch: ${name}`);
      }
    } else {
      this.snapshots.set(name, result);
    }

    return result;
  }

  /**
   * Get all snapshots
   */
  getSnapshots() {
    return Object.fromEntries(this.snapshots);
  }

  /**
   * Clear snapshots
   */
  clearSnapshots() {
    this.snapshots.clear();
  }
}

/**
 * Query Assertion Helper
 */
export class QueryAssertion {
  constructor(result) {
    this.result = result;
  }

  toHaveNoErrors() {
    if (this.result.errors && this.result.errors.length > 0) {
      throw new Error(`Expected no errors, but got: ${JSON.stringify(this.result.errors)}`);
    }
    return this;
  }

  toHaveErrors() {
    if (!this.result.errors || this.result.errors.length === 0) {
      throw new Error('Expected errors, but got none');
    }
    return this;
  }

  toHaveErrorMessage(message) {
    if (!this.result.errors) {
      throw new Error('No errors found');
    }
    
    const hasMessage = this.result.errors.some(err => 
      err.message.includes(message)
    );
    
    if (!hasMessage) {
      throw new Error(`Expected error message "${message}", but got: ${JSON.stringify(this.result.errors)}`);
    }
    
    return this;
  }

  toHaveData(path, value) {
    const data = this.getDataPath(path);
    
    if (value !== undefined && data !== value) {
      throw new Error(`Expected data at "${path}" to be ${value}, but got ${data}`);
    }
    
    return this;
  }

  toMatchData(path, matcher) {
    const data = this.getDataPath(path);
    
    if (!matcher(data)) {
      throw new Error(`Data at "${path}" does not match: ${JSON.stringify(data)}`);
    }
    
    return this;
  }

  getDataPath(path) {
    const parts = path.split('.');
    let current = this.result.data;
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        throw new Error(`Path "${path}" not found in data`);
      }
      current = current[part];
    }
    
    return current;
  }

  getData() {
    return this.result.data;
  }

  getErrors() {
    return this.result.errors;
  }
}

/**
 * Mock Service Creator
 */
export class MockService extends EventEmitter {
  constructor(name, methods = {}) {
    super();
    this.name = name;
    this.methods = methods;
    this.callHistory = [];
    this.mockResponses = new Map();
  }

  /**
   * Mock method response
   */
  mock(methodName, response) {
    this.mockResponses.set(methodName, response);
    return this;
  }

  /**
   * Mock method implementation
   */
  mockImplementation(methodName, implementation) {
    this.methods[methodName] = implementation;
    return this;
  }

  /**
   * Call method
   */
  async call(methodName, ...args) {
    this.callHistory.push({ method: methodName, args, timestamp: Date.now() });
    this.emit('call', { method: methodName, args });

    if (this.mockResponses.has(methodName)) {
      const response = this.mockResponses.get(methodName);
      return typeof response === 'function' ? await response(...args) : response;
    }

    if (this.methods[methodName]) {
      return await this.methods[methodName](...args);
    }

    throw new Error(`Method ${methodName} not found on mock service ${this.name}`);
  }

  /**
   * Get call history
   */
  getCallHistory(methodName) {
    if (methodName) {
      return this.callHistory.filter(call => call.method === methodName);
    }
    return this.callHistory;
  }

  /**
   * Check if method was called
   */
  wasCalled(methodName, times) {
    const calls = this.getCallHistory(methodName);
    
    if (times !== undefined) {
      return calls.length === times;
    }
    
    return calls.length > 0;
  }

  /**
   * Reset mock
   */
  reset() {
    this.callHistory = [];
    this.mockResponses.clear();
  }
}

/**
 * Create mock service
 */
export function createMockService(name, methods = {}) {
  return new MockService(name, methods);
}

/**
 * Fixture Manager
 */
export class FixtureManager {
  constructor(options = {}) {
    this.fixtures = new Map();
    this.loaded = new Set();
    this.fixturesDir = options.fixturesDir || './fixtures';
  }

  /**
   * Register fixture
   */
  register(name, data) {
    this.fixtures.set(name, data);
    return this;
  }

  /**
   * Load fixture
   */
  async load(name) {
    if (this.loaded.has(name)) {
      return this.fixtures.get(name);
    }

    const fixture = this.fixtures.get(name);
    
    if (!fixture) {
      throw new Error(`Fixture "${name}" not found`);
    }

    // If fixture is a function, execute it
    const data = typeof fixture === 'function' ? await fixture() : fixture;
    
    this.fixtures.set(name, data);
    this.loaded.add(name);
    
    return data;
  }

  /**
   * Load multiple fixtures
   */
  async loadMany(names) {
    const results = {};
    
    for (const name of names) {
      results[name] = await this.load(name);
    }
    
    return results;
  }

  /**
   * Get fixture
   */
  get(name) {
    return this.fixtures.get(name);
  }

  /**
   * Clear loaded fixtures
   */
  clear() {
    this.loaded.clear();
  }

  /**
   * Reset all fixtures
   */
  reset() {
    this.fixtures.clear();
    this.loaded.clear();
  }
}

/**
 * Test Data Generator
 */
export class DataGenerator {
  constructor(options = {}) {
    this.seed = options.seed || Math.random();
    this.sequences = new Map();
  }

  /**
   * Generate random string
   */
  string(length = 10, charset = 'abcdefghijklmnopqrstuvwxyz0123456789') {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(this.random() * charset.length));
    }
    return result;
  }

  /**
   * Generate random number
   */
  number(min = 0, max = 100) {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /**
   * Generate random boolean
   */
  boolean() {
    return this.random() > 0.5;
  }

  /**
   * Generate random email
   */
  email() {
    return `${this.string(8)}@${this.string(6)}.com`;
  }

  /**
   * Generate random name
   */
  name() {
    const firstNames = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'];
    return `${this.pick(firstNames)} ${this.pick(lastNames)}`;
  }

  /**
   * Generate random date
   */
  date(start = new Date(2020, 0, 1), end = new Date()) {
    return new Date(start.getTime() + this.random() * (end.getTime() - start.getTime()));
  }

  /**
   * Pick random element from array
   */
  pick(array) {
    return array[Math.floor(this.random() * array.length)];
  }

  /**
   * Generate array of items
   */
  array(generator, count = 10) {
    return Array.from({ length: count }, () => generator());
  }

  /**
   * Generate object from schema
   */
  object(schema) {
    const obj = {};
    
    for (const [key, generator] of Object.entries(schema)) {
      obj[key] = typeof generator === 'function' ? generator(this) : generator;
    }
    
    return obj;
  }

  /**
   * Generate sequence
   */
  sequence(name, start = 1) {
    if (!this.sequences.has(name)) {
      this.sequences.set(name, start);
    }
    
    const value = this.sequences.get(name);
    this.sequences.set(name, value + 1);
    
    return value;
  }

  /**
   * Seeded random (for reproducibility)
   */
  random() {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }

  /**
   * Reset generator
   */
  reset(seed) {
    this.seed = seed || Math.random();
    this.sequences.clear();
  }
}

/**
 * Database Test Helper
 */
export class DatabaseTestHelper {
  constructor(connection, options = {}) {
    this.connection = connection;
    this.createdRecords = [];
    this.originalRecords = new Map();
    this.options = options;
  }

  /**
   * Create test record
   */
  async create(model, data) {
    const record = await this.connection[model].create(data);
    this.createdRecords.push({ model, id: record.id });
    return record;
  }

  /**
   * Create many test records
   */
  async createMany(model, dataArray) {
    const records = await this.connection[model].createMany(dataArray);
    records.forEach(record => {
      this.createdRecords.push({ model, id: record.id });
    });
    return records;
  }

  /**
   * Backup record before modification
   */
  async backup(model, id) {
    const record = await this.connection[model].findOne({ id });
    this.originalRecords.set(`${model}:${id}`, record);
    return record;
  }

  /**
   * Restore backed up record
   */
  async restore(model, id) {
    const key = `${model}:${id}`;
    const original = this.originalRecords.get(key);
    
    if (original) {
      await this.connection[model].update({ id }, original);
      this.originalRecords.delete(key);
    }
  }

  /**
   * Cleanup all test records
   */
  async cleanup() {
    // Restore backed up records
    for (const [key, record] of this.originalRecords.entries()) {
      const [model, id] = key.split(':');
      await this.connection[model].update({ id }, record);
    }
    
    // Delete created records
    for (const { model, id } of this.createdRecords.reverse()) {
      try {
        await this.connection[model].delete({ id });
      } catch (error) {
        console.warn(`Failed to delete ${model}:${id}`, error);
      }
    }
    
    this.createdRecords = [];
    this.originalRecords.clear();
  }

  /**
   * Seed database with fixtures
   */
  async seed(fixtures) {
    const records = {};
    
    for (const [model, dataArray] of Object.entries(fixtures)) {
      records[model] = await this.createMany(model, dataArray);
    }
    
    return records;
  }

  /**
   * Clear all data from models
   */
  async truncate(models) {
    for (const model of models) {
      await this.connection[model].deleteMany({});
    }
  }
}

/**
 * Integration Test Helper
 */
export class IntegrationTestHelper {
  constructor(app, options = {}) {
    this.app = app;
    this.options = options;
    this.started = false;
  }

  /**
   * Start application for testing
   */
  async start() {
    if (this.started) {
      return;
    }
    
    await this.app.start();
    this.started = true;
  }

  /**
   * Stop application
   */
  async stop() {
    if (!this.started) {
      return;
    }
    
    await this.app.stop();
    this.started = false;
  }

  /**
   * Make HTTP request
   */
  async request(method, path, options = {}) {
    const url = `${this.options.baseUrl || 'http://localhost:3000'}${path}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    
    const data = await response.json();
    
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      data
    };
  }

  /**
   * Make GraphQL request
   */
  async graphql(query, options = {}) {
    return await this.request('POST', '/graphql', {
      body: {
        query,
        variables: options.variables,
        operationName: options.operationName
      },
      headers: options.headers
    });
  }

  /**
   * Connect to WebSocket
   */
  async connectWebSocket(path = '/graphql') {
    const { WebSocket } = await import('ws');
    const url = `${this.options.wsUrl || 'ws://localhost:3000'}${path}`;
    
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      
      ws.on('open', () => resolve(ws));
      ws.on('error', reject);
    });
  }
}

/**
 * Create test context
 */
export function createTestContext(overrides = {}) {
  return {
    userId: 'test-user-id',
    username: 'testuser',
    roles: ['user'],
    ...overrides
  };
}

/**
 * Wait for condition
 */
export async function waitFor(condition, timeout = 5000, interval = 100) {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return true;
    }
    
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error('Timeout waiting for condition');
}

/**
 * Sleep helper
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
  GraphQLTester,
  QueryAssertion,
  MockService,
  createMockService,
  FixtureManager,
  DataGenerator,
  DatabaseTestHelper,
  IntegrationTestHelper,
  createTestContext,
  waitFor,
  sleep
};
