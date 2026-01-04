/**
 * uWebSockets.js Transport Adapter
 * 
 * High-performance WebSocket transport using uWebSockets.js
 * 
 * Features:
 * - Ultra-fast WebSocket connections (C++ core)
 * - GraphQL over WebSocket protocol support
 * - Backpressure handling
 * - Binary and text messages
 * - Compression support
 * - SSL/TLS support
 * 
 * @example
 * const adapter = new UWebSocketsAdapter(subscriptionManager, {
 *   port: 4000,
 *   path: '/graphql',
 *   compression: true,
 *   maxPayloadLength: 16 * 1024 * 1024
 * });
 */

import uWS from 'uWebSockets.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Message types for GraphQL over WebSocket
 */
const MessageType = {
  // Client -> Server
  CONNECTION_INIT: 'connection_init',
  CONNECTION_TERMINATE: 'connection_terminate',
  SUBSCRIBE: 'subscribe',
  COMPLETE: 'complete',
  PING: 'ping',
  PONG: 'pong',
  
  // Server -> Client
  CONNECTION_ACK: 'connection_ack',
  NEXT: 'next',
  ERROR: 'error',
  COMPLETE_SERVER: 'complete'
};

/**
 * uWebSockets.js Transport Adapter
 */
export class UWebSocketsAdapter {
  constructor(subscriptionManager, options = {}) {
    this.manager = subscriptionManager;
    
    // Server options
    this.port = options.port || 4000;
    this.host = options.host || '0.0.0.0';
    this.path = options.path || '/graphql';
    
    // WebSocket options
    this.compression = options.compression !== false ? uWS.SHARED_COMPRESSOR : uWS.DISABLED;
    this.maxPayloadLength = options.maxPayloadLength || 16 * 1024 * 1024; // 16MB
    this.maxBackpressure = options.maxBackpressure || 1024 * 1024; // 1MB
    this.idleTimeout = options.idleTimeout || 120; // 120 seconds
    
    // SSL/TLS
    this.ssl = options.ssl || null;
    
    // State
    this.app = null;
    this.listenSocket = null;
    this.connections = new Map();
  }

