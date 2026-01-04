#!/usr/bin/env node

/**
 * Service Layer Generator
 * 
 * Generates a proper Service class from Entity definition.
 * Follows the architecture: Resolver -> Service -> Model -> Entity
 * 
 * Usage: node generate-service.js <ServiceName> <EntityName>
 * Example: node generate-service.js TodoService Todo
 */

const fs = require('fs');
const path = require('path');

/**
 * Generate Service class template
 * @param {string} serviceName - Service name (e.g., "TodoService")
 * @param {string} entityName - Entity name (e.g., "Todo")
 * @returns {string} Service class code
 */
function generateServiceClass(serviceName, entityName) {
  return `/**
 * ${serviceName} - Business Logic Layer
 * 
 * This service handles all business logic for ${entityName} operations.
 * It sits between resolvers and the model/entity layers.
 * 
 * Architecture:
 * GraphQL Resolvers -> ${serviceName} (this) -> ${entityName}Model -> ${entityName} Entity
 */

import { ${entityName} } from '../entity/${entityName}.js';

export class ${serviceName} {
  /**
   * @param {Object} dependencies
   * @param {Object} dependencies.model - ${entityName}Model instance for data access
   * @param {Object} dependencies.eventBus - Event bus for publishing events
   * @param {Object} dependencies.services - Other services
   */
  constructor({ model, eventBus, services }) {
    this.model = model;
    this.eventBus = eventBus;
    this.services = services;
  }

  /**
   * Create a new ${entityName.toLowerCase()}
   * @template T
   * @param {Object} input - ${entityName} creation data
   * @param {string} userId - ID of the user creating the ${entityName.toLowerCase()}
   * @returns {Promise<T extends ${entityName}>}
   */
  async create${entityName}(input, userId) {
    // Validate input
    this.validateInput(input);

    // Create entity instance
    const entity = new ${entityName}({
      ...input,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Validate entity
    const validationErrors = entity.validate ? entity.validate() : [];
    if (validationErrors.length > 0) {
      throw new Error(\`Validation failed: \${validationErrors.join(', ')}\`);
    }

    // Execute beforeInsert lifecycle hook
    if (entity.beforeInsert) {
      entity.beforeInsert();
    }

    // Save to database via model
    const saved = await this.model.create(entity);

    // Publish event
    await this.eventBus.publish('${entityName.toLowerCase()}.created', {
      id: saved.id,
      userId
    });

    // Return entity instance
    return new ${entityName}(saved);
  }

  /**
   * Get ${entityName.toLowerCase()} by ID
   * @template T
   * @param {string} id - ${entityName} ID
   * @returns {Promise<T extends ${entityName} | null>}
   */
  async get${entityName}ById(id) {
    const data = await this.model.findById(id);
    if (!data) {
      return null;
    }
    return new ${entityName}(data);
  }

  /**
   * Get all ${entityName.toLowerCase()}s with optional filters
   * @template T
   * @param {Object} [filter={}] - Filter options
   * @returns {Promise<Array<T extends ${entityName}>>}
   */
  async getAll${entityName}s(filter = {}) {
    const dataList = await this.model.findAll(filter);
    return dataList.map(data => new ${entityName}(data));
  }

  /**
   * Update ${entityName.toLowerCase()}
   * @template T
   * @param {string} id - ${entityName} ID
   * @param {Object} updates - Update data
   * @param {string} userId - ID of user making the update (for authorization)
   * @returns {Promise<T extends ${entityName}>}
   */
  async update${entityName}(id, updates, userId) {
    // Get existing
    const existing = await this.get${entityName}ById(id);
    if (!existing) {
      throw new Error('${entityName} not found');
    }

    // Check ownership if applicable
    if (existing.userId && existing.userId !== userId) {
      throw new Error('Not authorized to update this ${entityName.toLowerCase()}');
    }

    // Create updated entity
    const updatedEntity = new ${entityName}({
      ...existing,
      ...updates,
      updatedAt: new Date()
    });

    // Execute beforeUpdate lifecycle hook
    if (updatedEntity.beforeUpdate) {
      updatedEntity.beforeUpdate();
    }

    // Validate updated entity
    const validationErrors = updatedEntity.validate ? updatedEntity.validate() : [];
    if (validationErrors.length > 0) {
      throw new Error(\`Validation failed: \${validationErrors.join(', ')}\`);
    }

    // Save updates
    const saved = await this.model.update(id, updatedEntity);

    // Publish event
    await this.eventBus.publish('${entityName.toLowerCase()}.updated', {
      id,
      userId
    });

    return new ${entityName}(saved);
  }

  /**
   * Delete ${entityName.toLowerCase()}
   * @param {string} id - ${entityName} ID
   * @param {string} userId - ID of user making the deletion
   * @returns {Promise<boolean>}
   */
  async delete${entityName}(id, userId) {
    const entity = await this.get${entityName}ById(id);
    if (!entity) {
      throw new Error('${entityName} not found');
    }

    // Check ownership if applicable
    if (entity.userId && entity.userId !== userId) {
      throw new Error('Not authorized to delete this ${entityName.toLowerCase()}');
    }

    const deleted = await this.model.delete(id);

    if (deleted) {
      await this.eventBus.publish('${entityName.toLowerCase()}.deleted', {
        id,
        userId
      });
    }

    return deleted;
  }

  /**
   * Validate input
   * @private
   * @param {Object} input
   */
  validateInput(input) {
    if (!input) {
      throw new Error('Input is required');
    }
    // Add specific validation logic here
  }
}

export default ${serviceName};
`;
}

