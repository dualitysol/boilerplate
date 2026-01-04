/**
 * Audit Service Entry Point
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import queries from './resolvers/queries.js';
import mutations from './resolvers/mutations.js';
import { 
  AuditActions, 
  ResourceTypes, 
  formatAuditLog,
  createAuditContext,
  ComplianceFilters
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

// Audit Service Wrapper
export class AuditService {
  constructor(auditLogger) {
    this.auditLogger = auditLogger;
  }
  
  async log(params) {
    return await this.auditLogger.log(params);
  }
  
  async logCreate(params) {
    return await this.auditLogger.logCreate(params);
  }
  
  async logUpdate(params) {
    return await this.auditLogger.logUpdate(params);
  }
  
  async logDelete(params) {
    return await this.auditLogger.logDelete(params);
  }
  
  async query(filter, options) {
    return await this.auditLogger.query(filter, options);
  }
  
  async count(filter) {
    return await this.auditLogger.count(filter);
  }
  
  async export(filter, options) {
    return await this.auditLogger.export(filter, options);
  }
  
  async getResourceHistory(resourceType, resourceId, options) {
    return await this.auditLogger.getResourceHistory(resourceType, resourceId, options);
  }
  
  async getUserActivity(userId, options) {
    return await this.auditLogger.getUserActivity(userId, options);
  }
  
  async getRecentActivity(limit) {
    return await this.auditLogger.getRecentActivity(limit);
  }
}

export { AuditActions, ResourceTypes, ComplianceFilters };

export default {
  typeDefinitions,
  queryMutations,
  AuditService,
  AuditActions,
  ResourceTypes,
  ComplianceFilters
};
