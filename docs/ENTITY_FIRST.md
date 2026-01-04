# Entity-First Development Guide

## Overview

The Boilerplate framework now supports **Entity-First Development** - a powerful approach where you define your data models once as entity classes, and automatically generate:

- ✅ GraphQL type definitions
- ✅ Database schemas (MongoDB/PostgreSQL/MySQL)
- ✅ TypeScript types
- ✅ Migrations
- ✅ Resolvers (if needed)

This eliminates duplication and keeps your GraphQL schema, database schema, and TypeScript types in perfect sync.

## Table of Contents

- [Quick Start](#quick-start)
- [TypeScript Entities](#typescript-entities)
- [JavaScript Entities](#javascript-entities)
- [Decorators Reference](#decorators-reference)
- [Sync Command](#sync-command)
- [Migration System](#migration-system)
- [Best Practices](#best-practices)

## Quick Start

### 1. Create a Service with Entity

```bash
# Generate a new service (entity folder is created automatically)
bp service new ProductService

# The structure will be:
ProductService/
  entity/
    Product.ts      # 👈 Define your entity here
  model/
  resolvers/
  typeDefinitions/
  queryMutation/
  tests/
```

### 2. Define Your Entity (TypeScript)

```typescript
// services/ProductService/entity/Product.ts
import { Entity, Field, ID, Relation } from '@dualitysol/boilerplate/decorators'

@Entity({
  name: 'Product',
  collection: 'products',
  table: 'products',
  description: 'Product entity'
})
export class Product {
  @ID({ db: { primary: true } })
  id: string

  @Field({
    type: 'string',
    nullable: false,
    description: 'Product name',
    db: { index: true, unique: true },
    validation: { minLength: 1, maxLength: 255 }
  })
  name: string

  @Field({
    type: 'string',
    nullable: true,
    description: 'Product description',
    validation: { maxLength: 5000 }
  })
  description?: string

  @Field({
    type: 'number',
    nullable: false,
    description: 'Product price',
    validation: { min: 0 }
  })
  price: number

  @Field({
    type: 'number',
    nullable: false,
    description: 'Available stock',
    db: { default: 0 },
    validation: { min: 0 }
  })
  stock: number

  @Relation({
    type: () => Category,
    kind: 'many-to-one',
    foreignKey: 'categoryId'
  })
  category: Category

  @Field({ type: 'Date', nullable: false })
  createdAt: Date

  @Field({ type: 'Date', nullable: false })
  updatedAt: Date
}
```

### 3. Sync Everything

```bash
# Sync single entity
npm run sync:entity ProductService Product

# Or sync all entities in all services
npm run sync:entity --all
```

This command will:
1. ✅ Parse your entity definition
2. ✅ Generate GraphQL schema (`typeDefinitions/Product.ts`)
3. ✅ Generate database migration (`migrations/2024-01-01-create-product.js`)
4. ✅ Generate/update resolvers (if they don't exist)

### 4. Generated GraphQL Schema

```graphql
# typeDefinitions/Product.gql (auto-generated)
type Product {
  id: ID!
  name: String!
  description: String
  price: Int!
  stock: Int!
  category: Category!
  createdAt: String!
  updatedAt: String!
}

extend type Query {
  product(id: ID!): Product
  products(limit: Int = 10, offset: Int = 0): [Product!]!
}

extend type Mutation {
  createProduct(input: CreateProductInput!): Product!
  updateProduct(id: ID!, input: UpdateProductInput!): Product!
  deleteProduct(id: ID!): Boolean!
}

input CreateProductInput {
  name: String!
  description: String
  price: Int!
  stock: Int!
  categoryId: ID!
}

input UpdateProductInput {
  name: String
  description: String
  price: Int
  stock: Int
  categoryId: ID
}
```

### 5. Generated Migration (MongoDB)

```javascript
// migrations/2024-01-01-create-product.js (auto-generated)
module.exports = {
  async up(db) {
    await db.createCollection('products', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['name', 'price', 'stock'],
          properties: {
            name: { bsonType: 'string' },
            description: { bsonType: 'string' },
            price: { bsonType: 'number' },
            stock: { bsonType: 'number' },
            categoryId: { bsonType: 'string' },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' }
          }
        }
      }
    })
    
    // Create indexes
    await db.collection('products').createIndex(
      { name: 1 },
      { unique: true }
    )
  },
  
  async down(db) {
    await db.collection('products').drop()
  }
}
```

### 6. Generated Migration (PostgreSQL)

```sql
-- migrations/2024-01-01-create-product.sql (auto-generated)
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  category_id INTEGER,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_product_name ON products(name);
```

## TypeScript Entities

### Complete Example

```typescript
import {
  Entity,
  Field,
  ID,
  Required,
  Unique,
  Index,
  Relation,
  BeforeInsert,
  BeforeUpdate
} from '@dualitysol/boilerplate/decorators'

@Entity({
  name: 'User',
  collection: 'users',
  description: 'User account'
})
export class User {
  @ID()
  id: string

  @Field({
    type: 'string',
    nullable: false,
    description: 'User email',
    db: { unique: true, index: true },
    validation: { email: true }
  })
  email: string

  @Field({
    type: 'string',
    nullable: false,
    description: 'User name',
    db: { index: true },
    validation: { minLength: 2, maxLength: 100 }
  })
  name: string

  @Field({
    type: 'string',
    nullable: true,
    description: 'Avatar URL',
    validation: { url: true }
  })
  avatar?: string

  @Field({
    type: 'boolean',
    nullable: false,
    description: 'Is email verified',
    db: { default: false }
  })
  emailVerified: boolean

  @Relation({
    type: () => Post,
    kind: 'one-to-many',
    foreignKey: 'authorId',
    cascade: ['delete']
  })
  posts: Post[]

  @Field({ type: 'Date', nullable: false })
  createdAt: Date

  @Field({ type: 'Date', nullable: false })
  updatedAt: Date

  @BeforeInsert()
  beforeInsert() {
    this.createdAt = new Date()
    this.updatedAt = new Date()
    this.emailVerified = false
  }

  @BeforeUpdate()
  beforeUpdate() {
    this.updatedAt = new Date()
  }
}
```

## JavaScript Entities

For JavaScript projects, you can use JSDoc comments to define types:

### Complete Example

```javascript
// services/ProductService/entity/Product.js

/**
 * @file Product Entity
 * @description Product data model
 */

/**
 * Product Entity Class
 * @class
 */
class Product {
  /**
   * @type {string}
   * @description Unique identifier
   */
  id

  /**
   * @type {string}
   * @description Product name
   * @required
   * @unique
   * @minLength 1
   * @maxLength 255
   */
  name

  /**
   * @type {string|undefined}
   * @description Product description
   * @maxLength 5000
   */
  description

  /**
   * @type {number}
   * @description Product price
   * @required
   * @min 0
   */
  price

  /**
   * @type {number}
   * @description Available stock
   * @required
   * @default 0
   * @min 0
   */
  stock

  /**
   * @type {Date}
   * @description Creation date
   * @required
   */
  createdAt

  /**
   * @type {Date}
   * @description Last update date
   * @required
   */
  updatedAt

  constructor(data) {
    this.id = data.id || generateId()
    this.name = data.name
    this.description = data.description
    this.price = data.price
    this.stock = data.stock || 0
    this.createdAt = data.createdAt || new Date()
    this.updatedAt = data.updatedAt || new Date()
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

module.exports = { Product }
```

### Auto-Generate .d.ts from JSDoc

```bash
# The sync command will automatically generate Product.d.ts
npm run sync:entity ProductService Product
```

Generated `Product.d.ts`:

```typescript
export declare class Product {
  id: string
  name: string
  description?: string
  price: number
  stock: number
  createdAt: Date
  updatedAt: Date
}
```

## Decorators Reference

### Class Decorators

#### `@Entity(options)`

Mark a class as an entity.

```typescript
@Entity({
  name: 'User',           // Entity name (default: class name)
  collection: 'users',    // MongoDB collection
  table: 'users',         // SQL table
  description: 'User'     // GraphQL description
})
```

### Field Decorators

#### `@Field(options)`

Define a field with full configuration.

```typescript
@Field({
  type: 'string',         // GraphQL type
  nullable: false,        // Is nullable?
  description: 'Name',    // GraphQL description
  
  db: {
    name: 'user_name',    // Database column name
    type: 'VARCHAR(255)', // Override database type
    primary: false,       // Is primary key?
    unique: false,        // Is unique?
    index: true,          // Create index?
    default: 'value',     // Default value
    length: 255           // String length
  },
  
  validation: {
    min: 0,               // Min value/length
    max: 100,             // Max value/length
    minLength: 1,         // Min string length
    maxLength: 255,       // Max string length
    pattern: '^[A-Z]',    // Regex pattern
    email: true,          // Email validation
    url: true,            // URL validation
    custom: (val) => true // Custom validator
  }
})
name: string
```

#### `@ID(options)`

Mark field as primary key.

```typescript
@ID({ db: { primary: true } })
id: string
```

#### `@Required()`

Mark field as required (non-nullable).

```typescript
@Required()
email: string
```

#### `@Unique()`

Mark field as unique.

```typescript
@Unique()
username: string
```

#### `@Index()`

Create database index on field.

```typescript
@Index()
email: string
```

### Relation Decorators

#### `@Relation(options)`

Define relation to another entity.

```typescript
@Relation({
  type: () => Category,        // Related entity
  kind: 'many-to-one',         // Relation type
  foreignKey: 'categoryId',    // Foreign key field
  joinTable: 'product_tags',   // Join table (many-to-many)
  cascade: ['delete'],         // Cascade operations
  lazy: true                   // Lazy load?
})
category: Category
```

Relation types:
- `one-to-one`
- `one-to-many`
- `many-to-one`
- `many-to-many`

### Hook Decorators

#### Lifecycle Hooks

```typescript
@BeforeInsert()
beforeInsert() {
  this.createdAt = new Date()
}

@AfterInsert()
afterInsert() {
  console.log('Created:', this.id)
}

@BeforeUpdate()
beforeUpdate() {
  this.updatedAt = new Date()
}

@AfterUpdate()
afterUpdate() {
  console.log('Updated:', this.id)
}

@BeforeDelete()
beforeDelete() {
  console.log('Deleting:', this.id)
}

@AfterDelete()
afterDelete() {
  console.log('Deleted:', this.id)
}
```

## Sync Command

### Sync Single Entity

```bash
npm run sync:entity ServiceName EntityName
```

Example:
```bash
npm run sync:entity UserService User
```

### Sync All Entities

```bash
npm run sync:entity --all
```

### What Gets Synced?

1. **GraphQL Schema** - `typeDefinitions/EntityName.ts`
2. **Database Migration** - `migrations/TIMESTAMP-create-entityname.js|sql`
3. **Resolvers** (if missing) - `resolvers/EntityName.ts`

### Workflow

```
┌─────────────────┐
│  Entity.ts      │  👈 Single source of truth
└────────┬────────┘
         │
         │ npm run sync:entity
         │
         ├─────────────┬─────────────┬──────────────┐
         ▼             ▼             ▼              ▼
    ┌────────┐   ┌─────────┐   ┌──────────┐   ┌──────────┐
    │GraphQL │   │Database │   │Resolver  │   │   TS     │
    │ Schema │   │Migration│   │(if new)  │   │  Types   │
    └────────┘   └─────────┘   └──────────┘   └──────────┘
```

## Migration System

All migrations are stored in `migrations/` at project root.

### MongoDB Migration

```javascript
// migrations/2024-01-15-123456-create-product.js
module.exports = {
  async up(db) {
    // Create collection
    // Add indexes
  },
  
  async down(db) {
    // Rollback
  }
}
```

### SQL Migration

```sql
-- migrations/2024-01-15-123456-create-product.sql
CREATE TABLE products (...);
CREATE INDEX ...;
```

### Running Migrations

```bash
# TODO: Migration runner to be implemented
npm run migrate:up
npm run migrate:down
npm run migrate:status
```

## Best Practices

### 1. Define Entity First

Always start with the entity definition. Don't manually create GraphQL schemas or database schemas.

✅ **Good:**
```typescript
// 1. Define entity
@Entity()
class Product { ... }

// 2. Run sync
npm run sync:entity ProductService Product
```

❌ **Bad:**
```typescript
// Manually creating GraphQL schema, DB schema, etc.
```

### 2. Use Validation

Add validation rules in entity to ensure data integrity:

```typescript
@Field({
  validation: {
    minLength: 1,
    maxLength: 255,
    pattern: '^[A-Za-z0-9 ]+$'
  }
})
name: string
```

### 3. Use Lifecycle Hooks

Automate common tasks:

```typescript
@BeforeInsert()
beforeInsert() {
  this.createdAt = new Date()
  this.id = generateId()
}

@BeforeUpdate()
beforeUpdate() {
  this.updatedAt = new Date()
}
```

### 4. Keep Entities Focused

One entity per file, focused on a single domain concept:

```
✅ Product.ts       - Product data
✅ Category.ts      - Category data
✅ User.ts          - User data

❌ Everything.ts    - All entities in one file
```

### 5. Use Relations Properly

Define relations from both sides:

```typescript
// Product.ts
@Relation({ type: () => Category, kind: 'many-to-one' })
category: Category

// Category.ts
@Relation({ type: () => Product, kind: 'one-to-many' })
products: Product[]
```

### 6. Sync After Every Change

Whenever you modify an entity, run sync:

```bash
# Edit entity
vim services/ProductService/entity/Product.ts

# Sync changes
npm run sync:entity ProductService Product
```

## Troubleshooting

### Issue: TypeScript Errors in Generated Files

**Solution:** Run TypeScript compiler to check:
```bash
npx tsc --noEmit
```

### Issue: Migration Already Exists

**Solution:** Migrations are timestamped. If you need to regenerate, delete the old one first.

### Issue: GraphQL Schema Not Updating

**Solution:** Make sure you run `npm run sync:entity` after entity changes.

### Issue: JSDoc Not Generating .d.ts

**Solution:** Ensure JSDoc comments are properly formatted:
```javascript
/**
 * @type {string}
 * @description Field description
 */
fieldName
```

## Summary

Entity-First Development gives you:

✅ **Single Source of Truth** - Define data model once  
✅ **Auto-Generation** - GraphQL, DB schemas, types  
✅ **Type Safety** - Full TypeScript support  
✅ **Validation** - Built-in validation rules  
✅ **Migrations** - Automatic migration generation  
✅ **Consistency** - Everything stays in sync  

Start with the entity, run `sync:entity`, and you're done! 🚀
