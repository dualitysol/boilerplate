/**
 * Rate Limiting Demo
 * 
 * Demonstrates:
 * - Token bucket rate limiting
 * - Per-IP rate limiting
 * - Per-user rate limiting
 * - Global rate limiting
 * - Custom rate limit configurations
 * - Blocking (temporary bans)
 * - Penalty and reward system
 */

import { Microservice } from '@dualitysol/boilerplate';
import { RateLimiter } from '@dualitysol/boilerplate/ratelimit';
import { 
  typeDefinitions,
  queryMutations,
  RateLimiterService,
  RateLimitConfig 
} from './RateLimit/index.js';

// Initialize microservice
const app = new Microservice({
  name: 'ratelimit-demo',
  version: '1.0.0',
  
  transport: {
    type: 'http',
    port: 4001
  },
  
  graphql: {
    enabled: true,
    playground: true
  }
});

// Create rate limiter with multiple limits
const rateLimiter = new RateLimiter({
  storage: 'memory',
  limits: {
    publicApi: RateLimitConfig.PUBLIC_API,
    userApi: RateLimitConfig.USER_API,
    adminApi: RateLimitConfig.ADMIN_API,
    expensive: RateLimitConfig.EXPENSIVE_OPERATION
  }
});

// Register service
app.registerService('RateLimiterService', new RateLimiterService(rateLimiter));

// Register GraphQL schema and resolvers
app.registerGraphQL({
  typeDefs: typeDefinitions,
  resolvers: queryMutations
});

// Add rate limiting middleware
app.use(async (req, res, next) => {
  // Skip health checks
  if (req.path === '/health' || req.path === '/metrics') {
    return next();
  }
  
  // Determine limit type based on path/user
  let limitType = 'publicApi';
  let identifier = req.ip || 'unknown';
  
  if (req.user?.role === 'admin') {
    limitType = 'adminApi';
    identifier = req.user.id;
  } else if (req.user) {
    limitType = 'userApi';
    identifier = req.user.id;
  }
  
  // Check rate limit
  try {
    const result = await rateLimiter.consume(identifier, 1, limitType);
    
    // Attach info to context
    req.rateLimitInfo = {
      allowed: result.allowed,
      remaining: result.remaining,
      total: result.total,
      resetAt: result.resetAt,
      retryAfter: result.retryAfter
    };
    
    // Add headers
    res.setHeader('X-RateLimit-Limit', result.total);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetAt?.getTime() || 0);
    
    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter);
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter
      });
    }
    
    next();
  } catch (error) {
    console.error('Rate limit error:', error);
    next();
  }
});

// Start server
await app.start();

console.log('🚀 Rate Limiting Demo running!');
console.log('📊 GraphQL Playground: http://localhost:4001/graphql');
console.log('');
console.log('Rate Limits:');
console.log('  Public API:  10 requests/minute  (blocks for 5min after)');
console.log('  User API:    100 requests/minute');
console.log('  Admin API:   1000 requests/minute');
console.log('  Expensive:   2 requests/minute   (blocks for 2min after)');
console.log('');
console.log('Try these queries:');
console.log('');
console.log('# Test public API rate limit');
console.log('query {');
console.log('  publicData(key: "test") {');
console.log('    success');
console.log('    message');
console.log('    rateLimit {');
console.log('      allowed');
console.log('      remaining');
console.log('      total');
console.log('      resetAt');
console.log('    }');
console.log('  }');
console.log('}');
console.log('');
console.log('# Check rate limit status');
console.log('query {');
console.log('  checkRateLimit(identifier: "your-ip") {');
console.log('    allowed');
console.log('    remaining');
console.log('    total');
console.log('    resetAt');
console.log('  }');
console.log('}');
console.log('');
console.log('# Test expensive operation');
console.log('mutation {');
console.log('  processData(input: "large dataset") {');
console.log('    success');
console.log('    message');
console.log('    rateLimit {');
console.log('      remaining');
console.log('      retryAfter');
console.log('    }');
console.log('  }');
console.log('}');