  /**
   * Start WebSocket server
   */
  async start(httpServer) {
    return new Promise((resolve, reject) => {
      try {
        // Create uWebSockets app
        this.app = this.ssl
          ? uWS.SSLApp({
              key_file_name: this.ssl.key,
              cert_file_name: this.ssl.cert,
              passphrase: this.ssl.passphrase
            })
          : uWS.App();
        
        // Setup WebSocket route
        this.app.ws(this.path, {
          compression: this.compression,
          maxPayloadLength: this.maxPayloadLength,
          maxBackpressure: this.maxBackpressure,
          idleTimeout: this.idleTimeout,
          
          // Upgrade HTTP to WebSocket
          upgrade: (res, req, context) => {
            const secWebSocketKey = req.getHeader('sec-websocket-key');
            const secWebSocketProtocol = req.getHeader('sec-websocket-protocol');
            const secWebSocketExtensions = req.getHeader('sec-websocket-extensions');
            
            // Parse connection params from query or headers
            const url = req.getUrl();
            const query = req.getQuery();
            const connectionParams = this.parseConnectionParams(query);
            
            res.upgrade(
              {
                connectionParams,
                url,
                query
              },
              secWebSocketKey,
              secWebSocketProtocol,
              secWebSocketExtensions,
              context
            );
          },
          
          // WebSocket opened
          open: (ws) => {
            this.handleOpen(ws);
          },
          
          // Message received
          message: (ws, message, isBinary) => {
            this.handleMessage(ws, message, isBinary);
          },
          
          // Drain (backpressure resolved)
          drain: (ws) => {
            console.log('WebSocket drain:', ws.getBufferedAmount());
          },
          
          // WebSocket closed
          close: (ws, code, message) => {
            this.handleClose(ws, code, message);
          }
        });
        
        // Optional: Add HTTP route for health check
        this.app.get('/health', (res, req) => {
          res.writeStatus('200 OK');
          res.writeHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            status: 'ok',
            connections: this.connections.size,
            subscriptions: this.manager.getSubscriptionCount()
          }));
        });
        
        // Listen
        this.app.listen(this.host, this.port, (listenSocket) => {
          if (listenSocket) {
            this.listenSocket = listenSocket;
            console.log(`✓ uWebSockets.js listening on ${this.host}:${this.port}${this.path}`);
            resolve();
          } else {
            reject(new Error(`Failed to listen on port ${this.port}`));
          }
        });
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop WebSocket server
   */
  async stop() {
    if (this.listenSocket) {
      uWS.us_listen_socket_close(this.listenSocket);
      this.listenSocket = null;
    }
    
    this.connections.clear();
    console.log('✓ uWebSockets.js stopped');
  }

  /**
   * Handle WebSocket open
   */
  handleOpen(ws) {
    const connectionId = uuidv4();
    
    // Store connection metadata
    ws.connectionId = connectionId;
    ws.authenticated = false;
    ws.subscriptions = new Set();
    ws.connectionParams = ws.connectionParams || {};
    
    this.connections.set(connectionId, ws);
    
    console.log(`WebSocket connected: ${connectionId}`);
  }

  /**
   * Handle WebSocket message
   */
  async handleMessage(ws, messageBuffer, isBinary) {
    try {
      // Parse message
      const messageStr = Buffer.from(messageBuffer).toString('utf8');
      const message = JSON.parse(messageStr);
      
      const { id, type, payload } = message;
      
      // Update activity
      this.manager.updateActivity(ws.connectionId);
      
      // Handle message by type
      switch (type) {
        case MessageType.CONNECTION_INIT:
          await this.handleConnectionInit(ws, payload);
          break;
        
        case MessageType.SUBSCRIBE:
          await this.handleSubscribe(ws, id, payload);
          break;
        
        case MessageType.COMPLETE:
          await this.handleComplete(ws, id);
          break;
        
        case MessageType.PING:
          this.sendMessage(ws, { type: MessageType.PONG });
          break;
        
        case MessageType.PONG:
          // Client pong response
          break;
        
        case MessageType.CONNECTION_TERMINATE:
          this.closeConnection({ connectionId: ws.connectionId }, 1000, 'Client terminated');
          break;
        
        default:
          console.warn(`Unknown message type: ${type}`);
      }
      
    } catch (error) {
      console.error('Message handling error:', error);
      this.sendError(ws, null, error.message);
    }
  }

  /**
   * Handle connection initialization
   */
  async handleConnectionInit(ws, payload) {
    try {
      // Authenticate and create connection in manager
      const connection = await this.manager.handleConnect(
        ws.connectionId,
        payload || ws.connectionParams,
        ws
      );
      
      ws.authenticated = true;
      
      // Send ACK
      this.sendMessage(ws, {
        type: MessageType.CONNECTION_ACK,
        payload: { connectionId: ws.connectionId }
      });
      
    } catch (error) {
      this.sendMessage(ws, {
        type: MessageType.ERROR,
        payload: { message: error.message }
      });
      
      // Close connection on auth failure
      this.closeConnection({ connectionId: ws.connectionId }, 4403, 'Forbidden');
    }
  }

  /**
   * Handle subscription
   */
  async handleSubscribe(ws, subscriptionId, payload) {
    if (!ws.authenticated) {
      this.sendError(ws, subscriptionId, 'Not authenticated');
      return;
    }
    
    try {
      await this.manager.handleSubscribe(ws.connectionId, subscriptionId, payload);
      ws.subscriptions.add(subscriptionId);
      
    } catch (error) {
      this.sendError(ws, subscriptionId, error.message);
    }
  }

  /**
   * Handle complete (unsubscribe)
   */
  async handleComplete(ws, subscriptionId) {
    await this.manager.unsubscribe(ws.connectionId, subscriptionId);
    ws.subscriptions.delete(subscriptionId);
  }

  /**
   * Handle WebSocket close
   */
  async handleClose(ws, code, messageBuffer) {
    const message = Buffer.from(messageBuffer).toString('utf8');
    console.log(`WebSocket closed: ${ws.connectionId} (${code}: ${message})`);
    
    await this.manager.handleDisconnect(ws.connectionId);
    this.connections.delete(ws.connectionId);
  }

  /**
   * Send subscription data to client
   */
  async sendSubscriptionData(connection, subscriptionId, result) {
    const ws = this.connections.get(connection.id);
    
    if (!ws) {
      return;
    }
    
    this.sendMessage(ws, {
      id: subscriptionId,
      type: MessageType.NEXT,
      payload: result
    });
  }

  /**
   * Send subscription error to client
   */
  async sendSubscriptionError(connection, subscriptionId, error) {
    const ws = this.connections.get(connection.id);
    
    if (!ws) {
      return;
    }
    
    this.sendMessage(ws, {
      id: subscriptionId,
      type: MessageType.ERROR,
      payload: {
        message: error.message,
        locations: error.locations,
        path: error.path
      }
    });
  }

  /**
   * Send subscription complete to client
   */
  async sendSubscriptionComplete(connection, subscriptionId) {
    const ws = this.connections.get(connection.id);
    
    if (!ws) {
      return;
    }
    
    this.sendMessage(ws, {
      id: subscriptionId,
      type: MessageType.COMPLETE_SERVER
    });
  }

  /**
   * Send ping
   */
  sendPing(connection) {
    const ws = this.connections.get(connection.id);
    
    if (!ws) {
      return;
    }
    
    this.sendMessage(ws, { type: MessageType.PING });
  }

  /**
   * Send error message
   */
  sendError(ws, id, message) {
    this.sendMessage(ws, {
      id,
      type: MessageType.ERROR,
      payload: { message }
    });
  }

  /**
   * Send message to WebSocket
   */
  sendMessage(ws, message) {
    const messageStr = JSON.stringify(message);
    
    // Check backpressure
    const buffered = ws.getBufferedAmount();
    if (buffered > this.maxBackpressure) {
      console.warn(`Backpressure limit exceeded: ${buffered} bytes`);
      // Optionally close connection
      return false;
    }
    
    // Send message
    const result = ws.send(messageStr, false); // false = text message
    
    if (result === 0) {
      console.warn('Message dropped due to backpressure');
      return false;
    }
    
    return true;
  }

  /**
   * Close connection
   */
  async closeConnection(connection, code = 1000, reason = 'Normal closure') {
    const ws = this.connections.get(connection.connectionId || connection.id);
    
    if (!ws) {
      return;
    }
    
    try {
      ws.end(code, reason);
    } catch (error) {
      console.error('Error closing WebSocket:', error);
    }
  }

  /**
   * Parse connection params from query string
   */
  parseConnectionParams(query) {
    if (!query) {
      return {};
    }
    
    try {
      const params = {};
      const pairs = query.split('&');
      
      for (const pair of pairs) {
        const [key, value] = pair.split('=');
        params[decodeURIComponent(key)] = decodeURIComponent(value || '');
      }
      
      return params;
    } catch (error) {
      return {};
    }
  }

  /**
   * Broadcast to all connections
   */
  broadcast(message) {
    const messageStr = JSON.stringify(message);
    
    for (const ws of this.connections.values()) {
      if (ws.authenticated) {
        ws.send(messageStr, false);
      }
    }
  }

  /**
   * Get connection stats
   */
  getStats() {
    let totalSubscriptions = 0;
    
    for (const ws of this.connections.values()) {
      totalSubscriptions += ws.subscriptions.size;
    }
    
    return {
      connections: this.connections.size,
      subscriptions: totalSubscriptions,
      transport: 'uwebsockets'
    };
  }
}

/**
 * Standard WebSocket Adapter (using 'ws' library)
 */
export class WebSocketAdapter {
  constructor(subscriptionManager, options = {}) {
    this.manager = subscriptionManager;
    this.options = options;
    this.wss = null;
  }

