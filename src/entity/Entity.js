/**
 * Entity-First Auto-Generation System
 * 
 * Define entities once, auto-generate:
 * - GraphQL schema (types, inputs, queries, mutations)
 * - Database schema (MongoDB/PostgreSQL)
 * - TypeScript types
 * - CRUD resolvers
 * - Validation rules
 * 
 * @example
 * ```javascript
 * import { Entity, Field, Relation, ID, String, Int, DateTime } from '@microservice-framework/boilerplate/entity'
 * 
 * @Entity({ 
 *   table: 'users',
 *   graphql: true,
 *   crud: ['create', 'read', 'update', 'delete', 'list']
 * })
 * class User {
 *   @Field(ID, { primaryKey: true })
 *   id
 *   
 *   @Field(String, { 
 *     required: true, 
 *     unique: true,
 *     graphql: { constraint: '@constraint(format: "email")' }
 *   })
 *   email
 *   
 *   @Field(String, { required: true, minLength: 2, maxLength: 100 })
 *   name
 *   
 *   @Field(Int, { default: 0, min: 0 })
 *   age
 *   
 *   @Field(DateTime, { auto: 'createdAt' })
 *   createdAt
 *   
 *   @Relation('Post', { type: 'one-to-many', foreignKey: 'userId' })
 *   posts
 * }
 * ```
 */

import 'reflect-metadata';

// Entity registry - stores all registered entities
const entityRegistry = new Map();

// Field type definitions
export const ID = Symbol('ID');
export const String = Symbol('String');
export const Int = Symbol('Int');
export const Float = Symbol('Float');
export const Boolean = Symbol('Boolean');
export const DateTime = Symbol('DateTime');
export const JSON = Symbol('JSON');
export const Enum = (values) => ({ type: Symbol('Enum'), values });

// Type mappings
const TYPE_MAPPINGS = {
  graphql: {
    [ID]: 'ID',
    [String]: 'String',
    [Int]: 'Int',
    [Float]: 'Float',
    [Boolean]: 'Boolean',
    [DateTime]: 'DateTime',
    [JSON]: 'JSON'
  },
  typescript: {
    [ID]: 'string',
    [String]: 'string',
    [Int]: 'number',
    [Float]: 'number',
    [Boolean]: 'boolean',
    [DateTime]: 'Date',
    [JSON]: 'any'
  },
  mongodb: {
    [ID]: 'ObjectId',
    [String]: 'String',
    [Int]: 'Number',
    [Float]: 'Number',
    [Boolean]: 'Boolean',
    [DateTime]: 'Date',
    [JSON]: 'Mixed'
  },
  postgresql: {
    [ID]: 'UUID',
    [String]: 'VARCHAR',
    [Int]: 'INTEGER',
    [Float]: 'DOUBLE PRECISION',
    [Boolean]: 'BOOLEAN',
    [DateTime]: 'TIMESTAMP',
    [JSON]: 'JSONB'
  }
};

/**
 * @Entity decorator - marks class as entity
 * @param {Object} options - Entity options
 * @param {string} options.table - Table/collection name
 * @param {boolean} options.graphql - Generate GraphQL schema
 * @param {string[]} options.crud - CRUD operations to generate
 * @param {string} options.description - Entity description
 * @param {boolean} options.timestamps - Auto-generate createdAt/updatedAt
 * @param {boolean} options.softDelete - Use soft delete (deletedAt field)
 */
