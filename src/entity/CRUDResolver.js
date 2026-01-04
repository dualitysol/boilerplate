/**
 * Auto-generated CRUD Resolvers
 * 
 * Automatically creates resolvers based on entity metadata
 */

import { getRegisteredEntities } from './Entity.js';

/**
 * Generate CRUD resolvers for entity
 */
export class CRUDResolverGenerator {
  constructor(entity, model) {
    this.entity = entity;
    this.model = model;
  }
  
  /**
   * Generate all resolvers
   */
  generateResolvers() {
    const resolvers = {
      Query: {},
      Mutation: {}
    };
    
    // Read single
    if (this.entity.crud.includes('read')) {
      const queryName = this.entity.name.toLowerCase();
      resolvers.Query[queryName] = this.createReadResolver();
    }
    
    // List
    if (this.entity.crud.includes('list')) {
      const listName = this.entity.name.toLowerCase() + 's';
      const countName = this.entity.name.toLowerCase() + 'sCount';
      
      resolvers.Query[listName] = this.createListResolver();
      resolvers.Query[countName] = this.createCountResolver();
    }
    
    // Create
    if (this.entity.crud.includes('create')) {
      const mutationName = 'create' + this.entity.name;
      resolvers.Mutation[mutationName] = this.createCreateResolver();
    }
    
    // Update
    if (this.entity.crud.includes('update')) {
      const mutationName = 'update' + this.entity.name;
      resolvers.Mutation[mutationName] = this.createUpdateResolver();
    }
    
    // Delete
    if (this.entity.crud.includes('delete')) {
      const mutationName = 'delete' + this.entity.name;
      resolvers.Mutation[mutationName] = this.createDeleteResolver();
    }
    
    // Type resolver (for relations)
    resolvers[this.entity.name] = this.createTypeResolver();
    
    return resolvers;
  }
  
  /**
   * Create read resolver (get single by ID)
   */
  createReadResolver() {
    const self = this;
    
    return async function(parent, { id }, context) {
      const query = { _id: id };
      
      // Soft delete filter
      if (self.entity.softDelete) {
        query.deletedAt = null;
      }
      
      // Execute hooks
      await self.executeHooks('beforeRead', { id, context });
      
      const result = await self.model.findOne(query);
      
      if (!result) {
        throw new Error(`${self.entity.name} not found: ${id}`);
      }
      
      // Execute hooks
      await self.executeHooks('afterRead', { result, context });
      
      return result;
    };
  }
  
  /**
   * Create list resolver (with filtering, pagination)
   */
  createListResolver() {
    const self = this;
    
    return async function(parent, { filter = {}, limit = 100, offset = 0 }, context) {
      const query = self.buildQuery(filter);
      
      // Soft delete filter
      if (self.entity.softDelete) {
        query.deletedAt = null;
      }
      
      // Execute hooks
      await self.executeHooks('beforeList', { filter, context });
      
      const results = await self.model
        .find(query)
        .limit(limit)
        .skip(offset)
        .toArray();
      
      // Execute hooks
      await self.executeHooks('afterList', { results, context });
      
      return results;
    };
  }
  
  /**
   * Create count resolver
   */
  createCountResolver() {
    const self = this;
    
    return async function(parent, { filter = {} }, context) {
      const query = self.buildQuery(filter);
      
      // Soft delete filter
      if (self.entity.softDelete) {
        query.deletedAt = null;
      }
      
      const count = await self.model.countDocuments(query);
      
      return count;
    };
  }
  
  /**
   * Create create resolver
   */
  createCreateResolver() {
    const self = this;
    
    return async function(parent, { input }, context) {
      // Set auto fields
      const data = { ...input };
      
      for (const field of self.entity.fields) {
        if (field.options.auto === 'createdAt' || field.options.auto === 'updatedAt') {
          data[field.name] = new Date();
        }
        
        // Set defaults
        if (field.options.default !== undefined && data[field.name] === undefined) {
          data[field.name] = typeof field.options.default === 'function' 
            ? field.options.default() 
            : field.options.default;
        }
      }
      
      // Execute hooks
      await self.executeHooks('beforeCreate', { data, context });
      
      // Validate
      self.validate(data, 'create');
      
      const result = await self.model.insertOne(data);
      const created = await self.model.findOne({ _id: result.insertedId });
      
      // Execute hooks
      await self.executeHooks('afterCreate', { result: created, context });
      
      return created;
    };
  }
  
