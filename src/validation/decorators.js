/**
 * Validation Decorators - GraphQL Schema Compatible
 * 
 * Automatically validates based on GraphQL schema constraints
 * Uses @constraint directive for backward compatibility
 */

import { GraphQLSchemaValidator } from './GraphQLSchemaValidator.js';

/**
 * Global validator registry
 */
const validatorRegistry = new Map();

/**
 * Register GraphQL schema for validation
 */
export function registerSchema(serviceName, typeDefs) {
  const validator = new GraphQLSchemaValidator(typeDefs);
  validatorRegistry.set(serviceName, validator);
  return validator;
}

/**
 * Get validator for service
 */
export function getValidator(serviceName) {
  return validatorRegistry.get(serviceName);
}

/**
 * @ValidateInput decorator - validates method input based on GraphQL schema
 * 
 * Usage:
 * @ValidateInput('CreateUserInput')
 * async createUser(input) { ... }
 */
export function ValidateInput(inputTypeName) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args) {
      const serviceName = this.constructor.name;
      const validator = getValidator(serviceName);
      
      if (!validator) {
        // No schema registered, skip validation
        return originalMethod.apply(this, args);
      }
      
      // Validate first argument (assumed to be input)
      const input = args[0];
      const result = validator.validate(inputTypeName, input);
      
      if (!result.valid) {
        const error = new ValidationError(
          `Validation failed for ${inputTypeName}`,
          result.errors
        );
        throw error;
      }
      
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

/**
 * @AutoValidate decorator - automatically detects input type from method name
 * 
 * Usage:
 * @AutoValidate()
 * async createUser(input) { ... }  // Uses CreateUserInput
 */
export function AutoValidate() {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args) {
      const serviceName = this.constructor.name;
      const validator = getValidator(serviceName);
      
      if (!validator) {
        return originalMethod.apply(this, args);
      }
      
      // Auto-detect input type name from method name
      // createUser -> CreateUserInput
      // updateTodo -> UpdateTodoInput
      const methodName = propertyKey;
      const inputTypeName = methodName
        .replace(/^(create|update|delete|get)/, '')
        .replace(/^[a-z]/, (c) => c.toUpperCase()) + 'Input';
      
      const input = args[0];
      const result = validator.validate(inputTypeName, input);
      
      if (!result.valid) {
        const error = new ValidationError(
          `Validation failed for ${methodName}`,
          result.errors
        );
        throw error;
      }
      
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

/**
 * Validation Error
 */
export class ValidationError extends Error {
  constructor(message, errors) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
    this.statusCode = 400;
  }

  toJSON() {
    return {
      error: this.message,
      statusCode: this.statusCode,
      validationErrors: this.errors
    };
  }
}

/**
 * Standalone validation function
 */
export function validate(serviceName, inputTypeName, data) {
  const validator = getValidator(serviceName);
  
  if (!validator) {
    throw new Error(`No validator registered for service: ${serviceName}`);
  }
  
  const result = validator.validate(inputTypeName, data);
  
  if (!result.valid) {
    throw new ValidationError(
      `Validation failed for ${inputTypeName}`,
      result.errors
    );
  }
  
  return true;
}

export default {
  ValidateInput,
  AutoValidate,
  ValidationError,
  validate,
  registerSchema,
  getValidator
};
