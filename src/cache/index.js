/**
 * Caching Layer
 * 
 * Multi-level caching with Redis and memory storage
 */

export {
  CacheManager,
  MemoryCacheStorage,
  RedisCacheStorage
} from './CacheManager.js';

export {
  Cached,
  Cache,
  CacheInvalidate,
  CacheWarm,
  CacheEvict,
  setGlobalCacheManager,
  getGlobalCacheManager,
  createCacheMiddleware
} from './decorators.js';

import { CacheManager } from './CacheManager.js';
import { 
  Cached, 
  Cache, 
  CacheInvalidate, 
  CacheWarm, 
  CacheEvict,
  setGlobalCacheManager,
  getGlobalCacheManager,
  createCacheMiddleware
} from './decorators.js';

export default {
  CacheManager,
  Cached,
  Cache,
  CacheInvalidate,
  CacheWarm,
  CacheEvict,
  setGlobalCacheManager,
  getGlobalCacheManager,
  createCacheMiddleware
};
