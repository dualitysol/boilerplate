/**
 * GraphQL Schema-based Validation
 * 
 * Automatically extracts validation rules from GraphQL schema:
 * - @constraint directive for custom rules
 * - Built-in scalar types (Email, URL, DateTime)
 * - Non-null requirements
 * - List constraints
 * 
 * NO DUPLICATION: Define once in GraphQL, validate everywhere!
 */

import { parse, visit, Kind } from 'graphql';
import { GraphQLScalarType } from 'graphql';

/**
 * Extract validation rules from GraphQL schema
 */
export class GraphQLSchemaValidator {
  constructor(typeDefs) {
    this.typeDefs = typeDefs;
    this.validationRules = new Map();
    this.customScalars = new Map();
    
    this.parseSchema();
  }

  /**
   * Parse GraphQL schema and extract validation rules
   */
  parseSchema() {
    const ast = typeof this.typeDefs === 'string' 
      ? parse(this.typeDefs) 
      : this.typeDefs;

    visit(ast, {
      // Extract input types
      InputObjectTypeDefinition: (node) => {
        this.extractInputTypeRules(node);
      },
      
      // Extract scalar directives
      ScalarTypeDefinition: (node) => {
        this.extractScalarRules(node);
      },
      
      // Extract field directives
      FieldDefinition: (node) => {
        this.extractFieldRules(node);
      }
    });
  }

  /**
   * Extract rules from input types
   */
  extractInputTypeRules(node) {
    const typeName = node.name.value;
    const rules = {};

    for (const field of node.fields) {
      const fieldName = field.name.value;
      const fieldRules = this.extractFieldValidation(field);
      
      if (Object.keys(fieldRules).length > 0) {
        rules[fieldName] = fieldRules;
      }
    }

    if (Object.keys(rules).length > 0) {
      this.validationRules.set(typeName, rules);
    }
  }

  /**
   * Extract validation from field definition
   */
  extractFieldValidation(field) {
    const rules = {};
    
    // Check if field is required (NonNullType)
    if (field.type.kind === Kind.NON_NULL_TYPE) {
      rules.required = true;
      rules.type = this.getBaseType(field.type.type);
    } else {
      rules.required = false;
      rules.type = this.getBaseType(field.type);
    }

    // Extract @constraint directive
    const constraintDirective = field.directives?.find(
      d => d.name.value === 'constraint'
    );
    
    if (constraintDirective) {
      for (const arg of constraintDirective.arguments) {
        const argName = arg.name.value;
        const argValue = this.getArgumentValue(arg.value);
        rules[argName] = argValue;
      }
    }

    // Check for custom scalar validation
    if (rules.type && this.customScalars.has(rules.type)) {
      rules.scalarValidator = this.customScalars.get(rules.type);
    }

    return rules;
  }

  /**
   * Get base type from GraphQL type node
   */
  getBaseType(typeNode) {
    if (typeNode.kind === Kind.LIST_TYPE) {
      return {
        list: true,
        itemType: this.getBaseType(typeNode.type)
      };
    }
    
    if (typeNode.kind === Kind.NON_NULL_TYPE) {
      return this.getBaseType(typeNode.type);
    }
    
    if (typeNode.kind === Kind.NAMED_TYPE) {
      return typeNode.name.value;
    }
    
    return 'String';
  }

  /**
   * Get argument value from AST node
   */
  getArgumentValue(valueNode) {
    switch (valueNode.kind) {
      case Kind.INT:
        return parseInt(valueNode.value, 10);
      case Kind.FLOAT:
        return parseFloat(valueNode.value);
      case Kind.STRING:
        return valueNode.value;
      case Kind.BOOLEAN:
        return valueNode.value;
      case Kind.LIST:
        return valueNode.values.map(v => this.getArgumentValue(v));
      case Kind.OBJECT:
        return valueNode.fields.reduce((obj, field) => {
          obj[field.name.value] = this.getArgumentValue(field.value);
          return obj;
        }, {});
      default:
        return null;
    }
  }

  /**
   * Extract custom scalar validation rules
   */
  extractScalarRules(node) {
    const scalarName = node.name.value;
    
    // Built-in scalar validators
    const builtInScalars = {
      Email: this.validateEmail,
      URL: this.validateURL,
      DateTime: this.validateDateTime,
      Date: this.validateDate,
      Time: this.validateTime,
      JSON: this.validateJSON,
      UUID: this.validateUUID,
      PhoneNumber: this.validatePhoneNumber,
      PostalCode: this.validatePostalCode
    };

    if (builtInScalars[scalarName]) {
      this.customScalars.set(scalarName, builtInScalars[scalarName]);
    }
  }

