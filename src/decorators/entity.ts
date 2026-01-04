/**
 * Entity decorators for TypeScript
 * Auto-generate GraphQL types and database schemas from entities
 */

import 'reflect-metadata'

/**
 * Mark class as entity
 */
export function Entity(options?: EntityOptions): ClassDecorator {
  return function (target: any) {
    Reflect.defineMetadata('entity:name', options?.name || target.name, target)
    Reflect.defineMetadata('entity:collection', options?.collection || target.name.toLowerCase() + 's', target)
    Reflect.defineMetadata('entity:table', options?.table, target)
    Reflect.defineMetadata('entity:description', options?.description, target)
  }
}

/**
 * Entity options
 */
export interface EntityOptions {
  /**
   * Entity name (defaults to class name)
   */
  name?: string
  
  /**
   * MongoDB collection name
   */
  collection?: string
  
  /**
   * SQL table name
   */
  table?: string
  
  /**
   * Description for GraphQL
   */
  description?: string
}

/**
 * Mark property as field
 */
export function Field(options?: FieldOptions): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol) {
    const fields = Reflect.getMetadata('entity:fields', target.constructor) || []
    fields.push({
      name: propertyKey,
      ...options,
      type: options?.type || Reflect.getMetadata('design:type', target, propertyKey)
    })
    Reflect.defineMetadata('entity:fields', fields, target.constructor)
  }
}

/**
 * Field options
 */
export interface FieldOptions {
  /**
   * GraphQL type
   */
  type?: any
  
  /**
   * Field is nullable
   */
  nullable?: boolean
  
  /**
   * Field description for GraphQL
   */
  description?: string
  
  /**
   * Database column options
   */
  db?: {
    /**
     * Column name (defaults to field name)
     */
    name?: string
    
    /**
     * Database type override
     */
    type?: string
    
    /**
     * Is primary key
     */
    primary?: boolean
    
    /**
     * Is unique
     */
    unique?: boolean
    
    /**
     * Default value
     */
    default?: any
    
    /**
     * Index this field
     */
    index?: boolean
    
    /**
     * Field length (for strings)
     */
    length?: number
  }
  
  /**
   * Validation rules
   */
  validation?: {
    /**
     * Minimum value/length
     */
    min?: number
    
    /**
     * Maximum value/length
     */
    max?: number
    
    /**
     * Pattern (regex)
     */
    pattern?: string
    
    /**
     * Email validation
     */
    email?: boolean
    
    /**
     * URL validation
     */
    url?: boolean
    
    /**
     * Custom validator function
     */
    custom?: (value: any) => boolean | string
  }
}

/**
 * Mark field as ID
 */
export function ID(options?: Omit<FieldOptions, 'type'>): PropertyDecorator {
  return Field({
    ...options,
    type: 'ID',
    db: {
      ...options?.db,
      primary: true
    }
  })
}

/**
 * Mark field as required (non-nullable)
 */
export function Required(): PropertyDecorator {
  return Field({ nullable: false })
}

/**
 * Mark field as unique
 */
export function Unique(): PropertyDecorator {
  return Field({ db: { unique: true } })
}

/**
 * Add index to field
 */
export function Index(): PropertyDecorator {
  return Field({ db: { index: true } })
}

/**
 * Mark field as relation to another entity
 */
export function Relation(options: RelationOptions): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol) {
    const relations = Reflect.getMetadata('entity:relations', target.constructor) || []
    relations.push({
      name: propertyKey,
      ...options
    })
    Reflect.defineMetadata('entity:relations', relations, target.constructor)
  }
}

/**
 * Relation options
 */
export interface RelationOptions {
  /**
   * Related entity type
   */
  type: () => any
  
  /**
   * Relation type
   */
  kind: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many'
  
  /**
   * Foreign key field name
   */
  foreignKey?: string
  
  /**
   * Join table for many-to-many
   */
  joinTable?: string
  
  /**
   * Cascade operations
   */
  cascade?: ('insert' | 'update' | 'delete')[]
  
  /**
   * Lazy load relation
   */
  lazy?: boolean
}

/**
 * Mark method as resolver for GraphQL
 */
export function Resolver(options?: ResolverOptions): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const resolvers = Reflect.getMetadata('entity:resolvers', target.constructor) || []
    resolvers.push({
      name: propertyKey,
      ...options
    })
    Reflect.defineMetadata('entity:resolvers', resolvers, target.constructor)
  }
}

/**
 * Resolver options
 */
export interface ResolverOptions {
  /**
   * GraphQL operation type
   */
  type: 'query' | 'mutation' | 'field'
  
  /**
   * Return type
   */
  returns?: any
  
  /**
   * Description
   */
  description?: string
  
  /**
   * Arguments
   */
  args?: Record<string, { type: any; description?: string; nullable?: boolean }>
}

/**
 * Mark method as GraphQL query
 */
export function Query(options?: Omit<ResolverOptions, 'type'>): MethodDecorator {
  return Resolver({ ...options, type: 'query' })
}

/**
 * Mark method as GraphQL mutation
 */
export function Mutation(options?: Omit<ResolverOptions, 'type'>): MethodDecorator {
  return Resolver({ ...options, type: 'mutation' })
}

/**
 * Enum for GraphQL
 */
export function GraphQLEnum(values: string[] | Record<string, string>): ClassDecorator {
  return function (target: any) {
    Reflect.defineMetadata('graphql:enum', values, target)
  }
}

/**
 * Input type for GraphQL
 */
export function InputType(options?: { description?: string }): ClassDecorator {
  return function (target: any) {
    Reflect.defineMetadata('graphql:input', true, target)
    Reflect.defineMetadata('graphql:description', options?.description, target)
  }
}

/**
 * Hook decorators
 */

/**
 * Before insert hook
 */
export function BeforeInsert(): MethodDecorator {
  return function (target: any, propertyKey: string | symbol) {
    Reflect.defineMetadata('hook:beforeInsert', propertyKey, target.constructor)
  }
}

/**
 * After insert hook
 */
export function AfterInsert(): MethodDecorator {
  return function (target: any, propertyKey: string | symbol) {
    Reflect.defineMetadata('hook:afterInsert', propertyKey, target.constructor)
  }
}

/**
 * Before update hook
 */
export function BeforeUpdate(): MethodDecorator {
  return function (target: any, propertyKey: string | symbol) {
    Reflect.defineMetadata('hook:beforeUpdate', propertyKey, target.constructor)
  }
}

/**
 * After update hook
 */
export function AfterUpdate(): MethodDecorator {
  return function (target: any, propertyKey: string | symbol) {
    Reflect.defineMetadata('hook:afterUpdate', propertyKey, target.constructor)
  }
}

/**
 * Before delete hook
 */
export function BeforeDelete(): MethodDecorator {
  return function (target: any, propertyKey: string | symbol) {
    Reflect.defineMetadata('hook:beforeDelete', propertyKey, target.constructor)
  }
}

/**
 * After delete hook
 */
export function AfterDelete(): MethodDecorator {
  return function (target: any, propertyKey: string | symbol) {
    Reflect.defineMetadata('hook:afterDelete', propertyKey, target.constructor)
  }
}
