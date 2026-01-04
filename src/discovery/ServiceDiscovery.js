/**
 * ServiceDiscovery - Automatically discovers and registers services
 * 
 * Features:
 * - Scans directories for service files based on patterns
 * - Auto-imports and validates service classes
 * - Generates service registry types
 * - Supports multiple discovery strategies
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { pathToFileURL } from 'url';

/**
 * Service Discovery Engine
 */
export class ServiceDiscovery {
  /**
   * @param {Object} options - Discovery options
   * @param {string} options.baseDir - Base directory to search from
   * @param {string|string[]} options.patterns - Glob patterns for service files
   * @param {string[]} options.excludePatterns - Patterns to exclude
   * @param {boolean} options.recursive - Enable recursive search
   * @param {Function} options.validator - Custom service validator
   */
  constructor(options = {}) {
    this.baseDir = options.baseDir || process.cwd();
    this.patterns = Array.isArray(options.patterns) 
      ? options.patterns 
      : [options.patterns || 'services/**/*Service.js'];
    this.excludePatterns = options.excludePatterns || ['**/node_modules/**', '**/test/**', '**/tests/**'];
    this.recursive = options.recursive !== false;
    this.validator = options.validator || this.defaultValidator;
    this.logger = options.logger || console;
    
    this.discoveredServices = new Map();
  }

  /**
   * Discover all services matching patterns
   * @returns {Promise<Map<string, Object>>} - Map of service name to service metadata
   */
  async discover() {
    this.logger.info('🔍 Discovering services...');
    this.logger.info(`   Base directory: ${this.baseDir}`);
    this.logger.info(`   Patterns: ${this.patterns.join(', ')}`);
    
    const servicePaths = new Set();
    
    // Find all matching files
    for (const pattern of this.patterns) {
      const files = await glob(pattern, {
        cwd: this.baseDir,
        ignore: this.excludePatterns,
        absolute: true
      });
      
      files.forEach(file => servicePaths.add(file));
    }
    
    this.logger.info(`   Found ${servicePaths.size} potential service files`);
    
    // Import and validate each service
    for (const servicePath of servicePaths) {
      try {
        await this.discoverService(servicePath);
      } catch (error) {
        this.logger.warn(`   ⚠️  Failed to load service from ${servicePath}:`, error.message);
      }
    }
    
    this.logger.info(`✅ Discovered ${this.discoveredServices.size} services`);
    
    return this.discoveredServices;
  }

  /**
   * Discover single service from file path
   * @param {string} servicePath - Absolute path to service file
   */
  async discoverService(servicePath) {
    // Import service module
    const fileUrl = pathToFileURL(servicePath).href;
    const module = await import(fileUrl);
    
    // Find service class in module exports
    const ServiceClass = this.findServiceClass(module);
    
    if (!ServiceClass) {
      throw new Error(`No service class found in ${servicePath}`);
    }
    
    // Extract service name
    const serviceName = ServiceClass.name;
    
    // Validate service
    const validationResult = this.validator(ServiceClass, servicePath);
    if (!validationResult.valid) {
      throw new Error(`Service validation failed: ${validationResult.error}`);
    }
    
    // Extract metadata
    const metadata = this.extractMetadata(ServiceClass, servicePath);
    
    // Store discovered service
    this.discoveredServices.set(serviceName, {
      name: serviceName,
      class: ServiceClass,
      path: servicePath,
      metadata
    });
    
    this.logger.debug(`   ✓ ${serviceName} (${path.relative(this.baseDir, servicePath)})`);
    
    return { serviceName, ServiceClass, metadata };
  }

  /**
   * Find service class in module exports
   */
  findServiceClass(module) {
    // Check default export
    if (module.default && this.isServiceClass(module.default)) {
      return module.default;
    }
    
    // Check named exports
    for (const [exportName, exportValue] of Object.entries(module)) {
      if (exportName !== 'default' && this.isServiceClass(exportValue)) {
        return exportValue;
      }
    }
    
    return null;
  }

  /**
   * Check if value is a service class
   */
  isServiceClass(value) {
    return (
      typeof value === 'function' &&
      value.prototype &&
      (value.name.endsWith('Service') || value.prototype.constructor.name.endsWith('Service'))
    );
  }

  /**
   * Default service validator
   */
  defaultValidator(ServiceClass, servicePath) {
    // Check if it's a class
    if (typeof ServiceClass !== 'function') {
      return { valid: false, error: 'Not a function/class' };
    }
    
    // Check if it has required methods (optional - can be customized)
    const requiredMethods = ['initialize']; // Add your required methods
    const missingMethods = requiredMethods.filter(
      method => typeof ServiceClass.prototype[method] !== 'function'
    );
    
    if (missingMethods.length > 0) {
      // Warning only - not a hard requirement
      // return { valid: false, error: `Missing methods: ${missingMethods.join(', ')}` };
    }
    
    return { valid: true };
  }

