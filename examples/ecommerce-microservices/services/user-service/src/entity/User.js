/**
 * User Entity
 * 
 * Represents a user in the e-commerce platform.
 * This entity is used for authentication, authorization, and user profile management.
 * 
 * @entity User
 * @collection users
 * @table users
 */
class User {
  /**
   * Unique user identifier
   * @type {string}
   * @id
   * @generated
   */
  id

  /**
   * Username for login
   * @type {string}
   * @required
   * @unique
   * @index
   * @minLength 3
   * @maxLength 50
   * @pattern ^[a-zA-Z0-9_-]+$
   */
  username

  /**
   * User email address
   * @type {string}
   * @required
   * @unique
   * @index
   * @email
   * @maxLength 255
   */
  email

  /**
   * User's first name
   * @type {string}
   * @maxLength 100
   */
  firstName

  /**
   * User's last name
   * @type {string}
   * @maxLength 100
   */
  lastName

  /**
   * Hashed password
   * @type {string}
   * @required
   * @minLength 8
   * @private
   */
  password

  /**
   * User role
   * @type {string}
   * @required
   * @enum CUSTOMER,ADMIN
   * @default CUSTOMER
   * @index
   */
  role

  /**
   * Whether email is verified
   * @type {boolean}
   * @required
   * @default false
   */
  emailVerified

  /**
   * Email verification token
   * @type {string}
   * @private
   */
  verificationToken

  /**
   * Password reset token
   * @type {string}
   * @private
   */
  resetToken

  /**
   * Reset token expiry
   * @type {Date}
   * @private
   */
  resetTokenExpiry

  /**
   * Last login timestamp
   * @type {Date}
   * @index
   */
  lastLoginAt

  /**
   * Account creation timestamp
   * @type {Date}
   * @required
   * @default now
   * @index
   */
  createdAt

  /**
   * Last update timestamp
   * @type {Date}
   * @required
   * @default now
   */
  updatedAt

  constructor(data = {}) {
    this.id = data.id
    this.username = data.username
    this.email = data.email
    this.firstName = data.firstName
    this.lastName = data.lastName
    this.password = data.password
    this.role = data.role || 'CUSTOMER'
    this.emailVerified = data.emailVerified || false
    this.verificationToken = data.verificationToken
    this.resetToken = data.resetToken
    this.resetTokenExpiry = data.resetTokenExpiry
    this.lastLoginAt = data.lastLoginAt
    this.createdAt = data.createdAt || new Date()
    this.updatedAt = data.updatedAt || new Date()
  }

  /**
   * Check if user has a specific role
   * @param {string} role
   * @returns {boolean}
   */
  hasRole(role) {
    return this.role === role
  }

  /**
   * Check if user is admin
   * @returns {boolean}
   */
  isAdmin() {
    return this.role === 'ADMIN'
  }

  /**
   * Check if user is customer
   * @returns {boolean}
   */
  isCustomer() {
    return this.role === 'CUSTOMER'
  }

  /**
   * Get full name
   * @returns {string}
   */
  getFullName() {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`
    }
    return this.firstName || this.lastName || this.username
  }

  /**
   * Update last login timestamp
   */
  updateLastLogin() {
    this.lastLoginAt = new Date()
  }

  /**
   * Verify email
   */
  verifyEmail() {
    this.emailVerified = true
    this.verificationToken = null
  }

  /**
   * Generate verification token
   * @returns {string}
   */
  generateVerificationToken() {
    // In real app, use crypto.randomBytes
    this.verificationToken = Math.random().toString(36).substring(2, 15)
    return this.verificationToken
  }

  /**
   * Generate password reset token
   * @returns {string}
   */
  generateResetToken() {
    // In real app, use crypto.randomBytes
    this.resetToken = Math.random().toString(36).substring(2, 15)
    this.resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour
    return this.resetToken
  }

  /**
   * Check if reset token is valid
   * @returns {boolean}
   */
  isResetTokenValid() {
    if (!this.resetToken || !this.resetTokenExpiry) {
      return false
    }
    return this.resetTokenExpiry > new Date()
  }

  /**
   * Before update hook
   * @lifecycle beforeUpdate
   */
  beforeUpdate() {
    this.updatedAt = new Date()
  }

  /**
   * Sanitize user data for public access
   * @returns {Object}
   */
  toPublic() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      role: this.role,
      emailVerified: this.emailVerified,
      lastLoginAt: this.lastLoginAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }
}

module.exports = User
