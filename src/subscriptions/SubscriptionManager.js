/**
 * Subscription Manager
 * 
 * Features:
 * - Real-time GraphQL subscriptions over WebSocket
 * - Multiple transport adapters (uWebSockets.js, ws, graphql-ws)
 * - PubSub system with Redis/NATS/Memory backends
 * - Subscription filtering and transformation
 * - Connection management and heartbeat
 * - Authentication and authorization
 * - Automatic cleanup and error handling
 * 
 * @example
 * const subscriptionManager = new SubscriptionManager({
 *   transport: 'uwebsockets',
 *   pubsub: 'redis',
 *   schema: graphqlSchema,
 *   authenticate: async (connectionParams) => ({ userId: '123' })
 * });
 * 
 * await subscriptionManager.start();
 */

import { EventEmitter } from 'events';
import { parse, execute, subscribe } from 'graphql';

/**
 * Subscription Manager
 */
export class SubscriptionManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.transport = options.transport || 'uwebsockets'; // uwebsockets, ws, graphql-ws
    this.transportOptions = options.transportOptions || {};
    this.pubsub = options.pubsub || 'memory'; // memory, redis, nats
    this.pubsubOptions = options.pubsubOptions || {};
    
    // GraphQL
    this.schema = options.schema;
    this.context = options.context || {};
    this.rootValue = options.rootValue || {};
    
    // Authentication
    this.authenticate = options.authenticate || null;
    this.onConnect = options.onConnect || null;
    this.onDisconnect = options.onDisconnect || null;
    
    // Connection management
    this.connections = new Map();
    this.subscriptions = new Map();
    this.heartbeatInterval = options.heartbeatInterval || 30000; // 30s
    this.connectionTimeout = options.connectionTimeout || 60000; // 60s
    
    // Filtering
    this.filterFn = options.filterFn || null;
    
    // State
    this.started = false;
    
    // Create adapters
    this.transportAdapter = this.createTransportAdapter();
    this.pubsubAdapter = this.createPubSubAdapter();
  }

  /**
   * Create transport adapter
   */
  createTransportAdapter() {
    switch (this.transport) {
      case 'uwebsockets':
        return new UWebSocketsAdapter(this, this.transportOptions);
      case 'ws':
        return new WebSocketAdapter(this, this.transportOptions);
      case 'graphql-ws':
        return new GraphQLWSAdapter(this, this.transportOptions);
      default:
        throw new Error(`Unsupported transport: ${this.transport}`);
    }
  }

  /**
   * Create PubSub adapter
   */
  createPubSubAdapter() {
    switch (this.pubsub) {
      case 'redis':
        return new RedisPubSub(this.pubsubOptions);
      case 'nats':
        return new NATSPubSub(this.pubsubOptions);
      case 'memory':
      default:
        return new MemoryPubSub(this.pubsubOptions);
    }
  }

  /**
   * Start subscription manager
   */
  async start(server) {
    if (this.started) {
      throw new Error('Subscription manager already started');
    }
    
    // Initialize PubSub
    await this.pubsubAdapter.connect();
    
    // Start transport
    await this.transportAdapter.start(server);
    
    // Start heartbeat
    this.startHeartbeat();
    
    this.started = true;
    this.emit('started');
    
    console.log(`✓ Subscription manager started (${this.transport} + ${this.pubsub})`);
  }

  /**
   * Stop subscription manager
   */
  async stop() {
    if (!this.started) {
      return;
    }
    
    // Stop heartbeat
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    // Close all connections
    for (const connection of this.connections.values()) {
      await this.closeConnection(connection.id);
    }
    
    // Stop transport
    await this.transportAdapter.stop();
    
    // Disconnect PubSub
    await this.pubsubAdapter.disconnect();
    
    this.started = false;
    this.emit('stopped');
    
    console.log('✓ Subscription manager stopped');
  }

  /**
   * Handle new connection
   */
  async handleConnect(connectionId, connectionParams, ws) {
    try {
      // Authenticate
      let context = { ...this.context };
      
      if (this.authenticate) {
        const authContext = await this.authenticate(connectionParams);
        if (!authContext) {
          throw new Error('Authentication failed');
        }
        context = { ...context, ...authContext };
      }
      
      // Create connection
      const connection = {
        id: connectionId,
        ws,
        context,
        connectionParams,
        subscriptions: new Map(),
        createdAt: Date.now(),
        lastActivity: Date.now(),
        authenticated: !!this.authenticate
      };
      
      this.connections.set(connectionId, connection);
      
      // Callback
      if (this.onConnect) {
        await this.onConnect(connection);
      }
      
      this.emit('connection:open', connection);
      
      return connection;
      
    } catch (error) {
      this.emit('connection:error', { connectionId, error });
      throw error;
    }
  }

  /**
   * Handle disconnection
   */
  async handleDisconnect(connectionId) {
    const connection = this.connections.get(connectionId);
    
    if (!connection) {
      return;
    }
    
    // Unsubscribe all
    for (const subscriptionId of connection.subscriptions.keys()) {
      await this.unsubscribe(connectionId, subscriptionId);
    }
    
    // Callback
    if (this.onDisconnect) {
      await this.onDisconnect(connection);
    }
    
    this.connections.delete(connectionId);
    this.emit('connection:close', connection);
  }

  /**
   * Handle subscription request
   */
  async handleSubscribe(connectionId, subscriptionId, payload) {
    const connection = this.connections.get(connectionId);
    
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }
    
    try {
      const { query, variables = {}, operationName } = payload;
      
      // Parse query
      const document = typeof query === 'string' ? parse(query) : query;
      
      // Execute subscription
      const result = await subscribe({
        schema: this.schema,
        document,
        rootValue: this.rootValue,
        contextValue: connection.context,
        variableValues: variables,
        operationName
      });
      
      // Handle errors
      if ('errors' in result) {
        throw result.errors[0];
      }
      
      // Store subscription
      const subscription = {
        id: subscriptionId,
        connectionId,
        document,
        variables,
        operationName,
        iterator: result,
        context: connection.context,
        createdAt: Date.now()
      };
      
      connection.subscriptions.set(subscriptionId, subscription);
      this.subscriptions.set(subscriptionId, subscription);
      
      // Start consuming
      this.consumeSubscription(subscription);
      
      this.emit('subscription:start', subscription);
      
      return subscription;
      
    } catch (error) {
      this.emit('subscription:error', { connectionId, subscriptionId, error });
      throw error;
    }
  }

  /**
   * Consume subscription iterator
   */
  async consumeSubscription(subscription) {
    try {
      for await (const result of subscription.iterator) {
        const connection = this.connections.get(subscription.connectionId);
        
        if (!connection) {
          // Connection closed
          break;
        }
        
        // Apply filter
        if (this.filterFn) {
          const shouldSend = await this.filterFn(result, subscription);
          if (!shouldSend) {
            continue;
          }
        }
        
        // Send result
        await this.transportAdapter.sendSubscriptionData(
          connection,
          subscription.id,
          result
        );
        
        this.emit('subscription:data', { subscription, result });
      }
    } catch (error) {
      this.emit('subscription:error', { subscription, error });
      
      // Send error to client
      const connection = this.connections.get(subscription.connectionId);
      if (connection) {
        await this.transportAdapter.sendSubscriptionError(
          connection,
          subscription.id,
          error
        );
      }
    } finally {
      // Cleanup
      await this.unsubscribe(subscription.connectionId, subscription.id);
    }
  }

  /**
   * Unsubscribe
   */
  async unsubscribe(connectionId, subscriptionId) {
    const subscription = this.subscriptions.get(subscriptionId);
    
    if (!subscription) {
      return;
    }
    
    // Cancel iterator
    if (subscription.iterator?.return) {
      await subscription.iterator.return();
    }
    
    // Remove from maps
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.subscriptions.delete(subscriptionId);
    }
    this.subscriptions.delete(subscriptionId);
    
    this.emit('subscription:stop', subscription);
  }

  /**
   * Publish event
   */
  async publish(topic, payload) {
    return await this.pubsubAdapter.publish(topic, payload);
  }

  /**
   * Subscribe to topic
   */
  async subscribeTopic(topic, handler) {
    return await this.pubsubAdapter.subscribe(topic, handler);
  }

  /**
   * Unsubscribe from topic
   */
  async unsubscribeTopic(subscriptionId) {
    return await this.pubsubAdapter.unsubscribe(subscriptionId);
  }

  /**
   * Close connection
   */
  async closeConnection(connectionId, code = 1000, reason = 'Normal closure') {
    const connection = this.connections.get(connectionId);
    
    if (!connection) {
      return;
    }
    
    await this.transportAdapter.closeConnection(connection, code, reason);
    await this.handleDisconnect(connectionId);
  }

  /**
   * Start heartbeat
   */
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      
      for (const [connectionId, connection] of this.connections.entries()) {
        // Check timeout
        if (now - connection.lastActivity > this.connectionTimeout) {
          this.closeConnection(connectionId, 1000, 'Connection timeout');
          continue;
        }
        
        // Send ping
        this.transportAdapter.sendPing(connection);
      }
    }, this.heartbeatInterval);
  }

  /**
   * Update connection activity
   */
  updateActivity(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastActivity = Date.now();
    }
  }

  /**
   * Get connection count
   */
  getConnectionCount() {
    return this.connections.size;
  }

  /**
   * Get subscription count
   */
  getSubscriptionCount() {
    return this.subscriptions.size;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      connections: this.connections.size,
      subscriptions: this.subscriptions.size,
      transport: this.transport,
      pubsub: this.pubsub,
      uptime: this.started ? Date.now() - this.startTime : 0
    };
  }
}

