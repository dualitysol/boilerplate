/**
 * Todo Entity
 * Single source of truth for Todo data model
 * 
 * Run: npm run sync:entity TodoService Todo
 * to auto-generate GraphQL schema, database migration, and update resolvers
 */

/**
 * @typedef {Object} Todo
 * @property {string} id - Unique identifier
 * @property {string} title - Todo title
 * @property {string} [description] - Optional description
 * @property {boolean} completed - Completion status
 * @property {string} userId - Owner user ID
 * @property {number} priority - Priority level (1-5)
 * @property {Date} [dueDate] - Due date
 * @property {string[]} [tags] - Tags for categorization
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 */

/**
 * Todo Entity Class
 */
class Todo {
  /**
   * @type {string}
   * @description Unique identifier
   */
  id

  /**
   * @type {string}
   * @description Todo title
   * @required
   * @minLength 1
   * @maxLength 255
   */
  title

  /**
   * @type {string|undefined}
   * @description Optional description
   * @maxLength 2000
   */
  description

  /**
   * @type {boolean}
   * @description Completion status
   * @required
   * @default false
   */
  completed

  /**
   * @type {string}
   * @description Owner user ID
   * @required
   * @index
   */
  userId

  /**
   * @type {number}
   * @description Priority level (1-5)
   * @required
   * @default 3
   * @min 1
   * @max 5
   */
  priority

  /**
   * @type {Date|undefined}
   * @description Due date
   */
  dueDate

  /**
   * @type {string[]|undefined}
   * @description Tags for categorization
   */
  tags

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
   * Create new Todo
   * @param {Object} data - Todo data
   */
  constructor(data) {
    this.id = data.id || this.generateId()
    this.title = data.title
    this.description = data.description
    this.completed = data.completed !== undefined ? data.completed : false
    this.userId = data.userId
    this.priority = data.priority || 3
    this.dueDate = data.dueDate
    this.tags = data.tags || []
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
   * Check if todo is overdue
   * @returns {boolean}
   */
  isOverdue() {
    if (!this.dueDate || this.completed) return false
    return new Date() > new Date(this.dueDate)
  }

  /**
   * Mark as completed
   */
  markCompleted() {
    this.completed = true
    this.updatedAt = new Date()
  }

  /**
   * Mark as incomplete
   */
  markIncomplete() {
    this.completed = false
    this.updatedAt = new Date()
  }

  /**
   * Validate todo data
   * @returns {string[]} Array of validation error messages
   */
  validate() {
    const errors = []

    if (!this.title || typeof this.title !== 'string') {
      errors.push('Title is required and must be a string')
    } else if (this.title.trim().length === 0) {
      errors.push('Title cannot be empty')
    } else if (this.title.length > 255) {
      errors.push('Title must be less than 255 characters')
    }

    if (this.description && this.description.length > 2000) {
      errors.push('Description must be less than 2000 characters')
    }

    if (this.priority !== undefined) {
      if (typeof this.priority !== 'number') {
        errors.push('Priority must be a number')
      } else if (this.priority < 1 || this.priority > 5) {
        errors.push('Priority must be between 1 and 5')
      }
    }

    if (this.dueDate) {
      const date = new Date(this.dueDate)
      if (isNaN(date.getTime())) {
        errors.push('Due date must be a valid date')
      }
    }

    if (!this.userId) {
      errors.push('User ID is required')
    }

    return errors
  }

  /**
   * Update before save
   */
  beforeUpdate() {
    this.updatedAt = new Date()
  }

  /**
   * Before insert hook
   */
  beforeInsert() {
    if (!this.priority) {
      this.priority = 3
    }
    if (!this.tags) {
      this.tags = []
    }
    this.updatedAt = new Date()
    this.createdAt = new Date()
  }
}

module.exports = { Todo }