export function Entity(options = {}) {
  return function(target) {
    const entityName = target.name;
    
    const metadata = {
      name: entityName,
      class: target,
      table: options.table || entityName.toLowerCase() + 's',
      graphql: options.graphql !== false, // default true
      crud: options.crud || ['create', 'read', 'update', 'delete', 'list'],
      description: options.description || `${entityName} entity`,
      timestamps: options.timestamps !== false, // default true
      softDelete: options.softDelete || false,
      fields: Reflect.getMetadata('entity:fields', target.prototype) || [],
      relations: Reflect.getMetadata('entity:relations', target.prototype) || [],
      indexes: options.indexes || [],
      hooks: options.hooks || {}
    };
    
    // Add timestamp fields automatically
    if (metadata.timestamps) {
      metadata.fields.push(
        { name: 'createdAt', type: DateTime, options: { auto: 'createdAt', required: true } },
        { name: 'updatedAt', type: DateTime, options: { auto: 'updatedAt', required: true } }
      );
    }
    
    // Add soft delete field
    if (metadata.softDelete) {
      metadata.fields.push(
        { name: 'deletedAt', type: DateTime, options: { nullable: true } }
      );
    }
    
    // Store in registry
    entityRegistry.set(entityName, metadata);
    
    // Store metadata on class
    Reflect.defineMetadata('entity:metadata', metadata, target);
    
    return target;
  };
}

/**
 * @Field decorator - marks property as entity field
 * @param {Symbol|Function} type - Field type (ID, String, Int, etc.)
 * @param {Object} options - Field options
 */
export function Field(type, options = {}) {
  return function(target, propertyKey) {
    const fields = Reflect.getMetadata('entity:fields', target) || [];
    
    // Check if field already exists (from timestamps)
    const existingIndex = fields.findIndex(f => f.name === propertyKey);
    if (existingIndex !== -1) {
      // Update existing field
      fields[existingIndex] = { name: propertyKey, type, options };
    } else {
      // Add new field
      fields.push({ name: propertyKey, type, options });
    }
    
    Reflect.defineMetadata('entity:fields', fields, target);
  };
}

/**
 * @Relation decorator - defines relationship with another entity
 * @param {string} targetEntity - Target entity name
 * @param {Object} options - Relation options
 * @param {string} options.type - 'one-to-one', 'one-to-many', 'many-to-one', 'many-to-many'
 * @param {string} options.foreignKey - Foreign key field name
 * @param {string} options.inverseField - Inverse field name on target entity
 * @param {boolean} options.cascade - Cascade operations
 */
export function Relation(targetEntity, options = {}) {
  return function(target, propertyKey) {
    const relations = Reflect.getMetadata('entity:relations', target) || [];
    
    relations.push({
      name: propertyKey,
      targetEntity,
      type: options.type || 'one-to-many',
      foreignKey: options.foreignKey,
      inverseField: options.inverseField,
      cascade: options.cascade || false,
      options
    });
    
    Reflect.defineMetadata('entity:relations', relations, target);
  };
}

/**
 * @Index decorator - creates database index
 * @param {Object} options - Index options
 */
export function Index(options = {}) {
  return function(target, propertyKey) {
    const indexes = Reflect.getMetadata('entity:indexes', target) || [];
    
    indexes.push({
      field: propertyKey,
      unique: options.unique || false,
      sparse: options.sparse || false,
      type: options.type || 'default'
    });
    
    Reflect.defineMetadata('entity:indexes', indexes, target);
  };
}

/**
 * @Hook decorator - lifecycle hooks
 * @param {string} event - 'beforeCreate', 'afterCreate', 'beforeUpdate', 'afterUpdate', 'beforeDelete', 'afterDelete'
 */
export function Hook(event) {
  return function(target, propertyKey, descriptor) {
    const hooks = Reflect.getMetadata('entity:hooks', target) || {};
    
    if (!hooks[event]) {
      hooks[event] = [];
    }
    
    hooks[event].push(descriptor.value);
    
    Reflect.defineMetadata('entity:hooks', hooks, target);
  };
}

/**
 * EntitySchemaGenerator - generates schemas from entities
 */
export class EntitySchemaGenerator {
  constructor(entities = []) {
    this.entities = entities.length > 0 ? entities : Array.from(entityRegistry.values());
  }
  
