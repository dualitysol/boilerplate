/**
 * Notification Entity
 * Single source of truth for Notification data model
 * 
 * Run: npm run sync:entity NotificationService Notification
 * to auto-generate GraphQL schema, database migration, and update resolvers
 */

/**
 * @typedef {Object} Notification
 * @property {string} id - Unique identifier
 * @property {string} userId - Recipient user ID
 * @property {string} type - Notification type
 * @property {string} title - Notification title
 * @property {string} message - Notification message
 * @property {Object} [data] - Additional data
 * @property {boolean} read - Read status
 * @property {Date} [readAt] - Read timestamp
 * @property {Date} createdAt - Creation timestamp
 */

/**
 * Notification Entity Class
 */
class Notification {
  /**
   * @type {string}
   * @description Unique identifier
   */
  id

  /**
   * @type {string}
   * @description Recipient user ID
   * @required
   * @index
   */
  userId

  /**
   * @type {string}
   * @description Notification type
   * @required
   * @index
   */
  type

  /**
   * @type {string}
   * @description Notification title
   * @required
   * @maxLength 255
   */
  title

  /**
   * @type {string}
   * @description Notification message
   * @required
   * @maxLength 1000
   */
  message

  /**
   * @type {Object|undefined}
   * @description Additional data
   */
  data

  /**
   * @type {boolean}
   * @description Read status
   * @required
   * @default false
   * @index
   */
  read

  /**
   * @type {Date|undefined}
   * @description Read timestamp
   */
  readAt

  /**
   * @type {Date}
   * @description Creation timestamp
   * @required
   * @index
   */
  createdAt

  /**
   * Create new Notification
   * @param {Object} data - Notification data
   */
  constructor(data) {
    this.id = data.id || this.generateId()
    this.userId = data.userId
    this.type = data.type
    this.title = data.title
    this.message = data.message
    this.data = data.data
    this.read = data.read !== undefined ? data.read : false
    this.readAt = data.readAt
    this.createdAt = data.createdAt || new Date()
  }

  /**
   * Generate unique ID
   * @returns {string}
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  /**
   * Mark as read
   */
  markAsRead() {
    if (!this.read) {
      this.read = true
      this.readAt = new Date()
    }
  }

  /**
   * Mark as unread
   */
  markAsUnread() {
    this.read = false
    this.readAt = undefined
  }

  /**
   * Check if notification is recent (less than 24h old)
   * @returns {boolean}
   */
  isRecent() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    return new Date(this.createdAt) > oneDayAgo
  }
}

module.exports = { Notification }
