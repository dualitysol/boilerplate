/**
 * WebSocket Subscriptions Demo with uWebSockets.js
 * 
 * This example demonstrates real-time GraphQL subscriptions using:
 * - uWebSockets.js for high-performance WebSocket transport
 * - Redis PubSub for distributed subscriptions
 * - @Subscribe decorators for easy subscription definition
 * - Authentication and filtering
 * 
 * Features:
 * - Real-time chat messages
 * - User notifications
 * - Typing indicators
 * - Online presence
 * - Post updates
 */

import { SubscriptionManager, SubscriptionPublisher } from '../../src/subscriptions/SubscriptionManager.js';
import { Subscribe, generateSubscriptionResolvers } from '../../src/subscriptions/decorators.js';
import { buildSchema } from 'graphql';

/**
 * GraphQL Schema
 */
const typeDefs = `
  type Message {
    id: ID!
    chatId: ID!
    userId: ID!
    username: String!
    text: String!
    createdAt: String!
  }
  
  type Notification {
    id: ID!
    userId: ID!
    type: String!
    title: String!
    message: String!
    read: Boolean!
    createdAt: String!
  }
  
  type TypingIndicator {
    chatId: ID!
    userId: ID!
    username: String!
    isTyping: Boolean!
  }
  
  type UserPresence {
    userId: ID!
    username: String!
    status: String!
    lastSeen: String
  }
  
  type Post {
    id: ID!
    authorId: ID!
    title: String!
    content: String!
    likes: Int!
    updatedAt: String!
  }
  
  type Query {
    hello: String
  }
  
  type Mutation {
    sendMessage(chatId: ID!, text: String!): Message
    createNotification(userId: ID!, type: String!, title: String!, message: String!): Notification
    setTyping(chatId: ID!, isTyping: Boolean!): Boolean
    updatePresence(status: String!): UserPresence
    likePost(postId: ID!): Post
  }
  
  type Subscription {
    messageSent(chatId: ID!): Message
    notificationReceived: Notification
    userTyping(chatId: ID!): TypingIndicator
    userPresenceChanged(userId: ID): UserPresence
    postLiked(postId: ID!): Post
  }
`;

const schema = buildSchema(typeDefs);

/**
 * Chat Service with Subscriptions
 */
class ChatService {
  constructor(publisher) {
    this.publisher = publisher;
  }

  /**
   * Subscribe to messages in a chat
   */
  @Subscribe({
    topic: 'message.sent',
    filter: (payload, variables) => payload.chatId === variables.chatId
  })
  async messageSent(payload, variables, context) {
    console.log(`📨 Message sent to chat ${payload.chatId} by ${payload.username}`);
    return { messageSent: payload };
  }

  /**
   * Subscribe to typing indicators
   */
  @Subscribe({
    topic: 'user.typing',
    filter: (payload, variables) => payload.chatId === variables.chatId
  })
  async userTyping(payload, variables, context) {
    // Don't send typing indicator to the user who is typing
    if (payload.userId === context.userId) {
      return null;
    }
    
    console.log(`✍️  ${payload.username} is ${payload.isTyping ? 'typing' : 'not typing'} in chat ${payload.chatId}`);
    return { userTyping: payload };
  }

  /**
   * Send message mutation
   */
  async sendMessage(chatId, text, context) {
    const message = {
      id: Date.now().toString(),
      chatId,
      userId: context.userId,
      username: context.username || 'Anonymous',
      text,
      createdAt: new Date().toISOString()
    };

    // Publish to PubSub
    await this.publisher.publish('message.sent', message);

    return message;
  }

  /**
   * Set typing indicator mutation
   */
  async setTyping(chatId, isTyping, context) {
    await this.publisher.publish('user.typing', {
      chatId,
      userId: context.userId,
      username: context.username || 'Anonymous',
      isTyping
    });

    return true;
  }
}

/**
 * Notification Service
 */
class NotificationService {
  constructor(publisher) {
    this.publisher = publisher;
  }

  /**
   * Subscribe to user's notifications
   */
  @Subscribe({
    topic: 'notification.created',
    filter: (payload, variables, context) => payload.userId === context.userId,
    requireAuth: true
  })
  async notificationReceived(payload, variables, context) {
    console.log(`🔔 Notification for user ${payload.userId}: ${payload.title}`);
    return { notificationReceived: payload };
  }

  /**
   * Create notification mutation
   */
  async createNotification(userId, type, title, message) {
    const notification = {
      id: Date.now().toString(),
      userId,
      type,
      title,
      message,
      read: false,
      createdAt: new Date().toISOString()
    };

    await this.publisher.publish('notification.created', notification);

    return notification;
  }
}

/**
 * Presence Service
 */
class PresenceService {
  constructor(publisher) {
    this.publisher = publisher;
  }

  /**
   * Subscribe to user presence changes
   */
  @Subscribe({
    topic: 'presence.changed',
    filter: (payload, variables) => {
      // If userId specified, only send updates for that user
      if (variables.userId) {
        return payload.userId === variables.userId;
      }
      return true;
    }
  })
  async userPresenceChanged(payload, variables, context) {
    console.log(`👤 ${payload.username} is now ${payload.status}`);
    return { userPresenceChanged: payload };
  }

  /**
   * Update presence mutation
   */
  async updatePresence(status, context) {
    const presence = {
      userId: context.userId,
      username: context.username || 'Anonymous',
      status, // online, away, offline
      lastSeen: new Date().toISOString()
    };

    await this.publisher.publish('presence.changed', presence);

    return presence;
  }
}

/**
 * Post Service
 */