  /**
   * Create update resolver
   */
  createUpdateResolver() {
    const self = this;
    
    return async function(parent, { id, input }, context) {
      // Set auto fields
      const data = { ...input };
      
      for (const field of self.entity.fields) {
        if (field.options.auto === 'updatedAt') {
          data[field.name] = new Date();
        }
      }
      
      const query = { _id: id };
      
      // Soft delete filter
      if (self.entity.softDelete) {
        query.deletedAt = null;
      }
      
      // Execute hooks
      await self.executeHooks('beforeUpdate', { id, data, context });
      
      // Validate
      self.validate(data, 'update');
      
      const result = await self.model.updateOne(query, { $set: data });
      
      if (result.matchedCount === 0) {
        throw new Error(`${self.entity.name} not found: ${id}`);
      }
      
      const updated = await self.model.findOne({ _id: id });
      
      // Execute hooks
      await self.executeHooks('afterUpdate', { result: updated, context });
      
      return updated;
    };
  }
  
  /**
   * Create delete resolver
   */
  createDeleteResolver() {
    const self = this;
    
    return async function(parent, { id }, context) {
      const query = { _id: id };
      
      // Execute hooks
      await self.executeHooks('beforeDelete', { id, context });
      
      let result;
      
      if (self.entity.softDelete) {
        // Soft delete
        result = await self.model.updateOne(query, { 
          $set: { deletedAt: new Date() } 
        });
      } else {
        // Hard delete
        result = await self.model.deleteOne(query);
      }
      
      if (result.matchedCount === 0 && result.deletedCount === 0) {
        throw new Error(`${self.entity.name} not found: ${id}`);
      }
      
      // Execute hooks
      await self.executeHooks('afterDelete', { id, context });
      
      return true;
    };
  }
  
  /**
   * Create type resolver (for relations and computed fields)
   */
  createTypeResolver() {
    const self = this;
    const typeResolver = {};
    
    // Relation resolvers
    for (const relation of self.entity.relations) {
      typeResolver[relation.name] = async function(parent, args, context) {
        const targetEntity = self.getTargetEntity(relation.targetEntity);
        
        if (!targetEntity || !targetEntity.model) {
          throw new Error(`Target entity not found: ${relation.targetEntity}`);
        }
        
        const query = {};
        
        if (relation.type === 'one-to-one' || relation.type === 'many-to-one') {
          // Load single related entity
          query._id = parent[relation.foreignKey];
          return await targetEntity.model.findOne(query);
        } else if (relation.type === 'one-to-many') {
          // Load multiple related entities
          query[relation.foreignKey] = parent._id;
          return await targetEntity.model.find(query).toArray();
        } else if (relation.type === 'many-to-many') {
          // Load via junction table
          const ids = parent[relation.name + 'Ids'] || [];
          query._id = { $in: ids };
          return await targetEntity.model.find(query).toArray();
        }
      };
    }
    
    return typeResolver;
  }
  
  /**
   * Build MongoDB query from filter
   */
  buildQuery(filter) {
    const query = {};
    
    for (const [key, value] of Object.entries(filter)) {
      // Handle comparison operators
      if (key.endsWith('_ne')) {
        const field = key.replace('_ne', '');
        query[field] = { $ne: value };
      } else if (key.endsWith('_gt')) {
        const field = key.replace('_gt', '');
        query[field] = { ...query[field], $gt: value };
      } else if (key.endsWith('_gte')) {
        const field = key.replace('_gte', '');
        query[field] = { ...query[field], $gte: value };
      } else if (key.endsWith('_lt')) {
        const field = key.replace('_lt', '');
        query[field] = { ...query[field], $lt: value };
      } else if (key.endsWith('_lte')) {
        const field = key.replace('_lte', '');
        query[field] = { ...query[field], $lte: value };
      } else if (key.endsWith('_contains')) {
        const field = key.replace('_contains', '');
        query[field] = { $regex: value, $options: 'i' };
      } else if (key.endsWith('_startsWith')) {
        const field = key.replace('_startsWith', '');
        query[field] = { $regex: '^' + value, $options: 'i' };
      } else if (key.endsWith('_endsWith')) {
        const field = key.replace('_endsWith', '');
        query[field] = { $regex: value + '$', $options: 'i' };
      } else {
        query[key] = value;
      }
    }
    
    return query;
  }
  
