/**
 * Payment Entity
 * 
 * Represents a payment transaction in the e-commerce platform.
 * Handles payment processing, status tracking, and transaction details.
 * 
 * @entity Payment
 * @collection payments
 * @table payments
 */
class Payment {
  /**
   * Unique payment identifier
   * @type {string}
   * @id
   * @generated
   */
  id

  /**
   * Order ID associated with payment
   * @type {string}
   * @required
   * @index
   * @relation Order
   */
  orderId

  /**
   * User ID who made the payment
   * @type {string}
   * @required
   * @index
   * @relation User
   */
  userId

  /**
   * Payment status
   * @type {string}
   * @required
   * @enum PENDING,PROCESSING,COMPLETED,FAILED,CANCELLED,REFUNDED,PARTIALLY_REFUNDED
   * @default PENDING
   * @index
   */
  status

  /**
   * Payment method
   * @type {string}
   * @required
   * @enum CREDIT_CARD,DEBIT_CARD,PAYPAL,STRIPE,BANK_TRANSFER,CASH_ON_DELIVERY
   * @index
   */
  method

  /**
   * Payment amount
   * @type {number}
   * @required
   * @min 0
   * @precision 2
   */
  amount

  /**
   * Currency code
   * @type {string}
   * @required
   * @default USD
   * @maxLength 3
   */
  currency

  /**
   * Refunded amount
   * @type {number}
   * @min 0
   * @precision 2
   * @default 0
   */
  refundedAmount

  /**
   * Transaction ID from payment provider
   * @type {string}
   * @unique
   * @index
   */
  transactionId

  /**
   * Payment provider (Stripe, PayPal, etc.)
   * @type {string}
   * @required
   * @enum STRIPE,PAYPAL,SQUARE,BRAINTREE,MANUAL
   */
  provider

  /**
   * Provider response data
   * @type {Object}
   * @private
   */
  providerResponse

  /**
   * Card last 4 digits (if applicable)
   * @type {string}
   * @maxLength 4
   * @pattern ^[0-9]{4}$
   */
  cardLast4

  /**
   * Card brand (if applicable)
   * @type {string}
   * @enum VISA,MASTERCARD,AMEX,DISCOVER,JCB,DINERS
   */
  cardBrand

  /**
   * Customer email
   * @type {string}
   * @required
   * @email
   * @index
   */
  customerEmail

  /**
   * Customer name
   * @type {string}
   * @maxLength 255
   */
  customerName

  /**
   * Billing address
   * @type {Object}
   * @properties street,city,state,country,postalCode
   */
  billingAddress

  /**
   * Payment description
   * @type {string}
   * @maxLength 500
   */
  description

  /**
   * Error message (if payment failed)
   * @type {string}
   * @maxLength 1000
   */
  errorMessage

  /**
   * Error code from provider
   * @type {string}
   * @maxLength 100
   */
  errorCode

  /**
   * Number of retry attempts
   * @type {number}
   * @min 0
   * @default 0
   */
  retryCount

  /**
   * Payment intent ID (Stripe)
   * @type {string}
   */
  paymentIntentId

  /**
   * Refund reason
   * @type {string}
   * @maxLength 500
   */
  refundReason

  /**
   * Refund ID from provider
   * @type {string}
   */
  refundId

  /**
   * Metadata for additional data
   * @type {Object}
   * @default {}
   */
  metadata

  /**
   * IP address of customer
   * @type {string}
   * @pattern ^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$
   */
  ipAddress

  /**
   * User agent
   * @type {string}
   * @maxLength 500
   */
  userAgent

  /**
   * Processing started at
   * @type {Date}
   */
  processingAt

  /**
   * Payment completed at
   * @type {Date}
   * @index
   */
  completedAt

  /**
   * Payment failed at
   * @type {Date}
   */
  failedAt

