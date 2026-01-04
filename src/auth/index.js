/**
 * Advanced Authentication System
 * 
 * Complete authentication solution with JWT, OAuth2, and Sessions
 */

export {
  JWTAuth,
  createJWTMiddleware
} from './JWTAuth.js';

export {
  OAuth2Client
} from './OAuth2Client.js';

export {
  SessionManager,
  createSessionMiddleware,
  MemorySessionStorage,
  RedisSessionStorage
} from './SessionManager.js';

import { JWTAuth, createJWTMiddleware } from './JWTAuth.js';
import { OAuth2Client } from './OAuth2Client.js';
import { SessionManager, createSessionMiddleware } from './SessionManager.js';

export default {
  JWTAuth,
  createJWTMiddleware,
  OAuth2Client,
  SessionManager,
  createSessionMiddleware
};
