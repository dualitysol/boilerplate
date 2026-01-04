/**
 * Product Entity
 * 
 * Represents a product in the e-commerce catalog.
 * Handles product information, pricing, inventory, and categorization.
 * 
 * @entity Product
 * @collection products
 * @table products
 */
class Product {
  /**
   * Unique product identifier
   * @type {string}
   * @id
   * @generated
   */
  id

  /**
   * Product name/title
   * @type {string}
   * @required
   * @minLength 1
   * @maxLength 255
   * @index
   */
  name

  /**
   * Product slug for URLs
   * @type {string}
   * @required
   * @unique
   * @index
   * @pattern ^[a-z0-9-]+$
   */
  slug

  /**
   * Product description
   * @type {string}
   * @required
   * @minLength 10
   * @maxLength 5000
   */
  description

  /**
   * Short product description
   * @type {string}
   * @maxLength 500
   */
  shortDescription

  /**
   * Product SKU
   * @type {string}
   * @required
   * @unique
   * @index
   * @maxLength 100
   */
  sku

  /**
   * Product price
   * @type {number}
   * @required
   * @min 0
   * @precision 2
   */
  price

  /**
   * Product currency
   * @type {string}
   * @required
   * @default USD
   * @maxLength 3
   */
  currency

  /**
   * Compare at price (for discounts)
   * @type {number}
   * @min 0
   * @precision 2
   */
  compareAtPrice

  /**
   * Cost per item
   * @type {number}
   * @min 0
   * @precision 2
   * @private
   */
  cost

  /**
   * Stock quantity
   * @type {number}
   * @required
   * @min 0
   * @default 0
   * @index
   */
  stock

  /**
   * Low stock threshold
   * @type {number}
   * @min 0
   * @default 10
   */
  lowStockThreshold

  /**
   * Whether product is in stock
   * @type {boolean}
   * @required
   * @default true
   * @index
   */
  inStock

  /**
   * Product category
   * @type {string}
   * @required
   * @index
   */
  category

  /**
   * Product tags
   * @type {string[]}
   * @default []
   */
  tags

  /**
   * Product images
   * @type {string[]}
   * @default []
   */
  images

  /**
   * Featured image URL
   * @type {string}
   * @url
   */
  featuredImage

  /**
   * Product weight in kg
   * @type {number}
   * @min 0
   * @precision 2
   */
  weight

  /**
   * Product dimensions (LxWxH in cm)
   * @type {Object}
   * @properties length,width,height
   */
  dimensions

  /**
   * Whether product is published
   * @type {boolean}
   * @required
   * @default false
   * @index
   */
  published

  /**
   * Whether product is featured
   * @type {boolean}
   * @required
   * @default false
   * @index
   */
  featured

  /**
   * Product rating (0-5)
   * @type {number}
   * @min 0
   * @max 5
   * @default 0
   * @precision 2
   */
  rating

  /**
   * Number of reviews
   * @type {number}
   * @min 0
   * @default 0
   */
  reviewCount

  /**
   * Product metadata
   * @type {Object}
   * @default {}
   */
  metadata

  /**
   * Created timestamp
   * @type {Date}
   * @required
   * @default now
   * @index
   */
  createdAt

  /**
   * Updated timestamp
   * @type {Date}
   * @required
   * @default now
   */
  updatedAt

  constructor(data = {}) {
    this.id = data.id
    this.name = data.name
    this.slug = data.slug
    this.description = data.description
    this.shortDescription = data.shortDescription
    this.sku = data.sku
    this.price = data.price
    this.currency = data.currency || 'USD'
    this.compareAtPrice = data.compareAtPrice
    this.cost = data.cost
    this.stock = data.stock || 0
    this.lowStockThreshold = data.lowStockThreshold || 10
    this.inStock = data.inStock !== false
    this.category = data.category
    this.tags = data.tags || []
    this.images = data.images || []
    this.featuredImage = data.featuredImage
    this.weight = data.weight
    this.dimensions = data.dimensions
    this.published = data.published || false
    this.featured = data.featured || false
    this.rating = data.rating || 0
    this.reviewCount = data.reviewCount || 0
    this.metadata = data.metadata || {}
    this.createdAt = data.createdAt || new Date()
    this.updatedAt = data.updatedAt || new Date()
  }

  /**
   * Check if product is on sale
   * @returns {boolean}
   */
  isOnSale() {
    return this.compareAtPrice && this.compareAtPrice > this.price
  }

  /**
   * Calculate discount percentage
   * @returns {number}
   */
  getDiscountPercentage() {
    if (!this.isOnSale()) {
      return 0
    }
    return Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100)
  }

  /**
   * Calculate profit margin
   * @returns {number}
   */
  getProfitMargin() {
    if (!this.cost) {
      return 0
    }
    return ((this.price - this.cost) / this.price) * 100
  }

  /**
   * Check if stock is low
   * @returns {boolean}
   */
  isLowStock() {
    return this.stock > 0 && this.stock <= this.lowStockThreshold
  }

  /**
   * Check if product is out of stock
   * @returns {boolean}
   */
  isOutOfStock() {
    return this.stock === 0
  }

  /**
   * Decrease stock
   * @param {number} quantity
   * @returns {boolean}
   */
  decreaseStock(quantity) {
    if (this.stock < quantity) {
      return false
    }
    this.stock -= quantity
    this.inStock = this.stock > 0
    return true
  }

  /**
   * Increase stock
   * @param {number} quantity
   */
  increaseStock(quantity) {
    this.stock += quantity
    this.inStock = this.stock > 0
  }

  /**
   * Add review and update rating
   * @param {number} rating
   */
  addReview(rating) {
    const totalRating = this.rating * this.reviewCount
    this.reviewCount += 1
    this.rating = (totalRating + rating) / this.reviewCount
  }

  /**
   * Generate slug from name
   * @returns {string}
   */
  generateSlug() {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    return this.slug
  }

  /**
   * Before update hook
   * @lifecycle beforeUpdate
   */
  beforeUpdate() {
    this.updatedAt = new Date()
  }

  /**
   * Before insert hook
   * @lifecycle beforeInsert
   */
  beforeInsert() {
    if (!this.slug) {
      this.generateSlug()
    }
  }
}

module.exports = Product
