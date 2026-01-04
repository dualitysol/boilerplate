/**
 * Subscription Decorators
 * 
 * Decorators for defining GraphQL subscriptions with automatic PubSub integration
 * 
 * @example
 * class NotificationService {
 *   @Subscribe({
 *     topic: 'notification.created',
 *     filter: (payload, variables, context) => payload.userId === context.userId
 *   })
 *   async onNotificationCreated(payload, variables, context) {
 *     return {
 *       notificationCreated: payload
 *     };
 *   }
 * }
 */

import 'reflect-metadata';

const SUBSCRIPTION_METADATA_KEY = Symbol('subscription');

/**
 * @Subscribe decorator
 * Define a GraphQL subscription resolver
 * 
 * @example
 * @Subscribe({ topic: 'message.sent', filter: (payload, vars) => payload.chatId === vars.chatId })
 * async onMessageSent(payload, variables, context) {
 *   return { messageSent: payload };
 * }
 */
export function Subscribe(options = {}) {
  return function(target, propertyKey, descriptor) {
    const metadata = {
      topic: options.topic,
      topics: options.topics || (options.topic ? [options.topic] : []),
      filter: options.filter || null,
      transform: options.transform || null,
      requireAuth: options.requireAuth !== false,
      roles: options.roles || null,
      debounce: options.debounce || 0,
      throttle: options.throttle || 0
    };
    
    Reflect.defineMetadata(
      SUBSCRIPTION_METADATA_KEY,
      metadata,
      target,
      propertyKey
    );
    
    return descriptor;
  };
}

/**
 * Get subscription metadata
 */
export function getSubscriptionMetadata(target, propertyKey) {
  return Reflect.getMetadata(SUBSCRIPTION_METADATA_KEY, target, propertyKey);
}

/**
 * Create subscription resolver from decorated method
 */
export function createSubscriptionResolver(subscriptionManager, service, methodName) {
  const method = service[methodName];
  const metadata = getSubscriptionMetadata(service, methodName);
  
  if (!metadata) {
    throw new Error(`No subscription metadata found for ${methodName}`);
  }
  
  return {
    subscribe: async (root, variables, context, info) => {
      // Check authentication
      if (metadata.requireAuth && !context.userId) {
        throw new Error('Authentication required');
      }
      
      // Check authorization
      if (metadata.roles && !hasRole(context, metadata.roles)) {
        throw new Error('Insufficient permissions');
      }
      
      // Create async iterator
      return createAsyncIterator(
        subscriptionManager,
        metadata.topics,
        {
          filter: (payload) => {
            if (!metadata.filter) {
              return true;
            }
            return metadata.filter(payload, variables, context);
          },
          transform: async (payload) => {
            if (metadata.transform) {
              payload = await metadata.transform(payload, variables, context);
            }
            
            // Call decorated method
            return await method.call(service, payload, variables, context, info);
          }
        }
      );
    }
  };
}

/**
 * Create async iterator for subscription
 */
async function* createAsyncIterator(subscriptionManager, topics, options = {}) {
  const queue = [];
  const waiting = [];
  let subscriptionIds = [];
  let closed = false;
  
  // Subscribe to topics
  for (const topic of topics) {
    const subId = await subscriptionManager.subscribeTopic(topic, async (payload) => {
      // Apply filter
      if (options.filter && !options.filter(payload)) {
        return;
      }
      
      // Transform payload
      let transformedPayload = payload;
      if (options.transform) {
        transformedPayload = await options.transform(payload);
      }
      
      // Add to queue
      queue.push(transformedPayload);
      
      // Resolve waiting promise
      if (waiting.length > 0) {
        const resolve = waiting.shift();
        resolve();
      }
    });
    
    subscriptionIds.push(subId);
  }
  
  try {
    while (!closed) {
      if (queue.length > 0) {
        yield queue.shift();
      } else {
        // Wait for next message
        await new Promise(resolve => waiting.push(resolve));
      }
    }
  } finally {
    // Cleanup: Unsubscribe from all topics
    for (const subId of subscriptionIds) {
      await subscriptionManager.unsubscribeTopic(subId);
    }
  }
}

/**
 * Check if user has required role
 */
function hasRole(context, requiredRoles) {
  if (!context.roles || !Array.isArray(context.roles)) {
    return false;
  }
  
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  return roles.some(role => context.roles.includes(role));
}

