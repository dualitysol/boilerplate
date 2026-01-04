/**
 * Validation decorators
 */

/**
 * Validate input
 */
export function Validate(schema: any): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      const input = args[0]
      
      // Validate using schema
      const errors = validateSchema(input, schema)
      
      if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join(', ')}`)
      }
      
      return originalMethod.apply(this, args)
    }
  }
}

function validateSchema(data: any, schema: any): string[] {
  const errors: string[] = []
  
  for (const [key, rules] of Object.entries(schema)) {
    const value = data[key]
    const fieldRules = rules as any
    
    // Required check
    if (fieldRules.required && (value === undefined || value === null)) {
      errors.push(`${key} is required`)
      continue
    }
    
    if (value === undefined || value === null) continue
    
    // Type check
    if (fieldRules.type) {
      const actualType = typeof value
      if (actualType !== fieldRules.type) {
        errors.push(`${key} must be ${fieldRules.type}, got ${actualType}`)
      }
    }
    
    // Min/Max for numbers
    if (typeof value === 'number') {
      if (fieldRules.min !== undefined && value < fieldRules.min) {
        errors.push(`${key} must be >= ${fieldRules.min}`)
      }
      if (fieldRules.max !== undefined && value > fieldRules.max) {
        errors.push(`${key} must be <= ${fieldRules.max}`)
      }
    }
    
    // Length for strings
    if (typeof value === 'string') {
      if (fieldRules.minLength && value.length < fieldRules.minLength) {
        errors.push(`${key} must be at least ${fieldRules.minLength} characters`)
      }
      if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
        errors.push(`${key} must be at most ${fieldRules.maxLength} characters`)
      }
      if (fieldRules.pattern && !new RegExp(fieldRules.pattern).test(value)) {
        errors.push(`${key} does not match required pattern`)
      }
    }
    
    // Custom validator
    if (fieldRules.validator) {
      const result = fieldRules.validator(value)
      if (typeof result === 'string') {
        errors.push(result)
      } else if (result === false) {
        errors.push(`${key} validation failed`)
      }
    }
  }
  
  return errors
}

/**
 * Sanitize input
 */
export function Sanitize(options?: SanitizeOptions): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      const input = args[0]
      
      if (typeof input === 'object' && input !== null) {
        args[0] = sanitizeObject(input, options)
      }
      
      return originalMethod.apply(this, args)
    }
  }
}

interface SanitizeOptions {
  trim?: boolean
  lowercase?: boolean
  stripTags?: boolean
  escape?: boolean
}

function sanitizeObject(obj: any, options: SanitizeOptions = {}): any {
  const sanitized: any = {}
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      let sanitizedValue = value
      
      if (options.trim) {
        sanitizedValue = sanitizedValue.trim()
      }
      
      if (options.lowercase) {
        sanitizedValue = sanitizedValue.toLowerCase()
      }
      
      if (options.stripTags) {
        sanitizedValue = sanitizedValue.replace(/<[^>]*>/g, '')
      }
      
      if (options.escape) {
        sanitizedValue = sanitizedValue
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
      }
      
      sanitized[key] = sanitizedValue
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, options)
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}
