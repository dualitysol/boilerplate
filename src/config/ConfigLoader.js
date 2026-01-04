/**
 * Configuration Loader
 * 
 * Loads and validates boilerplate.config.js with environment variable support.
 * Provides type-safe configuration access throughout the application.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Default configuration values
 */
const defaults = {
  project: {
    name: 'my-project',
    version: '1.0.0',
    architecture: 'monolith'
  },
  
  services: {
    autoDiscover: {
      enabled: true,
      pattern: 'services/**/index.js'
    },
    registry: {
      typeCheck: true,
      generateTypes: true,
      typesPath: './types/service-registry.d.ts'
    }
  },
  
  database: {
    type: 'mongodb',
    url: 'mongodb://localhost:27017',
    name: 'mydb'
  },
  
  transport: {
    type: 'http',
    http: {
      port: 4000,
      host: '0.0.0.0',
      cors: {
        enabled: true,
        origin: '*',
        credentials: true
      }
    }
  },
  
  runtime: {
    type: 'local',
    local: {
      cluster: false,
      workers: 1
    }
  },
  
  tracing: {
    enabled: false,
    type: 'opentelemetry',
    serviceName: 'my-service'
  },
  
  logging: {
    level: 'info',
    pretty: true,
    format: 'json'
  },
  
  health: {
    enabled: true,
    endpoint: '/health',
    readinessEndpoint: '/ready',
    livenessEndpoint: '/live'
  },
  
  metrics: {
    enabled: false,
    endpoint: '/metrics',
    prometheus: true
  }
};

/**
 * Environment variable mappings
 * Maps config paths to environment variables
 */
const envMappings = {
  'database.url': 'DATABASE_URL',
  'database.name': 'DATABASE_NAME',
  'transport.type': 'TRANSPORT_TYPE',
  'transport.http.port': 'PORT',
  'transport.http.host': 'HOST',
  'transport.http.cors.origin': 'CORS_ORIGIN',
  'runtime.type': 'RUNTIME_ENV',
  'tracing.enabled': 'TRACING_ENABLED',
  'tracing.type': 'TRACER_TYPE',
  'tracing.serviceName': 'SERVICE_NAME',
  'tracing.opentelemetry.exporter': 'OTEL_EXPORTER',
  'tracing.opentelemetry.jaeger.endpoint': 'JAEGER_ENDPOINT',
  'tracing.opentelemetry.tempo.endpoint': 'TEMPO_ENDPOINT',
  'tracing.opentelemetry.otlp.endpoint': 'OTEL_EXPORTER_OTLP_ENDPOINT',
  'logging.level': 'LOG_LEVEL',
  'logging.format': 'LOG_FORMAT',
  'metrics.enabled': 'METRICS_ENABLED',
  'cache.enabled': 'CACHE_ENABLED',
  'cache.type': 'CACHE_TYPE'
};

/**
 * Deep merge two objects
 */
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] instanceof Object && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

/**
 * Get value from nested object by path
 */
function getByPath(obj, path) {
  return path.split('.').reduce((curr, key) => curr?.[key], obj);
}

/**
 * Set value in nested object by path
 */
function setByPath(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((curr, key) => {
    if (!curr[key]) curr[key] = {};
    return curr[key];
  }, obj);
  target[lastKey] = value;
}

/**
 * Parse environment variable value to correct type
 */
function parseEnvValue(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
  return value;
}

/**
 * Apply environment variables to config
 */
function applyEnvVariables(config) {
  for (const [configPath, envVar] of Object.entries(envMappings)) {
    if (process.env[envVar]) {
      const value = parseEnvValue(process.env[envVar]);
      setByPath(config, configPath, value);
    }
  }
  return config;
}

/**
 * Validate configuration
 */