  async start(httpServer) {
    const { WebSocketServer } = await import('ws');
    
    this.wss = new WebSocketServer({
      server: httpServer,
      path: this.options.path || '/graphql',
      ...this.options
    });
    
    this.wss.on('connection', (ws, request) => {
      this.handleConnection(ws, request);
    });
    
    console.log('✓ WebSocket server started (ws)');
  }

  async stop() {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }

  handleConnection(ws, request) {
    const connectionId = uuidv4();
    ws.connectionId = connectionId;
    
    ws.on('message', async (message) => {
      // Handle message similar to uWebSockets
      const data = JSON.parse(message.toString());
      // ... message handling
    });
    
    ws.on('close', async () => {
      await this.manager.handleDisconnect(connectionId);
    });
  }

  async sendSubscriptionData(connection, subscriptionId, result) {
    // Implementation
  }

  async sendSubscriptionError(connection, subscriptionId, error) {
    // Implementation
  }

  sendPing(connection) {
    // Implementation
  }

  async closeConnection(connection, code, reason) {
    // Implementation
  }
}

/**
 * graphql-ws Protocol Adapter
 */
export class GraphQLWSAdapter {
  constructor(subscriptionManager, options = {}) {
    this.manager = subscriptionManager;
    this.options = options;
    this.server = null;
  }

  async start(httpServer) {
    const { useServer } = await import('graphql-ws/lib/use/ws');
    const { WebSocketServer } = await import('ws');
    
    const wss = new WebSocketServer({
      server: httpServer,
      path: this.options.path || '/graphql'
    });
    
    this.server = useServer(
      {
        schema: this.manager.schema,
        context: this.manager.context,
        onConnect: async (ctx) => {
          if (this.manager.authenticate) {
            return await this.manager.authenticate(ctx.connectionParams);
          }
          return true;
        }
      },
      wss
    );
    
    console.log('✓ GraphQL-WS server started');
  }

  async stop() {
    if (this.server) {
      await this.server.dispose();
      this.server = null;
    }
  }

  // GraphQL-WS handles protocol internally
  async sendSubscriptionData() {}
  async sendSubscriptionError() {}
  sendPing() {}
  async closeConnection() {}
}

export default UWebSocketsAdapter;