/**
 * Generate thin resolver template
 * @param {string} serviceName - Service name
 * @param {string} entityName - Entity name
 * @returns {string} Resolver code
 */
function generateResolvers(serviceName, entityName) {
  const entityLower = entityName.toLowerCase();
  const entityPlural = entityName + 's'; // Simple pluralization
  const entityPluralLower = entityPlural.toLowerCase();

  return `/**
 * ${serviceName} GraphQL Resolvers
 * 
 * Thin delegation layer - all business logic is in ${serviceName}.
 * Resolvers only handle GraphQL-specific concerns and delegate to service.
 * 
 * Architecture: GraphQL -> Resolver (this) -> Service -> Model -> Entity
 */

export const resolvers = {
  Query: {
    /**
     * Get all ${entityPluralLower}
     */
    ${entityPluralLower}: async (_, args, { service }) => {
      return await service.getAll${entityName}s(args);
    },

    /**
     * Get single ${entityLower} by ID
     */
    ${entityLower}: async (_, { id }, { service }) => {
      return await service.get${entityName}ById(id);
    },
  },

  Mutation: {
    /**
     * Create new ${entityLower}
     */
    create${entityName}: async (_, { input }, { currentUser, service }) => {
      if (!currentUser) {
        return {
          success: false,
          message: 'Not authenticated',
          ${entityLower}: null
        };
      }

      try {
        const ${entityLower} = await service.create${entityName}(input, currentUser.id);
        return {
          success: true,
          message: '${entityName} created successfully',
          ${entityLower}
        };
      } catch (error) {
        return {
          success: false,
          message: error.message,
          ${entityLower}: null
        };
      }
    },

    /**
     * Update existing ${entityLower}
     */
    update${entityName}: async (_, { id, input }, { currentUser, service }) => {
      if (!currentUser) {
        return {
          success: false,
          message: 'Not authenticated',
          ${entityLower}: null
        };
      }

      try {
        const ${entityLower} = await service.update${entityName}(id, input, currentUser.id);
        return {
          success: true,
          message: '${entityName} updated successfully',
          ${entityLower}
        };
      } catch (error) {
        return {
          success: false,
          message: error.message,
          ${entityLower}: null
        };
      }
    },

    /**
     * Delete ${entityLower}
     */
    delete${entityName}: async (_, { id }, { currentUser, service }) => {
      if (!currentUser) {
        return {
          success: false,
          message: 'Not authenticated'
        };
      }

      try {
        await service.delete${entityName}(id, currentUser.id);
        return {
          success: true,
          message: '${entityName} deleted successfully'
        };
      } catch (error) {
        return {
          success: false,
          message: error.message
        };
      }
    },
  },
};

export default resolvers;
`;
}

// Main execution
const serviceName = process.argv[2];
const entityName = process.argv[3];

if (!serviceName || !entityName) {
  console.error('Usage: node generate-service.js <ServiceName> <EntityName>');
  console.error('Example: node generate-service.js TodoService Todo');
  process.exit(1);
}

console.log(`\n📦 Generating service layer for ${serviceName}/${entityName}...\n`);

// Generate service class
const serviceCode = generateServiceClass(serviceName, entityName);
const serviceDir = path.join(process.cwd(), 'services', serviceName, 'service');
const serviceFile = path.join(serviceDir, `${serviceName}.js`);

fs.mkdirSync(serviceDir, { recursive: true });
fs.writeFileSync(serviceFile, serviceCode);
console.log(`✅ Created: ${serviceFile}`);

// Generate resolvers
const resolverCode = generateResolvers(serviceName, entityName);
const resolverFile = path.join(process.cwd(), 'services', serviceName, 'resolvers', 'index.js');

fs.mkdirSync(path.dirname(resolverFile), { recursive: true });
fs.writeFileSync(resolverFile, resolverCode);
console.log(`✅ Created: ${resolverFile}`);

console.log(`\n✨ Done! Generated files for ${serviceName}/${entityName}`);
console.log(`\nNext steps:`);
console.log(`1. Review generated service class: ${serviceFile}`);
console.log(`2. Review generated resolvers: ${resolverFile}`);
console.log(`3. Add custom business logic to service methods`);
console.log(`4. Update GraphQL schema if needed`);
console.log(`5. Wire service into bootstrap/index.js\n`);
