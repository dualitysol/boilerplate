/**
 * User Entity
 * Single source of truth for User data model
 * 
 * Run: npm run sync:entity UserService User
 * to auto-generate GraphQL schema, database migration, and update resolvers
 */

/**
 * @typedef {Object} User
 * @property {string} id - Unique identifier
 * @property {string} email - User email (unique)
 * @property {string} name - User name
 * @property {string} [avatar] - Avatar URL
 * @property {string} password - Hashed password
 * @property {boolean} emailVerified - Email verification status
 * @property {string[]} roles - User roles
 * @property {Date} lastLoginAt - Last login timestamp
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 */

/**
 * User Entity Class
 */
class User {
  /**
   * @type {string}
   * @description Unique identifier
   */
  id

  /**
   * @type {string}
   * @description User email (unique)
   * @required
   * @unique
   * @index
   * @email
   */
  email

  /**
   * @type {string}
   * @description User name
   * @required
   * @minLength 2
   * @maxLength 100
   * @index
   */
  name

  /**
   * @type {string|undefined}
   * @description Avatar URL
   * @url
   */
  avatar

  /**
   * @type {string}
   * @description Hashed password
   * @required
   */
  password

  /**
   * @type {boolean}
   * @description Email verification status
   * @required
   * @default false
   */
  emailVerified

  /**
   * @type {string[]}
   * @description User roles
   * @default ['user']
   */
  roles

  /**
   * @type {Date|undefined}
   * @description Last login timestamp
   */
  lastLoginAt

  /**
   * @type {Date}
   * @description Creation timestamp
   * @required
   * @index
   */
  createdAt

  /**
   * @type {Date}
   * @description Last update timestamp
   * @required
   */
  updatedAt

  /**
   * Create new User
   * @param {Object} data - User data
   */
  constructor(data) {
    this.id = data.id || this.generateId()
    this.email = data.email
    this.name = data.name
    this.avatar = data.avatar
    this.password = data.password
    this.emailVerified = data.emailVerified !== undefined ? data.emailVerified : false
    this.roles = data.roles || ['user']
    this.lastLoginAt = data.lastLoginAt
    this.createdAt = data.createdAt || new Date()
    this.updatedAt = data.updatedAt || new Date()
  }

  /**
   * Generate unique ID
   * @returns {string}
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  /**
   * Check if user has role
   * @param {string} role - Role to check
   * @returns {boolean}
   */
  hasRole(role) {
    return this.roles.includes(role)
  }

  /**
   * Check if user is admin
   * @returns {boolean}
   */
  isAdmin() {
    return this.hasRole('admin')
  }

  /**
   * Update last login
   */
  updateLastLogin() {
    this.lastLoginAt = new Date()
    this.updatedAt = new Date()
  }

  /**
   * Verify email
   */
  verifyEmail() {
    this.emailVerified = true
    this.updatedAt = new Date()
  }

  /**
   * Update before save
   */
  beforeUpdate() {
    this.updatedAt = new Date()
  }
}

module.exports = { User }
