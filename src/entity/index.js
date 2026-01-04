/**
 * Entity-First Auto-Generation
 * 
 * Export all entity-related functionality
 */

export {
  // Decorators
  Entity,
  Field,
  Relation,
  Index,
  Hook,
  
  // Field types
  ID,
  String,
  Int,
  Float,
  Boolean,
  DateTime,
  JSON,
  Enum,
  
  // Schema generation
  EntitySchemaGenerator,
  
  // Metadata functions
  getEntityMetadata,
  getRegisteredEntities,
  getEntity,
  clearEntityRegistry
} from './Entity.js';

export {
  CRUDResolverGenerator,
  generateAllResolvers
} from './CRUDResolver.js';

// Default export for convenience
import { 
  Entity, Field, Relation, Index, Hook,
  ID, String, Int, Float, Boolean, DateTime, JSON, Enum,
  EntitySchemaGenerator,
  getEntityMetadata, getRegisteredEntities, getEntity, clearEntityRegistry
} from './Entity.js';

import { CRUDResolverGenerator, generateAllResolvers } from './CRUDResolver.js';

export default {
  // Decorators
  Entity, Field, Relation, Index, Hook,
  
  // Types
  ID, String, Int, Float, Boolean, DateTime, JSON, Enum,
  
  // Generators
  EntitySchemaGenerator,
  CRUDResolverGenerator,
  generateAllResolvers,
  
  // Metadata
  getEntityMetadata,
  getRegisteredEntities,
  getEntity,
  clearEntityRegistry
};
