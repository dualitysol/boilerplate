/**
 * Auth Service Entry Point
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import queries from './resolvers/queries.js';
import mutations from './resolvers/mutations.js';
import { 
  UserModel, 
  hashPassword, 
  comparePassword,
  validateRegistration 
} from './model/index.js';

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

// User Service
export class UserService {
  constructor(storage) {
    this.storage = storage || new Map();
  }
  
  async createUser(input) {
    validateRegistration(input);
    
    // Check if email exists
    const existing = Array.from(this.storage.values())
      .find(u => u.email === input.email);
    
    if (existing) {
      throw new Error('Email already registered');
    }
    
    const user = new UserModel({
      ...input,
      password: input.password ? hashPassword(input.password) : null
    });
    
    this.storage.set(user.id, user);
    
    return user.toJSON();
  }
  
  async getUserById(id) {
    const user = this.storage.get(id);
    return user ? user.toJSON() : null;
  }
  
  async findByEmail(email) {
    const user = Array.from(this.storage.values())
      .find(u => u.email === email);
    
    return user ? user.toJSON() : null;
  }
  
  async validateCredentials(email, password) {
    const user = Array.from(this.storage.values())
      .find(u => u.email === email);
    
    if (!user || !user.password) {
      return null;
    }
    
    const isValid = comparePassword(password, user.password);
    
    return isValid ? user.toJSON() : null;
  }
}

export default {
  typeDefinitions,
  queryMutations,
  UserService
};