/**
 * Memory PubSub (for development)
 */
export class MemoryPubSub {
  constructor(options = {}) {
    this.subscriptions = new Map();
    this.subIdCounter = 0;
  }

  async connect() {
    // No-op for memory
  }

  async disconnect() {
    this.subscriptions.clear();
  }

  async publish(topic, payload) {
    const handlers = this.subscriptions.get(topic);
    
    if (!handlers) {
      return;
    }
    
    for (const handler of handlers.values()) {
      try {
        await handler(payload);
      } catch (error) {
        console.error('PubSub handler error:', error);
      }
    }
  }

  async subscribe(topic, handler) {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Map());
    }
    
    const subId = ++this.subIdCounter;
    this.subscriptions.get(topic).set(subId, handler);
    
    return subId;
  }

  async unsubscribe(subscriptionId) {
    for (const handlers of this.subscriptions.values()) {
      handlers.delete(subscriptionId);
    }
  }
}

/**
 * Redis PubSub
 */
export class RedisPubSub {
  constructor(options = {}) {
    this.options = options;
    this.publisher = null;
    this.subscriber = null;
    this.subscriptions = new Map();
    this.subIdCounter = 0;
  }

  async connect() {
    const { createClient } = await import('redis');
    
    this.publisher = createClient(this.options);
    this.subscriber = createClient(this.options);
    
    await this.publisher.connect();
    await this.subscriber.connect();
    
    console.log('✓ Redis PubSub connected');
  }