  /**
   * Validate data against entity schema
   */
  validate(data, mode) {
    const errors = [];
    
    for (const field of this.entity.fields) {
      const value = data[field.name];
      
      // Required validation
      if (mode === 'create' && field.options.required && value === undefined && field.options.default === undefined) {
        errors.push(`Field '${field.name}' is required`);
      }
      
      if (value !== undefined) {
        // Type validation
        if (!this.validateType(value, field.type)) {
          errors.push(`Field '${field.name}' has invalid type`);
        }
        
        // String validations
        if (field.type === String) {
          if (field.options.minLength && value.length < field.options.minLength) {
            errors.push(`Field '${field.name}' must be at least ${field.options.minLength} characters`);
          }
          if (field.options.maxLength && value.length > field.options.maxLength) {
            errors.push(`Field '${field.name}' must be at most ${field.options.maxLength} characters`);
          }
          if (field.options.pattern && !new RegExp(field.options.pattern).test(value)) {
            errors.push(`Field '${field.name}' does not match pattern`);
          }
        }
        
        // Number validations
        if (field.type === Int || field.type === Float) {
          if (field.options.min !== undefined && value < field.options.min) {
            errors.push(`Field '${field.name}' must be at least ${field.options.min}`);
          }
          if (field.options.max !== undefined && value > field.options.max) {
            errors.push(`Field '${field.name}' must be at most ${field.options.max}`);
          }
        }
        
        // Enum validation
        if (field.options.enum && !field.options.enum.includes(value)) {
          errors.push(`Field '${field.name}' must be one of: ${field.options.enum.join(', ')}`);
        }
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Validation failed:\n${errors.join('\n')}`);
    }
  }
  
  /**
   * Validate value type
   */
  validateType(value, type) {
    if (type === String) return typeof value === 'string';
    if (type === Int || type === Float) return typeof value === 'number';
    if (type === Boolean) return typeof value === 'boolean';
    if (type === DateTime) return value instanceof Date || typeof value === 'string';
    if (type === JSON) return true;
    return true;
  }
  
  /**
   * Execute entity hooks
   */
  async executeHooks(event, data) {
    const hooks = this.entity.hooks[event] || [];
    
    for (const hook of hooks) {
      await hook(data);
    }
  }
  
  /**
   * Get target entity for relation
   */
  getTargetEntity(entityName) {
    const entities = getRegisteredEntities();
    return entities.find(e => e.name === entityName);
  }
}

/**
 * Generate resolvers for all entities
 */
export function generateAllResolvers(models = {}) {
  const entities = getRegisteredEntities();
  const allResolvers = {
    Query: {},
    Mutation: {}
  };
  
  for (const entity of entities) {
    if (!entity.graphql) continue;
    
    const model = models[entity.name];
    if (!model) {
      console.warn(`No model provided for entity: ${entity.name}`);
      continue;
    }
    
    // Attach model to entity for relation resolvers
    entity.model = model;
    
    const generator = new CRUDResolverGenerator(entity, model);
    const resolvers = generator.generateResolvers();
    
    // Merge resolvers
    Object.assign(allResolvers.Query, resolvers.Query);
    Object.assign(allResolvers.Mutation, resolvers.Mutation);
    allResolvers[entity.name] = resolvers[entity.name];
  }
  
  return allResolvers;
}

export default {
  CRUDResolverGenerator,
  generateAllResolvers
};
