/**
 * RateLimit Service Entry Point
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import queries from './resolvers/queries.js';
import mutations from './resolvers/mutations.js';
import { RateLimitConfig, formatRateLimitInfo, getRateLimitKey } from './model/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load GraphQL schema
export const typeDefinitions = readFileSync(
  join(__dirname, 'typeDefs', 'schema.graphql'),
  'utf-8'
);

// Export resolvers
export const queryMutations = {
  Query: queries,
  Mutation: mutations
};

// RateLimit Service
export class RateLimiterService {
  constructor(rateLimiter) {
    this.rateLimiter = rateLimiter;
  }
  
  async consume(identifier, points = 1, limitType = 'default') {
    return await this.rateLimiter.consume(identifier, points, limitType);
  }
  
  async check(identifier, limitType = 'default') {
    return await this.rateLimiter.check(identifier, limitType);
  }
  
  async reset(identifier, limitType = 'default') {
    return await this.rateLimiter.reset(identifier, limitType);
  }
  
  async penalty(identifier, points, limitType = 'default') {
    return await this.rateLimiter.penalty(identifier, points, limitType);
  }
  
  async reward(identifier, points, limitType = 'default') {
    return await this.rateLimiter.reward(identifier, points, limitType);
  }
}

export { RateLimitConfig };

export default {
  typeDefinitions,
  queryMutations,
  RateLimiterService,
  RateLimitConfig
};