  async disconnect() {
    await this.publisher?.quit();
    await this.subscriber?.quit();
    this.subscriptions.clear();
  }

  async publish(topic, payload) {
    const message = JSON.stringify(payload);
    await this.publisher.publish(topic, message);
  }

  async subscribe(topic, handler) {
    const subId = ++this.subIdCounter;
    
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Map());
      
      // Subscribe to Redis channel
      await this.subscriber.subscribe(topic, (message) => {
        const payload = JSON.parse(message);
        const handlers = this.subscriptions.get(topic);
        
        if (handlers) {
          for (const h of handlers.values()) {
            h(payload).catch(console.error);
          }
        }
      });
    }
    
    this.subscriptions.get(topic).set(subId, handler);
    
    return subId;
  }

  async unsubscribe(subscriptionId) {
    for (const [topic, handlers] of this.subscriptions.entries()) {
      handlers.delete(subscriptionId);
      
      if (handlers.size === 0) {
        await this.subscriber.unsubscribe(topic);
        this.subscriptions.delete(topic);
      }
    }
  }
}

/**
 * NATS PubSub
 */
export class NATSPubSub {
  constructor(options = {}) {
    this.options = options;
    this.connection = null;
    this.subscriptions = new Map();
    this.subIdCounter = 0;
  }

  async connect() {
    const { connect } = await import('nats');
    
    this.connection = await connect({
      servers: this.options.servers || ['nats://localhost:4222']
    });
    
    console.log('✓ NATS PubSub connected');
  }

  async disconnect() {
    await this.connection?.drain();
    this.subscriptions.clear();
  }

  async publish(topic, payload) {
    const message = JSON.stringify(payload);
    this.connection.publish(topic, message);
  }

  async subscribe(topic, handler) {
    const subId = ++this.subIdCounter;
    
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Map());
      
      // Subscribe to NATS subject
      const sub = this.connection.subscribe(topic);
      
      (async () => {
        for await (const msg of sub) {
          const payload = JSON.parse(msg.data);
          const handlers = this.subscriptions.get(topic);
          
          if (handlers) {
            for (const h of handlers.values()) {
              h(payload).catch(console.error);
            }
          }
        }
      })();
    }
    
    this.subscriptions.get(topic).set(subId, handler);
    
    return subId;
  }

  async unsubscribe(subscriptionId) {
    for (const handlers of this.subscriptions.values()) {
      handlers.delete(subscriptionId);
    }
  }
}

export default SubscriptionManager;
