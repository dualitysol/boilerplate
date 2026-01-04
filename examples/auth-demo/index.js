/**
 * Auth Demo
 * 
 * Demonstrates:
 * - JWT authentication (access + refresh tokens)
 * - OAuth2 authentication (Google, GitHub, etc.)
 * - Session management
 * - Token rotation
 * - Token revocation
 * - PKCE flow
 */

import { Microservice } from '@dualitysol/boilerplate';
import { JWTAuth, OAuth2Client, SessionManager } from '@dualitysol/boilerplate/auth';
import { 
  typeDefinitions,
  queryMutations,
  UserService
} from './Auth/index.js';

// Initialize microservice
const app = new Microservice({
  name: 'auth-demo',
  version: '1.0.0',
  
  transport: {
    type: 'http',
    port: 4002
  },
  
  graphql: {
    enabled: true,
    playground: true
  }
});

// Create user storage
const userStorage = new Map();

// Initialize JWT Auth
const jwtAuth = new JWTAuth({
  accessSecret: 'demo-access-secret-change-in-production',
  refreshSecret: 'demo-refresh-secret-change-in-production',
  accessExpiry: '15m',
  refreshExpiry: '7d'
});

// Initialize OAuth2 (example with GitHub)
const oauth2 = new OAuth2Client({
  clientId: process.env.OAUTH2_CLIENT_ID || 'demo-client-id',
  clientSecret: process.env.OAUTH2_CLIENT_SECRET || 'demo-client-secret',
  redirectUri: 'http://localhost:4002/oauth/callback',
  authorizationUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  userInfoUrl: 'https://api.github.com/user'
});

// Initialize Session Manager
const sessionManager = new SessionManager({
  storage: 'memory',
  ttl: 3600, // 1 hour
  sliding: true,
  fingerprint: true
});

// Register services
app.registerService('UserService', new UserService(userStorage));
app.registerService('AuthService', jwtAuth);
app.registerService('OAuth2Service', oauth2);
app.registerService('SessionService', sessionManager);

// Register GraphQL schema and resolvers
app.registerGraphQL({
  typeDefs: typeDefinitions,
  resolvers: queryMutations
});

// Add auth middleware
app.use(async (req, res, next) => {
  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const token = jwtAuth.extractFromHeader(authHeader);
    
    if (token) {
      try {
        const payload = await jwtAuth.verifyAccessToken(token);
        const userService = app.getService('UserService');
        req.user = await userService.getUserById(payload.userId);
      } catch (error) {
        // Invalid token, continue without user
        console.log('Invalid token:', error.message);
      }
    }
  }
  
  next();
});

// Start server
await app.start();

console.log('🚀 Auth Demo running!');
console.log('📊 GraphQL Playground: http://localhost:4002/graphql');
console.log('');
console.log('Authentication Methods:');
console.log('  ✅ JWT (access + refresh tokens)');
console.log('  ✅ OAuth2 (GitHub, Google, etc.)');
console.log('  ✅ Session-based auth');
console.log('');
console.log('Try these mutations:');
console.log('');
console.log('# Register');
console.log('mutation {');
console.log('  register(input: {');
console.log('    email: "user@example.com"');
console.log('    password: "password123"');
console.log('    name: "John Doe"');
console.log('  }) {');
console.log('    success');
console.log('    message');
console.log('    user { id email name role }');
console.log('    tokens { accessToken refreshToken expiresIn }');
console.log('  }');
console.log('}');
console.log('');
console.log('# Login');
console.log('mutation {');
console.log('  login(input: {');
console.log('    email: "user@example.com"');
console.log('    password: "password123"');
console.log('  }) {');
console.log('    success');
console.log('    user { id email name }');
console.log('    tokens { accessToken refreshToken }');
console.log('  }');
console.log('}');
console.log('');
console.log('# Get current user (with Authorization header)');
console.log('query {');
console.log('  me {');
console.log('    id');
console.log('    email');
console.log('    name');
console.log('    role');
console.log('  }');
console.log('}');
console.log('');
console.log('# Refresh token');
console.log('mutation {');
console.log('  refreshToken(refreshToken: "your-refresh-token") {');
console.log('    success');
console.log('    tokens { accessToken refreshToken }');
console.log('  }');
console.log('}');