  /**
   * Refunded at
   * @type {Date}
   */
  refundedAt

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
    this.orderId = data.orderId
    this.userId = data.userId
    this.status = data.status || 'PENDING'
    this.method = data.method
    this.amount = data.amount
    this.currency = data.currency || 'USD'
    this.refundedAmount = data.refundedAmount || 0
    this.transactionId = data.transactionId
    this.provider = data.provider
    this.providerResponse = data.providerResponse
    this.cardLast4 = data.cardLast4
    this.cardBrand = data.cardBrand
    this.customerEmail = data.customerEmail
    this.customerName = data.customerName
    this.billingAddress = data.billingAddress
    this.description = data.description
    this.errorMessage = data.errorMessage
    this.errorCode = data.errorCode
    this.retryCount = data.retryCount || 0
    this.paymentIntentId = data.paymentIntentId
    this.refundReason = data.refundReason
    this.refundId = data.refundId
    this.metadata = data.metadata || {}
    this.ipAddress = data.ipAddress
    this.userAgent = data.userAgent
    this.processingAt = data.processingAt
    this.completedAt = data.completedAt
    this.failedAt = data.failedAt
    this.refundedAt = data.refundedAt
    this.createdAt = data.createdAt || new Date()
    this.updatedAt = data.updatedAt || new Date()
  }

  /**
   * Check if payment is successful
   * @returns {boolean}
   */
  isSuccessful() {
    return this.status === 'COMPLETED'
  }

  /**
   * Check if payment failed
   * @returns {boolean}
   */
  isFailed() {
    return this.status === 'FAILED'
  }

  /**
   * Check if payment is refunded
   * @returns {boolean}
   */
  isRefunded() {
    return this.status === 'REFUNDED' || this.status === 'PARTIALLY_REFUNDED'
  }

  /**
   * Check if payment can be refunded
   * @returns {boolean}
   */
  canBeRefunded() {
    return this.status === 'COMPLETED' && this.refundedAmount < this.amount
  }

  /**
   * Get remaining refundable amount
   * @returns {number}
   */
  getRefundableAmount() {
    return this.amount - this.refundedAmount
  }

  /**
   * Mark as processing
   */
  markAsProcessing() {
    this.status = 'PROCESSING'
    this.processingAt = new Date()
  }

  /**
   * Mark as completed
   * @param {string} transactionId
   */
  markAsCompleted(transactionId) {
    this.status = 'COMPLETED'
    this.transactionId = transactionId
    this.completedAt = new Date()
  }

  /**
   * Mark as failed
   * @param {string} errorMessage
   * @param {string} errorCode
   */
  markAsFailed(errorMessage, errorCode) {
    this.status = 'FAILED'
    this.errorMessage = errorMessage
    this.errorCode = errorCode
    this.failedAt = new Date()
  }

  /**
   * Process refund
   * @param {number} amount
   * @param {string} reason
   * @param {string} refundId
   */
  processRefund(amount, reason, refundId) {
    if (!this.canBeRefunded()) {
      throw new Error('Payment cannot be refunded')
    }

    const refundableAmount = this.getRefundableAmount()
    if (amount > refundableAmount) {
      throw new Error(`Cannot refund more than ${refundableAmount}`)
    }

    this.refundedAmount += amount
    this.refundReason = reason
    this.refundId = refundId
    this.refundedAt = new Date()

    if (this.refundedAmount >= this.amount) {
      this.status = 'REFUNDED'
    } else {
      this.status = 'PARTIALLY_REFUNDED'
    }
  }

  /**
   * Increment retry count
   */
  incrementRetry() {
    this.retryCount += 1
  }

  /**
   * Get payment summary
   * @returns {Object}
   */
  getSummary() {
    return {
      id: this.id,
      orderId: this.orderId,
      status: this.status,
      method: this.method,
      amount: this.amount,
      currency: this.currency,
      refundedAmount: this.refundedAmount,
      transactionId: this.transactionId,
      completedAt: this.completedAt
    }
  }

  /**
   * Before update hook
   * @lifecycle beforeUpdate
   */
  beforeUpdate() {
    this.updatedAt = new Date()
  }

  /**
   * Sanitize for public access (remove sensitive data)
   * @returns {Object}
   */
  toPublic() {
    return {
      id: this.id,
      orderId: this.orderId,
      status: this.status,
      method: this.method,
      amount: this.amount,
      currency: this.currency,
      refundedAmount: this.refundedAmount,
      cardLast4: this.cardLast4,
      cardBrand: this.cardBrand,
      completedAt: this.completedAt,
      createdAt: this.createdAt
    }
  }
}

module.exports = Payment