  /**
   * Extract metadata from service class
   */
  extractMetadata(ServiceClass, servicePath) {
    const metadata = {
      hasGraphQL: false,
      hasResolvers: false,
      hasTypeDefs: false,
      hasEntity: false,
      decorators: [],
      dependencies: []
    };
    
    // Check for GraphQL support (common patterns)
    const serviceDir = path.dirname(servicePath);
    
    try {
      // Check for resolvers
      const resolversPath = path.join(serviceDir, 'resolvers');
      if (fs.access(resolversPath).then(() => true).catch(() => false)) {
        metadata.hasResolvers = true;
        metadata.hasGraphQL = true;
      }
    } catch {}
    
    try {
      // Check for typeDefinitions
      const typeDefsPath = path.join(serviceDir, 'typeDefinitions');
      if (fs.access(typeDefsPath).then(() => true).catch(() => false)) {
        metadata.hasTypeDefs = true;
        metadata.hasGraphQL = true;
      }
    } catch {}
    
    try {
      // Check for entity
      const entityPath = path.join(serviceDir, 'entity');
      if (fs.access(entityPath).then(() => true).catch(() => false)) {
        metadata.hasEntity = true;
      }
    } catch {}
    
    // Extract JSDoc metadata
    const classSource = ServiceClass.toString();
    
    // Look for @service decorator in JSDoc
    const serviceDecorator = /@service\s*{([^}]+)}/i.exec(classSource);
    if (serviceDecorator) {
      metadata.decorators.push('service');
    }
    
    // Look for dependencies in JSDoc
    const dependsPattern = /@depends\s+{([^}]+)}/gi;
    let match;
    while ((match = dependsPattern.exec(classSource)) !== null) {
      metadata.dependencies.push(match[1].trim());
    }
    
    return metadata;
  }

  /**
   * Generate TypeScript service registry definitions
   * @param {string} outputPath - Path to write .d.ts file
   */
  async generateTypeDefinitions(outputPath) {
    this.logger.info('📝 Generating service registry types...');
    
    const services = Array.from(this.discoveredServices.values());
    
    let content = `/**
 * Auto-generated Service Registry Types
 * Generated by ServiceDiscovery
 * DO NOT EDIT MANUALLY
 */

`;
    
    // Import statements
    services.forEach(({ name, path: servicePath }) => {
      const relativePath = path.relative(path.dirname(outputPath), servicePath)
        .replace(/\\/g, '/')
        .replace(/\.js$/, '');
      content += `import type { ${name} } from '${relativePath}';\n`;
    });
    
    content += '\n';
    
    // Service registry interface
    content += `/**
 * Service Registry - Type-safe service container
 */
export interface ServiceRegistry {
`;
    
    services.forEach(({ name }) => {
      content += `  ${name}: ${name};\n`;
    });
    
    content += `}

/**
 * Service names as string literal union
 */
export type ServiceName = keyof ServiceRegistry;

/**
 * Get service type by name
 */
export type GetService<T extends ServiceName> = ServiceRegistry[T];
`;
    
    // Write file
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, content, 'utf-8');
    
    this.logger.info(`✅ Types written to ${outputPath}`);
  }

  /**
   * Create service instances with dependency injection
   * @param {Object} dependencies - Common dependencies (storage, events, etc.)
   * @returns {Promise<Map<string, Object>>} - Map of service name to service instance
   */
  async createInstances(dependencies = {}) {
    this.logger.info('🔨 Creating service instances...');
    
    const instances = new Map();
    const services = Array.from(this.discoveredServices.values());
    
    // Topological sort for dependency resolution
    const sorted = this.topologicalSort(services);
    
    // Create instances in dependency order
    for (const service of sorted) {
      const { name, class: ServiceClass, metadata } = service;
      
      // Collect service dependencies
      const serviceDependencies = {
        ...dependencies,
        services: Object.fromEntries(instances)
      };
      
      // Create instance
      const instance = new ServiceClass(serviceDependencies);
      
      // Initialize if method exists
      if (typeof instance.initialize === 'function') {
        await instance.initialize();
      }
      
      instances.set(name, instance);
      this.logger.debug(`   ✓ ${name}`);
    }
    
    this.logger.info(`✅ Created ${instances.size} service instances`);
    
    return instances;
  }

  /**
   * Topological sort for dependency resolution
   */
  topologicalSort(services) {
    const sorted = [];
    const visited = new Set();
    const visiting = new Set();
    
    const visit = (service) => {
      if (visited.has(service.name)) return;
      
      if (visiting.has(service.name)) {
        throw new Error(`Circular dependency detected: ${service.name}`);
      }
      
      visiting.add(service.name);
      
      // Visit dependencies first
      for (const depName of service.metadata.dependencies) {
        const dep = services.find(s => s.name === depName);
        if (dep) {
          visit(dep);
        }
      }
      
      visiting.delete(service.name);
      visited.add(service.name);
      sorted.push(service);
    };
    
    services.forEach(visit);
    
    return sorted;
  }

  /**
   * Get discovered services as plain object
   * @returns {Object<string, Function>} - Object with service name as key and class as value
   */
  toObject() {
    const obj = {};
    for (const [name, { class: ServiceClass }] of this.discoveredServices) {
      obj[name] = ServiceClass;
    }
    return obj;
  }
}

/**
 * Convenience function for quick discovery
 * @param {Object} options - Discovery options
 * @returns {Promise<Map>}
 */
export async function discoverServices(options) {
  const discovery = new ServiceDiscovery(options);
  return await discovery.discover();
}

export default ServiceDiscovery;
