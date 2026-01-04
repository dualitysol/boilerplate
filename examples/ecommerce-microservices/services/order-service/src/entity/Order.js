/**
 * Order Entity
 * 
 * Represents a customer order in the e-commerce platform.
 * Manages order items, status, totals, and shipping information.
 * 
 * @entity Order
 * @collection orders
 * @table orders
 */
class Order {
  /**
   * Unique order identifier
   * @type {string}
   * @id
   * @generated
   */
  id

  /**
   * Order number (human-readable)
   * @type {string}
   * @required
   * @unique
   * @index
   */
  orderNumber

  /**
   * User ID who placed the order
   * @type {string}
   * @required
   * @index
   * @relation User
   */
  userId

  /**
   * Order status
   * @type {string}
   * @required
   * @enum PENDING,CONFIRMED,PROCESSING,SHIPPED,DELIVERED,CANCELLED,REFUNDED
   * @default PENDING
   * @index
   */
  status

  /**
   * Order items
   * @type {Object[]}
   * @required
   * @minLength 1
   */
  items

  /**
   * Subtotal (sum of item prices)
   * @type {number}
   * @required
   * @min 0
   * @precision 2
   */
  subtotal

  /**
   * Tax amount
   * @type {number}
   * @required
   * @min 0
   * @precision 2
   * @default 0
   */
  tax

  /**
   * Shipping cost
   * @type {number}
   * @required
   * @min 0
   * @precision 2
   * @default 0
   */
  shipping

  /**
   * Discount amount
   * @type {number}
   * @min 0
   * @precision 2
   * @default 0
   */
  discount

  /**
   * Total amount (subtotal + tax + shipping - discount)
   * @type {number}
   * @required
   * @min 0
   * @precision 2
   */
  total

  /**
   * Currency code
   * @type {string}
   * @required
   * @default USD
   * @maxLength 3
   */
  currency

  /**
   * Payment ID
   * @type {string}
   * @index
   */
  paymentId

  /**
   * Payment status
   * @type {string}
   * @required
   * @enum PENDING,PAID,FAILED,REFUNDED
   * @default PENDING
   * @index
   */
  paymentStatus

  /**
   * Payment method
   * @type {string}
   * @enum CREDIT_CARD,DEBIT_CARD,PAYPAL,STRIPE,CASH_ON_DELIVERY
   */
  paymentMethod

  /**
   * Shipping address
   * @type {Object}
   * @required
   * @properties street,city,state,country,postalCode
   */
  shippingAddress

  /**
   * Billing address
   * @type {Object}
   * @properties street,city,state,country,postalCode
   */
  billingAddress

  /**
   * Customer email
   * @type {string}
   * @required
   * @email
   * @index
   */
  customerEmail

  /**
   * Customer phone
   * @type {string}
   * @pattern ^\+?[0-9\s\-()]+$
   */
  customerPhone

  /**
   * Tracking number
   * @type {string}
   * @index
   */
  trackingNumber

  /**
   * Shipping carrier
   * @type {string}
   */
  shippingCarrier

  /**
   * Estimated delivery date
   * @type {Date}
   */
  estimatedDelivery

  /**
   * Actual delivery date
   * @type {Date}
   */
  deliveredAt

  /**
   * Order notes
   * @type {string}
   * @maxLength 1000
   */
  notes

  /**
   * Metadata
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
    this.orderNumber = data.orderNumber
    this.userId = data.userId
    this.status = data.status || 'PENDING'
    this.items = data.items || []
    this.subtotal = data.subtotal || 0
    this.tax = data.tax || 0
    this.shipping = data.shipping || 0
    this.discount = data.discount || 0
    this.total = data.total || 0
    this.currency = data.currency || 'USD'
    this.paymentId = data.paymentId
    this.paymentStatus = data.paymentStatus || 'PENDING'
    this.paymentMethod = data.paymentMethod
    this.shippingAddress = data.shippingAddress
    this.billingAddress = data.billingAddress
    this.customerEmail = data.customerEmail
    this.customerPhone = data.customerPhone
    this.trackingNumber = data.trackingNumber
    this.shippingCarrier = data.shippingCarrier
    this.estimatedDelivery = data.estimatedDelivery
    this.deliveredAt = data.deliveredAt
    this.notes = data.notes
    this.metadata = data.metadata || {}
    this.createdAt = data.createdAt || new Date()
    this.updatedAt = data.updatedAt || new Date()
  }

  /**
   * Generate order number
   * @returns {string}
   */
  generateOrderNumber() {
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 7).toUpperCase()
    this.orderNumber = `ORD-${timestamp}-${random}`
    return this.orderNumber
  }

  /**
   * Calculate totals from items
   */
  calculateTotals() {
    this.subtotal = this.items.reduce((sum, item) => {
      return sum + (item.price * item.quantity)
    }, 0)
    this.total = this.subtotal + this.tax + this.shipping - this.discount
  }

  /**
   * Add item to order
   * @param {Object} item
   */
  addItem(item) {
    this.items.push(item)
    this.calculateTotals()
  }

  /**
   * Remove item from order
   * @param {string} productId
   * @returns {boolean}
   */
  removeItem(productId) {
    const initialLength = this.items.length
    this.items = this.items.filter(item => item.productId !== productId)
    if (this.items.length < initialLength) {
      this.calculateTotals()
      return true
    }
    return false
  }

  /**
   * Update item quantity
   * @param {string} productId
   * @param {number} quantity
   * @returns {boolean}
   */
  updateItemQuantity(productId, quantity) {
    const item = this.items.find(i => i.productId === productId)
    if (!item) {
      return false
    }
    item.quantity = quantity
    this.calculateTotals()
    return true
  }

  /**
   * Get total item count
   * @returns {number}
   */
  getTotalItems() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0)
  }

  /**
   * Check if order can be cancelled
   * @returns {boolean}
   */
  canBeCancelled() {
    return ['PENDING', 'CONFIRMED'].includes(this.status)
  }

  /**
   * Check if order can be refunded
   * @returns {boolean}
   */
  canBeRefunded() {
    return ['DELIVERED'].includes(this.status) && this.paymentStatus === 'PAID'
  }

  /**
   * Mark as paid
   * @param {string} paymentId
   */
  markAsPaid(paymentId) {
    this.paymentStatus = 'PAID'
    this.paymentId = paymentId
    this.status = 'CONFIRMED'
  }

  /**
   * Mark as shipped
   * @param {string} trackingNumber
   * @param {string} carrier
   */
  markAsShipped(trackingNumber, carrier) {
    this.status = 'SHIPPED'
    this.trackingNumber = trackingNumber
    this.shippingCarrier = carrier
  }

  /**
   * Mark as delivered
   */
  markAsDelivered() {
    this.status = 'DELIVERED'
    this.deliveredAt = new Date()
  }

  /**
   * Cancel order
   * @param {string} reason
   */
  cancel(reason) {
    if (!this.canBeCancelled()) {
      throw new Error('Order cannot be cancelled')
    }
    this.status = 'CANCELLED'
    this.notes = (this.notes ? this.notes + '\n' : '') + `Cancelled: ${reason}`
  }

  /**
   * Before insert hook
   * @lifecycle beforeInsert
   */
  beforeInsert() {
    if (!this.orderNumber) {
      this.generateOrderNumber()
    }
    if (this.items.length > 0) {
      this.calculateTotals()
    }
  }

  /**
   * Before update hook
   * @lifecycle beforeUpdate
   */
  beforeUpdate() {
    this.updatedAt = new Date()
  }
}

module.exports = Order