  /**
   * Generate GraphQL schema
   */
  generateGraphQLSchema() {
    const types = [];
    const inputs = [];
    const queries = [];
    const mutations = [];
    
    for (const entity of this.entities) {
      if (!entity.graphql) continue;
      
      // Generate type
      const typeFields = entity.fields
        .map(field => this._generateGraphQLField(field))
        .join('\n  ');
      
      const relationFields = entity.relations
        .map(rel => this._generateGraphQLRelation(rel))
        .join('\n  ');
      
      types.push(`"""
${entity.description}
"""
type ${entity.name} {
  ${typeFields}${relationFields ? '\n  ' + relationFields : ''}
}`);
      
      // Generate input types
      const createInputFields = entity.fields
        .filter(f => !f.options.auto && !f.options.primaryKey)
        .map(field => this._generateGraphQLInputField(field, 'create'))
        .join('\n  ');
      
      inputs.push(`input Create${entity.name}Input {
  ${createInputFields}
}`);
      
      const updateInputFields = entity.fields
        .filter(f => !f.options.auto && !f.options.primaryKey)
        .map(field => this._generateGraphQLInputField(field, 'update'))
        .join('\n  ');
      
      inputs.push(`input Update${entity.name}Input {
  ${updateInputFields}
}`);
      
      // Filter input
      const filterInputFields = entity.fields
        .map(field => this._generateGraphQLFilterField(field))
        .join('\n  ');
      
      inputs.push(`input ${entity.name}FilterInput {
  ${filterInputFields}
}`);
      
      // Generate queries
      if (entity.crud.includes('read')) {
        queries.push(`  ${entity.name.toLowerCase()}(id: ID!): ${entity.name}`);
      }
      if (entity.crud.includes('list')) {
        queries.push(`  ${entity.name.toLowerCase()}s(filter: ${entity.name}FilterInput, limit: Int, offset: Int): [${entity.name}!]!`);
        queries.push(`  ${entity.name.toLowerCase()}sCount(filter: ${entity.name}FilterInput): Int!`);
      }
      
      // Generate mutations
      if (entity.crud.includes('create')) {
        mutations.push(`  create${entity.name}(input: Create${entity.name}Input!): ${entity.name}!`);
      }
      if (entity.crud.includes('update')) {
        mutations.push(`  update${entity.name}(id: ID!, input: Update${entity.name}Input!): ${entity.name}!`);
      }
      if (entity.crud.includes('delete')) {
        mutations.push(`  delete${entity.name}(id: ID!): Boolean!`);
      }
    }
    
    // Combine all parts
    const schema = `
${types.join('\n\n')}

${inputs.join('\n\n')}

type Query {
${queries.join('\n')}
}

type Mutation {
${mutations.join('\n')}
}
`.trim();
    
    return schema;
  }
  
  /**
   * Generate TypeScript types
   */
  generateTypeScript() {
    const interfaces = [];
    
    for (const entity of this.entities) {
      const fields = entity.fields
        .map(field => this._generateTypeScriptField(field))
        .join('\n  ');
      
      const relations = entity.relations
        .map(rel => this._generateTypeScriptRelation(rel))
        .join('\n  ');
      
      interfaces.push(`/**
 * ${entity.description}
 */
export interface ${entity.name} {
  ${fields}${relations ? '\n  ' + relations : ''}
}`);
      
      // Generate input types
      const createFields = entity.fields
        .filter(f => !f.options.auto && !f.options.primaryKey)
        .map(field => this._generateTypeScriptInputField(field, 'create'))
        .join('\n  ');
      
      interfaces.push(`export interface Create${entity.name}Input {
  ${createFields}
}`);
      
      const updateFields = entity.fields
        .filter(f => !f.options.auto && !f.options.primaryKey)
        .map(field => this._generateTypeScriptInputField(field, 'update'))
        .join('\n  ');
      
      interfaces.push(`export interface Update${entity.name}Input {
  ${updateFields}
}`);
    }
    
    return interfaces.join('\n\n');
  }
  
