/**
 * RateLimit Query Resolvers
 */

export default {
  async publicData(_, { key }, context) {
    const { services, rateLimitInfo } = context;
    
    return {
      success: true,
      message: `Public data for key: ${key}`,
      timestamp: new Date().toISOString(),
      rateLimit: rateLimitInfo || null
    };
  },
  
  async userData(_, { userId }, context) {
    const { services, rateLimitInfo } = context;
    
    return {
      success: true,
      message: `User data for: ${userId}`,
      timestamp: new Date().toISOString(),
      rateLimit: rateLimitInfo || null
    };
  },
  
  async adminStats(_, __, context) {
    const { services, rateLimitInfo } = context;
    
    return {
      success: true,
      message: 'Admin statistics',
      timestamp: new Date().toISOString(),
      rateLimit: rateLimitInfo || null
    };
  },
  
  async checkRateLimit(_, { identifier }, context) {
    const { services } = context;
    const rateLimiter = services.RateLimiterService;
    
    const info = await rateLimiter.check(identifier, 'default');
    
    return {
      allowed: info.allowed,
      remaining: info.remaining,
      total: info.total,
      resetAt: info.resetAt?.toISOString(),
      retryAfter: info.retryAfter
    };
  }
};