  /**
   * Validate input against schema rules
   */
  validate(inputTypeName, data) {
    const rules = this.validationRules.get(inputTypeName);
    
    if (!rules) {
      // No validation rules for this type
      return { valid: true, errors: [] };
    }

    const errors = [];

    for (const [fieldName, fieldRules] of Object.entries(rules)) {
      const value = data[fieldName];
      const fieldErrors = this.validateField(fieldName, value, fieldRules);
      
      if (fieldErrors.length > 0) {
        errors.push(...fieldErrors);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate single field
   */
  validateField(fieldName, value, rules) {
    const errors = [];

    // Required check
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field: fieldName,
        constraint: 'required',
        message: `${fieldName} is required`
      });
      return errors; // Stop further validation if required field is missing
    }

    // Skip validation if value is null/undefined and not required
    if (value === undefined || value === null) {
      return errors;
    }

    // List validation
    if (rules.type?.list) {
      if (!Array.isArray(value)) {
        errors.push({
          field: fieldName,
          constraint: 'type',
          message: `${fieldName} must be an array`
        });
        return errors;
      }

      // Validate list items
      if (rules.minItems !== undefined && value.length < rules.minItems) {
        errors.push({
          field: fieldName,
          constraint: 'minItems',
          message: `${fieldName} must contain at least ${rules.minItems} items`
        });
      }

      if (rules.maxItems !== undefined && value.length > rules.maxItems) {
        errors.push({
          field: fieldName,
          constraint: 'maxItems',
          message: `${fieldName} must contain at most ${rules.maxItems} items`
        });
      }

      return errors;
    }

    // String validation
    if (typeof rules.type === 'string' && rules.type === 'String') {
      if (typeof value !== 'string') {
        errors.push({
          field: fieldName,
          constraint: 'type',
          message: `${fieldName} must be a string`
        });
        return errors;
      }

      if (rules.minLength !== undefined && value.length < rules.minLength) {
        errors.push({
          field: fieldName,
          constraint: 'minLength',
          message: `${fieldName} must be at least ${rules.minLength} characters`
        });
      }

      if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        errors.push({
          field: fieldName,
          constraint: 'maxLength',
          message: `${fieldName} must be at most ${rules.maxLength} characters`
        });
      }

      if (rules.pattern) {
        const regex = new RegExp(rules.pattern);
        if (!regex.test(value)) {
          errors.push({
            field: fieldName,
            constraint: 'pattern',
            message: `${fieldName} does not match required pattern`
          });
        }
      }

      if (rules.format) {
        const formatError = this.validateFormat(fieldName, value, rules.format);
        if (formatError) errors.push(formatError);
      }
    }

    // Number validation
    if (typeof rules.type === 'string' && (rules.type === 'Int' || rules.type === 'Float')) {
      const numValue = Number(value);
      
      if (isNaN(numValue)) {
        errors.push({
          field: fieldName,
          constraint: 'type',
          message: `${fieldName} must be a number`
        });
        return errors;
      }

      if (rules.min !== undefined && numValue < rules.min) {
        errors.push({
          field: fieldName,
          constraint: 'min',
          message: `${fieldName} must be at least ${rules.min}`
        });
      }

      if (rules.max !== undefined && numValue > rules.max) {
        errors.push({
          field: fieldName,
          constraint: 'max',
          message: `${fieldName} must be at most ${rules.max}`
        });
      }

      if (rules.exclusiveMin !== undefined && numValue <= rules.exclusiveMin) {
        errors.push({
          field: fieldName,
          constraint: 'exclusiveMin',
          message: `${fieldName} must be greater than ${rules.exclusiveMin}`
        });
      }

      if (rules.exclusiveMax !== undefined && numValue >= rules.exclusiveMax) {
        errors.push({
          field: fieldName,
          constraint: 'exclusiveMax',
          message: `${fieldName} must be less than ${rules.exclusiveMax}`
        });
      }
    }

    // Custom scalar validation
    if (rules.scalarValidator) {
      const scalarError = rules.scalarValidator.call(this, fieldName, value);
      if (scalarError) errors.push(scalarError);
    }

    return errors;
  }

  /**
   * Validate format (email, url, etc.)
   */
  validateFormat(fieldName, value, format) {
    const formatValidators = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      url: /^https?:\/\/.+/,
      uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      ipv4: /^(\d{1,3}\.){3}\d{1,3}$/,
      ipv6: /^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i
    };

    const regex = formatValidators[format];
    if (regex && !regex.test(value)) {
      return {
        field: fieldName,
        constraint: 'format',
        message: `${fieldName} must be a valid ${format}`
      };
    }

    return null;
  }

  // Built-in scalar validators
  
  validateEmail(fieldName, value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return {
        field: fieldName,
        constraint: 'email',
        message: `${fieldName} must be a valid email address`
      };
    }
  }

  validateURL(fieldName, value) {
    try {
      new URL(value);
      return null;
    } catch {
      return {
        field: fieldName,
        constraint: 'url',
        message: `${fieldName} must be a valid URL`
      };
    }
  }

  validateDateTime(fieldName, value) {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return {
        field: fieldName,
        constraint: 'datetime',
        message: `${fieldName} must be a valid date-time`
      };
    }
  }

  validateDate(fieldName, value) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(value)) {
      return {
        field: fieldName,
        constraint: 'date',
        message: `${fieldName} must be a valid date (YYYY-MM-DD)`
      };
    }
  }

  validateTime(fieldName, value) {
    const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;
    if (!timeRegex.test(value)) {
      return {
        field: fieldName,
        constraint: 'time',
        message: `${fieldName} must be a valid time (HH:MM or HH:MM:SS)`
      };
    }
  }

  validateJSON(fieldName, value) {
    if (typeof value === 'string') {
      try {
        JSON.parse(value);
      } catch {
        return {
          field: fieldName,
          constraint: 'json',
          message: `${fieldName} must be valid JSON`
        };
      }
    }
  }

  validateUUID(fieldName, value) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      return {
        field: fieldName,
        constraint: 'uuid',
        message: `${fieldName} must be a valid UUID`
      };
    }
  }

  validatePhoneNumber(fieldName, value) {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(value.replace(/[\s()-]/g, ''))) {
      return {
        field: fieldName,
        constraint: 'phone',
        message: `${fieldName} must be a valid phone number`
      };
    }
  }

  validatePostalCode(fieldName, value) {
    // Basic international postal code validation
    const postalRegex = /^[A-Z0-9\s-]{3,10}$/i;
    if (!postalRegex.test(value)) {
      return {
        field: fieldName,
        constraint: 'postalCode',
        message: `${fieldName} must be a valid postal code`
      };
    }
  }
}

/**
 * Create validation middleware from GraphQL schema
 */
export function createSchemaValidator(typeDefs) {
  return new GraphQLSchemaValidator(typeDefs);
}

export default GraphQLSchemaValidator;
