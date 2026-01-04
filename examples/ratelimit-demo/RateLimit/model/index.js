/**
 * RateLimit Model and Utilities
 */

export class RateLimitConfig {
  static PUBLIC_API = {
    points: 10,
    duration: 60, // 1 minute
    blockDuration: 300 // 5 minutes
  };
  
  static USER_API = {
    points: 100,
    duration: 60
  };
  
  static ADMIN_API = {
    points: 1000,
    duration: 60
  };
  
  static EXPENSIVE_OPERATION = {
    points: 2,
    duration: 60,
    blockDuration: 120
  };
}

export const formatRateLimitInfo = (info) => {
  if (!info) return null;
  
  return {
    allowed: info.allowed,
    remaining: info.remaining,
    total: info.total,
    resetAt: info.resetAt?.toISOString(),
    retryAfter: info.retryAfter
  };
};

export const getRateLimitKey = (context, type = 'default') => {
  if (type === 'ip') {
    return context.ip || 'unknown';
  }
  
  if (type === 'user') {
    return context.userId || context.user?.id || 'anonymous';
  }
  
  if (type === 'global') {
    return 'global';
  }
  
  // Default: combine user and IP
  const userId = context.userId || context.user?.id || 'anonymous';
  const ip = context.ip || 'unknown';
  return `${userId}:${ip}`;
};
