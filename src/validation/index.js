/**
 * Validation System - GraphQL Schema Compatible
 * 
 * Exports:
 * - GraphQLSchemaValidator: Schema-based validation engine
 * - Decorators: @ValidateInput, @AutoValidate
 * - ValidationError: Structured validation errors
 * - Utility functions: validate, registerSchema, getValidator
 */

export { 
  GraphQLSchemaValidator,
  createSchemaValidator 
} from './GraphQLSchemaValidator.js';

export {
  ValidateInput,
  AutoValidate,
  ValidationError,
  validate,
  registerSchema,
  getValidator
} from './decorators.js';

export default {
  GraphQLSchemaValidator,
  ValidateInput,
  AutoValidate,
  ValidationError,
  validate,
  registerSchema,
  getValidator
};