  /**
   * Generate MongoDB schema
   */
  generateMongoDBSchema() {
    const schemas = [];
    
    for (const entity of this.entities) {
      const fields = entity.fields
        .map(field => this._generateMongoDBField(field))
        .join(',\n  ');
      
      schemas.push(`const ${entity.name}Schema = new Schema({
  ${fields}
}, {
  collection: '${entity.table}',
  timestamps: ${entity.timestamps}
});

${this._generateMongoDBIndexes(entity)}

export const ${entity.name}Model = model('${entity.name}', ${entity.name}Schema);`);
    }
    
    return schemas.join('\n\n');
  }
  
  /**
   * Generate PostgreSQL schema
   */
  generatePostgreSQLSchema() {
    const tables = [];
    
    for (const entity of this.entities) {
      const fields = entity.fields
        .map(field => this._generatePostgreSQLField(field))
        .join(',\n  ');
      
      tables.push(`CREATE TABLE ${entity.table} (
  ${fields}
);

${this._generatePostgreSQLIndexes(entity)}`);
    }
    
    return tables.join('\n\n');
  }
  
  // Helper methods
  
  _generateGraphQLField(field) {
    const type = this._getGraphQLType(field.type);
    const nullable = !field.options.required ? '' : '!';
    const constraint = field.options.graphql?.constraint || '';
    
    return `${field.name}: ${type}${nullable} ${constraint}`.trim();
  }
  
  _generateGraphQLRelation(relation) {
    const type = relation.targetEntity;
    const isList = relation.type === 'one-to-many' || relation.type === 'many-to-many';
    
    return `${relation.name}: ${isList ? `[${type}!]!` : type}`;
  }
  
  _generateGraphQLInputField(field, mode) {
    const type = this._getGraphQLType(field.type);
    const required = mode === 'create' && field.options.required && !field.options.default;
    const nullable = !required ? '' : '!';
    
    return `${field.name}: ${type}${nullable}`;
  }
  
  _generateGraphQLFilterField(field) {
    const type = this._getGraphQLType(field.type);
    
    // Generate comparison operators based on type
    const operators = [];
    operators.push(`${field.name}: ${type}`);
    operators.push(`${field.name}_ne: ${type}`);
    
    if ([Int, Float, DateTime].includes(field.type)) {
      operators.push(`${field.name}_gt: ${type}`);
      operators.push(`${field.name}_gte: ${type}`);
      operators.push(`${field.name}_lt: ${type}`);
      operators.push(`${field.name}_lte: ${type}`);
    }
    
    if (field.type === String) {
      operators.push(`${field.name}_contains: ${type}`);
      operators.push(`${field.name}_startsWith: ${type}`);
      operators.push(`${field.name}_endsWith: ${type}`);
    }
    
    return operators.join('\n  ');
  }
  
  _generateTypeScriptField(field) {
    const type = this._getTypeScriptType(field.type);
    const optional = !field.options.required ? '?' : '';
    
    return `${field.name}${optional}: ${type};`;
  }
  
  _generateTypeScriptRelation(relation) {
    const type = relation.targetEntity;
    const isList = relation.type === 'one-to-many' || relation.type === 'many-to-many';
    
    return `${relation.name}?: ${isList ? `${type}[]` : type};`;
  }
  
  _generateTypeScriptInputField(field, mode) {
    const type = this._getTypeScriptType(field.type);
    const optional = mode === 'update' || field.options.default ? '?' : '';
    
    return `${field.name}${optional}: ${type};`;
  }
  
  _generateMongoDBField(field) {
    const type = this._getMongoDBType(field.type);
    const options = [];
    
    if (field.options.required) options.push('required: true');
    if (field.options.unique) options.push('unique: true');
    if (field.options.default !== undefined) options.push(`default: ${JSON.stringify(field.options.default)}`);
    if (field.options.min !== undefined) options.push(`min: ${field.options.min}`);
    if (field.options.max !== undefined) options.push(`max: ${field.options.max}`);
    if (field.options.minLength) options.push(`minlength: ${field.options.minLength}`);
    if (field.options.maxLength) options.push(`maxlength: ${field.options.maxLength}`);
    if (field.options.enum) options.push(`enum: [${field.options.enum.map(v => `'${v}'`).join(', ')}]`);
    
    const optionsStr = options.length > 0 ? `, ${options.join(', ')}` : '';
    
    return `${field.name}: { type: ${type}${optionsStr} }`;
  }
  