class PostService {
  constructor(publisher) {
    this.publisher = publisher;
    this.posts = new Map();
  }

  /**
   * Subscribe to post likes
   */
  @Subscribe({
    topic: 'post.liked',
    filter: (payload, variables) => payload.id === variables.postId
  })
  async postLiked(payload, variables, context) {
    console.log(`❤️  Post ${payload.id} liked! Total: ${payload.likes}`);
    return { postLiked: payload };
  }

  /**
   * Like post mutation
   */
  async likePost(postId) {
    let post = this.posts.get(postId);
    
    if (!post) {
      post = {
        id: postId,
        authorId: '1',
        title: 'Sample Post',
        content: 'This is a sample post',
        likes: 0,
        updatedAt: new Date().toISOString()
      };
    }

    post.likes++;
    post.updatedAt = new Date().toISOString();
    this.posts.set(postId, post);

    await this.publisher.publish('post.liked', post);

    return post;
  }
}

/**
 * Main Demo
 */
async function runDemo() {
  console.log('🚀 WebSocket Subscriptions Demo (uWebSockets.js)\n');

  // Create subscription manager with uWebSockets.js
  const subscriptionManager = new SubscriptionManager({
    transport: 'uwebsockets',
    transportOptions: {
      port: 4000,
      path: '/graphql',
      compression: true,
      maxPayloadLength: 16 * 1024 * 1024,
      idleTimeout: 120
    },
    pubsub: 'memory', // Change to 'redis' for production
    pubsubOptions: {
      // Redis options:
      // url: 'redis://localhost:6379'
    },
    schema,
    authenticate: async (connectionParams) => {
      // Authenticate user from connection params
      const token = connectionParams?.token || connectionParams?.authorization;
      
      if (!token) {
        // For demo, allow unauthenticated
        return {
          userId: `user_${Date.now()}`,
          username: connectionParams?.username || 'Guest',
          roles: ['user']
        };
      }

      // In production, verify JWT token here
      return {
        userId: 'authenticated_user',
        username: 'John Doe',
        roles: ['user', 'admin']
      };
    },
    onConnect: (connection) => {
      console.log(`✓ Client connected: ${connection.id} (${connection.context.username})`);
    },
    onDisconnect: (connection) => {
      console.log(`✗ Client disconnected: ${connection.id}`);
    }
  });

  // Create publisher
  const publisher = new SubscriptionPublisher(subscriptionManager);

  // Create services
  const chatService = new ChatService(publisher);
  const notificationService = new NotificationService(publisher);
  const presenceService = new PresenceService(publisher);
  const postService = new PostService(publisher);

  // Generate subscription resolvers
  const subscriptionResolvers = {
    ...generateSubscriptionResolvers(subscriptionManager, chatService),
    ...generateSubscriptionResolvers(subscriptionManager, notificationService),
    ...generateSubscriptionResolvers(subscriptionManager, presenceService),
    ...generateSubscriptionResolvers(subscriptionManager, postService)
  };

  // Create mutation resolvers
  const mutationResolvers = {
    sendMessage: (root, { chatId, text }, context) => 
      chatService.sendMessage(chatId, text, context),
    createNotification: (root, { userId, type, title, message }) =>
      notificationService.createNotification(userId, type, title, message),
    setTyping: (root, { chatId, isTyping }, context) =>
      chatService.setTyping(chatId, isTyping, context),
    updatePresence: (root, { status }, context) =>
      presenceService.updatePresence(status, context),
    likePost: (root, { postId }) =>
      postService.likePost(postId)
  };

  // Set resolvers on schema
  schema._subscriptionType = subscriptionResolvers;
  schema._mutationType = mutationResolvers;
  schema._queryType = {
    hello: () => 'Hello from WebSocket Subscriptions Demo!'
  };

  // Start subscription manager
  await subscriptionManager.start();

  console.log('\n📡 WebSocket server running on ws://localhost:4000/graphql\n');
  console.log('Connection info:');
  console.log('  URL: ws://localhost:4000/graphql');
  console.log('  Protocol: graphql-transport-ws');
  console.log('  Connection params: { "username": "YourName" }\n');

  // Demo: Simulate events
  console.log('📋 Simulating events every 10 seconds...\n');

  let messageCounter = 1;
  let notificationCounter = 1;

  setInterval(async () => {
    // Send random message
    await publisher.publish('message.sent', {
      id: messageCounter.toString(),
      chatId: 'chat1',
      userId: 'bot',
      username: 'Demo Bot',
      text: `This is demo message #${messageCounter}`,
      createdAt: new Date().toISOString()
    });

    messageCounter++;
  }, 10000);

  setInterval(async () => {
    // Create notification
    await publisher.publishToUser('user1', 'notification', {
      id: notificationCounter.toString(),
      userId: 'user1',
      type: 'info',
      title: 'Demo Notification',
      message: `This is demo notification #${notificationCounter}`,
      read: false,
      createdAt: new Date().toISOString()
    });

    notificationCounter++;
  }, 15000);

  setInterval(async () => {
    // Update presence
    const statuses = ['online', 'away', 'busy'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    await publisher.publish('presence.changed', {
      userId: 'demo_user',
      username: 'Demo User',
      status,
      lastSeen: new Date().toISOString()
    });
  }, 20000);

  // Print statistics
  setInterval(() => {
    const stats = subscriptionManager.getStats();
    console.log(`\n📊 Stats: ${stats.connections} connections, ${stats.subscriptions} subscriptions`);
  }, 30000);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down...');
    await subscriptionManager.stop();
    process.exit(0);
  });
}

// Run demo
runDemo().catch(console.error);
