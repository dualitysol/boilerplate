/**
 * Example: Product Entity with Full Decorator Usage
 * Demonstrates entity-first development
 */

import {
  Entity,
  Field,
  ID,
  Relation,
  BeforeInsert,
  BeforeUpdate,
  BeforeDelete,
  Query,
  Mutation
} from '@dualitysol/boilerplate/decorators'

/**
 * Product Category Enum
 */
export enum ProductCategory {
  ELECTRONICS = 'electronics',
  CLOTHING = 'clothing',
  BOOKS = 'books',
  HOME = 'home',
  SPORTS = 'sports'
}

/**
 * Product Entity
 * 
 * After defining this entity, run:
 *   npm run sync:entity ProductService Product
 * 
 * This will auto-generate:
 *   - GraphQL schema (typeDefinitions/Product.ts)
 *   - Database migration (migrations/TIMESTAMP-create-product.js)
 *   - Resolvers (if missing)
 */
@Entity({
  name: 'Product',
  collection: 'products',
  description: 'Product entity for e-commerce platform'
})
export class Product {
  @ID({ 
    db: { primary: true } 
  })
  id: string

  @Field({
    type: 'string',
    nullable: false,
    description: 'Product name',
    db: { 
      index: true,
      length: 255
    },
    validation: {
      minLength: 1,
      maxLength: 255
    }
  })
  name: string

  @Field({
    type: 'string',
    nullable: false,
    description: 'Product slug (URL-friendly)',
    db: { 
      unique: true,
      index: true 
    },
    validation: {
      pattern: '^[a-z0-9-]+$'
    }
  })
  slug: string

  @Field({
    type: 'string',
    nullable: true,
    description: 'Product description',
    validation: {
      maxLength: 5000
    }
  })
  description?: string

  @Field({
    type: 'number',
    nullable: false,
    description: 'Product price in cents',
    validation: {
      min: 0
    }
  })
  price: number

  @Field({
    type: 'number',
    nullable: false,
    description: 'Available stock quantity',
    db: { 
      default: 0,
      index: true
    },
    validation: {
      min: 0
    }
  })
  stock: number

  @Field({
    type: 'string',
    nullable: false,
    description: 'Product category'
  })
  category: ProductCategory

  @Field({
    type: 'string[]',
    nullable: true,
    description: 'Product image URLs'
  })
  images?: string[]

  @Field({
    type: 'string[]',
    nullable: true,
    description: 'Product tags for search'
  })
  tags?: string[]

  @Field({
    type: 'boolean',
    nullable: false,
    description: 'Is product active',
    db: { 
      default: true,
      index: true
    }
  })
  isActive: boolean

  @Field({
    type: 'boolean',
    nullable: false,
    description: 'Is product featured',
    db: { default: false }
  })
  isFeatured: boolean

  @Field({
    type: 'number',
    nullable: false,
    description: 'Average rating (0-5)',
    db: { default: 0 }
  })
  rating: number

  @Field({
    type: 'number',
    nullable: false,
    description: 'Number of reviews',
    db: { default: 0 }
  })
  reviewCount: number

  @Relation({
    type: () => Category,
    kind: 'many-to-one',
    foreignKey: 'categoryId'
  })
  categoryRelation: Category

  @Relation({
    type: () => Review,
    kind: 'one-to-many',
    foreignKey: 'productId',
    cascade: ['delete']
  })
  reviews: Review[]

  @Field({
    type: 'Date',
    nullable: false,
    description: 'Creation timestamp',
    db: { index: true }
  })
  createdAt: Date

  @Field({
    type: 'Date',
    nullable: false,
    description: 'Last update timestamp'
  })
  updatedAt: Date

  @Field({
    type: 'Date',
    nullable: true,
    description: 'Deletion timestamp (soft delete)'
  })
  deletedAt?: Date

  /**
   * Lifecycle Hooks
   */

  @BeforeInsert()
  beforeInsert() {
    this.createdAt = new Date()
    this.updatedAt = new Date()
    this.isActive = true
    this.rating = 0
    this.reviewCount = 0
    
    // Generate slug from name if not provided
    if (!this.slug) {
      this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    }
  }

  @BeforeUpdate()
  beforeUpdate() {
    this.updatedAt = new Date()
  }

  @BeforeDelete()
  beforeDelete() {
    // Soft delete
    this.deletedAt = new Date()
    this.isActive = false
  }

  /**
   * Custom Methods (will be available in GraphQL resolvers)
   */

  calculateDiscount(percentage: number): number {
    return Math.round(this.price * (1 - percentage / 100))
  }

  isInStock(): boolean {
    return this.stock > 0
  }

  canBePurchased(quantity: number): boolean {
    return this.isActive && this.stock >= quantity
  }
}

/**
 * Category Entity (for relation demonstration)
 */
@Entity({ name: 'Category', collection: 'categories' })
export class Category {
  @ID()
  id: string

  @Field({ type: 'string', nullable: false })
  name: string

  @Field({ type: 'string', nullable: false, db: { unique: true } })
  slug: string

  @Relation({
    type: () => Product,
    kind: 'one-to-many',
    foreignKey: 'categoryId'
  })
  products: Product[]

  @Field({ type: 'Date', nullable: false })
  createdAt: Date
}

/**
 * Review Entity (for relation demonstration)
 */
@Entity({ name: 'Review', collection: 'reviews' })
export class Review {
  @ID()
  id: string

  @Field({ type: 'string', nullable: false })
  productId: string

  @Field({ type: 'string', nullable: false })
  userId: string

  @Field({ type: 'number', nullable: false, validation: { min: 1, max: 5 } })
  rating: number

  @Field({ type: 'string', nullable: true })
  comment?: string

  @Relation({
    type: () => Product,
    kind: 'many-to-one',
    foreignKey: 'productId'
  })
  product: Product

  @Field({ type: 'Date', nullable: false })
  createdAt: Date
}