  _generateMongoDBIndexes(entity) {
    const indexes = [];
    
    for (const field of entity.fields) {
      if (field.options.unique) {
        indexes.push(`${entity.name}Schema.index({ ${field.name}: 1 }, { unique: true });`);
      }
      if (field.options.index) {
        indexes.push(`${entity.name}Schema.index({ ${field.name}: 1 });`);
      }
    }
    
    for (const index of entity.indexes) {
      const options = [];
      if (index.unique) options.push('unique: true');
      if (index.sparse) options.push('sparse: true');
      
      const optionsStr = options.length > 0 ? `, { ${options.join(', ')} }` : '';
      indexes.push(`${entity.name}Schema.index({ ${index.field}: 1 }${optionsStr});`);
    }
    
    return indexes.join('\n');
  }
  
  _generatePostgreSQLField(field) {
    const type = this._getPostgreSQLType(field.type);
    const constraints = [];
    
    if (field.options.primaryKey) constraints.push('PRIMARY KEY');
    if (field.options.required) constraints.push('NOT NULL');
    if (field.options.unique) constraints.push('UNIQUE');
    if (field.options.default !== undefined) {
      const defaultValue = field.type === String ? `'${field.options.default}'` : field.options.default;
      constraints.push(`DEFAULT ${defaultValue}`);
    }
    
    const constraintsStr = constraints.length > 0 ? ' ' + constraints.join(' ') : '';
    
    return `${field.name} ${type}${constraintsStr}`;
  }
  
  _generatePostgreSQLIndexes(entity) {
    const indexes = [];
    
    for (const field of entity.fields) {
      if (field.options.index && !field.options.primaryKey && !field.options.unique) {
        indexes.push(`CREATE INDEX idx_${entity.table}_${field.name} ON ${entity.table}(${field.name});`);
      }
    }
    
    for (const index of entity.indexes) {
      const uniqueStr = index.unique ? 'UNIQUE ' : '';
      indexes.push(`CREATE ${uniqueStr}INDEX idx_${entity.table}_${index.field} ON ${entity.table}(${index.field});`);
    }
    
    return indexes.join('\n');
  }
  
  _getGraphQLType(type) {
    if (type?.type === Symbol.for('Enum')) {
      return 'String'; // Or generate enum type
    }
    return TYPE_MAPPINGS.graphql[type] || 'String';
  }
  
  _getTypeScriptType(type) {
    if (type?.type === Symbol.for('Enum')) {
      return type.values.map(v => `'${v}'`).join(' | ');
    }
    return TYPE_MAPPINGS.typescript[type] || 'any';
  }
  
  _getMongoDBType(type) {
    return TYPE_MAPPINGS.mongodb[type] || 'Mixed';
  }
  
  _getPostgreSQLType(type) {
    if (type?.type === Symbol.for('Enum')) {
      return 'VARCHAR(50)'; // Or CREATE TYPE enum
    }
    return TYPE_MAPPINGS.postgresql[type] || 'TEXT';
  }
}

/**
 * Get entity metadata
 */
export function getEntityMetadata(entityClass) {
  return Reflect.getMetadata('entity:metadata', entityClass);
}

/**
 * Get all registered entities
 */
export function getRegisteredEntities() {
  return Array.from(entityRegistry.values());
}

/**
 * Get entity by name
 */
export function getEntity(name) {
  return entityRegistry.get(name);
}

/**
 * Clear entity registry (for testing)
 */
export function clearEntityRegistry() {
  entityRegistry.clear();
}

export default {
  Entity,
  Field,
  Relation,
  Index,
  Hook,
  EntitySchemaGenerator,
  getEntityMetadata,
  getRegisteredEntities,
  getEntity,
  clearEntityRegistry,
  // Types
  ID, String, Int, Float, Boolean, DateTime, JSON, Enum
};