function validateConfig(config) {
  const errors = [];
  
  // Required fields
  if (!config.project?.name) {
    errors.push('project.name is required');
  }
  
  // Database validation
  if (config.database?.type && !['mongodb', 'postgresql', 'mysql', 'sqlite', 'memory'].includes(config.database.type)) {
    errors.push(`Invalid database.type: ${config.database.type}`);
  }
  
  // Transport validation
  if (config.transport?.type && !['http', 'websocket', 'grpc', 'nats', 'rabbitmq', 'redis', 'zeromq'].includes(config.transport.type)) {
    errors.push(`Invalid transport.type: ${config.transport.type}`);
  }
  
  // Runtime validation
  if (config.runtime?.type && !['local', 'aws-lambda', 'google-cloud', 'kubernetes', 'docker'].includes(config.runtime.type)) {
    errors.push(`Invalid runtime.type: ${config.runtime.type}`);
  }
  
  // Port validation
  if (config.transport?.http?.port) {
    const port = config.transport.http.port;
    if (port < 1 || port > 65535) {
      errors.push(`Invalid port number: ${port}`);
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
  
  return true;
}

/**
 * ConfigLoader class
 */
export class ConfigLoader {
  /**
   * Load configuration from file
   * @param {string} [configPath] - Path to config file (default: ./boilerplate.config.js)
   * @returns {Promise<Object>} - Loaded configuration
   */
  static async load(configPath) {
    const cwd = process.cwd();
    const defaultPath = path.join(cwd, 'boilerplate.config.js');
    const finalPath = configPath || defaultPath;
    
    let userConfig = {};
    
    // Try to load user config
    if (fs.existsSync(finalPath)) {
      try {
        const module = await import(finalPath);
        userConfig = module.default || module;
        console.log(`✓ Loaded configuration from ${finalPath}`);
      } catch (error) {
        console.error(`Failed to load config from ${finalPath}:`, error.message);
        throw error;
      }
    } else {
      console.warn(`⚠ Config file not found: ${finalPath}, using defaults`);
    }
    
    // Merge with defaults
    let config = deepMerge(defaults, userConfig);
    
    // Apply environment variables
    config = applyEnvVariables(config);
    
    // Validate
    validateConfig(config);
    
    return config;
  }
  
  /**
   * Load configuration synchronously
   * @param {string} [configPath] - Path to config file
   * @returns {Object} - Loaded configuration
   */
  static loadSync(configPath) {
    const cwd = process.cwd();
    const defaultPath = path.join(cwd, 'boilerplate.config.js');
    const finalPath = configPath || defaultPath;
    
    let userConfig = {};
    
    if (fs.existsSync(finalPath)) {
      try {
        // For sync loading, we need to use require (CommonJS)
        // This is a limitation - we'll encourage async loading
        console.warn('⚠ Synchronous config loading is deprecated. Use ConfigLoader.load() instead.');
        userConfig = {};
      } catch (error) {
        console.error(`Failed to load config from ${finalPath}:`, error.message);
      }
    }
    
    let config = deepMerge(defaults, userConfig);
    config = applyEnvVariables(config);
    validateConfig(config);
    
    return config;
  }
  
  /**
   * Get configuration value by path
   * @param {Object} config - Configuration object
   * @param {string} path - Dot-notation path (e.g., 'database.url')
   * @param {any} [defaultValue] - Default value if not found
   * @returns {any}
   */
  static get(config, path, defaultValue) {
    const value = getByPath(config, path);
    return value !== undefined ? value : defaultValue;
  }
  
  /**
   * Check if configuration has a value
   * @param {Object} config - Configuration object
   * @param {string} path - Dot-notation path
   * @returns {boolean}
   */
  static has(config, path) {
    return getByPath(config, path) !== undefined;
  }
  
  /**
   * Generate .env.example from config schema
   * @param {string} outputPath - Path to write .env.example
   */
  static generateEnvExample(outputPath = '.env.example') {
    let envContent = '# Environment Variables for Boilerplate Project\n';
    envContent += '# Copy this file to .env and fill in your values\n\n';
    
    for (const [configPath, envVar] of Object.entries(envMappings)) {
      const defaultValue = getByPath(defaults, configPath);
      envContent += `# ${configPath}\n`;
      envContent += `${envVar}=${defaultValue || ''}\n\n`;
    }
    
    fs.writeFileSync(outputPath, envContent, 'utf-8');
    console.log(`✓ Generated ${outputPath}`);
  }
  
  /**
   * Print configuration (with secrets masked)
   * @param {Object} config - Configuration to print
   */
  static print(config) {
    const masked = JSON.parse(JSON.stringify(config));
    
    // Mask sensitive values
    const sensitiveKeys = ['secret', 'password', 'token', 'key', 'apiKey'];
    const maskValue = (obj) => {
      for (const key in obj) {
        if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
          obj[key] = '***MASKED***';
        } else if (obj[key] instanceof Object && !Array.isArray(obj[key])) {
          maskValue(obj[key]);
        }
      }
    };
    
    maskValue(masked);
    console.log('Configuration:');
    console.log(JSON.stringify(masked, null, 2));
  }
}

// Export defaults for reference
export { defaults };

export default ConfigLoader;