/**
 * Create subscription type definitions from decorated class
 */
export function generateSubscriptionTypeDefs(service) {
  const typeDefs = [];
  const prototype = Object.getPrototypeOf(service);
  const methodNames = Object.getOwnPropertyNames(prototype);
  
  for (const methodName of methodNames) {
    const metadata = getSubscriptionMetadata(service, methodName);
    
    if (metadata) {
      // Generate subscription field
      // This is simplified - in practice, you'd need more type information
      typeDefs.push(`${methodName}: Subscription`);
    }
  }
  
  if (typeDefs.length > 0) {
    return `
      type Subscription {
        ${typeDefs.join('\n    ')}
      }
    `;
  }
  
  return '';
}

/**
 * Create subscription resolvers from decorated class
 */
export function generateSubscriptionResolvers(subscriptionManager, service) {
  const resolvers = {};
  const prototype = Object.getPrototypeOf(service);
  const methodNames = Object.getOwnPropertyNames(prototype);
  
  for (const methodName of methodNames) {
    const metadata = getSubscriptionMetadata(service, methodName);
    
    if (metadata) {
      resolvers[methodName] = createSubscriptionResolver(
        subscriptionManager,
        service,
        methodName
      );
    }
  }
  
  return resolvers;
}

/**
 * @WithSubscriptionFilter decorator
 * Add custom filter to subscription
 */
export function WithSubscriptionFilter(filterFn) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(payload, variables, context, info) {
      if (!await filterFn(payload, variables, context)) {
        return null;
      }
      
      return await originalMethod.call(this, payload, variables, context, info);
    };
    
    return descriptor;
  };
}

/**
 * @Debounce decorator
 * Debounce subscription events
 */
export function Debounce(wait = 1000) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    const timers = new Map();
    
    descriptor.value = async function(payload, variables, context, info) {
      const key = JSON.stringify(variables);
      
      if (timers.has(key)) {
        clearTimeout(timers.get(key));
      }
      
      return new Promise((resolve) => {
        const timer = setTimeout(async () => {
          timers.delete(key);
          const result = await originalMethod.call(this, payload, variables, context, info);
          resolve(result);
        }, wait);
        
        timers.set(key, timer);
      });
    };
    
    return descriptor;
  };
}

/**
 * @Throttle decorator
 * Throttle subscription events
 */
export function Throttle(wait = 1000) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    const lastExecuted = new Map();
    
    descriptor.value = async function(payload, variables, context, info) {
      const key = JSON.stringify(variables);
      const now = Date.now();
      const last = lastExecuted.get(key) || 0;
      
      if (now - last < wait) {
        return null; // Skip this event
      }
      
      lastExecuted.set(key, now);
      return await originalMethod.call(this, payload, variables, context, info);
    };
    
    return descriptor;
  };
}

/**
 * Helper to publish events
 */
export class SubscriptionPublisher {
  constructor(subscriptionManager) {
    this.manager = subscriptionManager;
  }

  async publish(topic, payload) {
    return await this.manager.publish(topic, payload);
  }

  async publishMultiple(topics, payload) {
    const promises = topics.map(topic => this.publish(topic, payload));
    return await Promise.all(promises);
  }

  /**
   * Publish with delay
   */
  async publishDelayed(topic, payload, delay) {
    return new Promise((resolve) => {
      setTimeout(async () => {
        await this.publish(topic, payload);
        resolve();
      }, delay);
    });
  }

  /**
   * Publish to user-specific topic
   */
  async publishToUser(userId, event, payload) {
    const topic = `user.${userId}.${event}`;
    return await this.publish(topic, payload);
  }

  /**
   * Publish to room/channel
   */
  async publishToRoom(roomId, event, payload) {
    const topic = `room.${roomId}.${event}`;
    return await this.publish(topic, payload);
  }

  /**
   * Batch publish
   */
  async publishBatch(events) {
    const promises = events.map(({ topic, payload }) => 
      this.publish(topic, payload)
    );
    return await Promise.all(promises);
  }
}

export default {
  Subscribe,
  WithSubscriptionFilter,
  Debounce,
  Throttle,
  getSubscriptionMetadata,
  createSubscriptionResolver,
  generateSubscriptionTypeDefs,
  generateSubscriptionResolvers,
  SubscriptionPublisher
};
