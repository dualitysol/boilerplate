/**
 * TodoService - Business Logic Layer
 * 
 * This service handles all business logic for Todo operations.
 * It sits between resolvers and the model/entity layers.
 * 
 * Architecture:
 * GraphQL Resolvers -> TodoService (this) -> TodoModel -> Entity
 */

import { Todo } from '../entity/Todo.js';

export class TodoService {
  /**
   * @param {import('../../../types/TodoService/internal/dependencies.js').Dependencies} dependencies
   * @param {Object} dependencies.model - TodoModel instance for data access
   * @param {Object} dependencies.eventBus - Event bus for publishing events
   * @param {Object} dependencies.services - Other services (UserService, NotificationService)
   */
  constructor({ model, eventBus, services }) {
    this.model = model;
    this.eventBus = eventBus;
    this.services = services;
  }

  /**
   * Create a new todo
   * @template T
   * @param {import('../../../types/TodoService/requests/createTodoInput.js').CreateTodoInput} input - Todo creation data
   * @param {string} userId - ID of the user creating the todo
   * @returns {Promise<T extends Todo>}
   */
  async createTodo(input, userId) {
    // Validate input
    this.validateTodoInput(input);

    // Create entity instance
    const todoEntity = new Todo({
      ...input,
      userId,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Validate entity
    const validationErrors = todoEntity.validate();
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    // Execute beforeInsert lifecycle hook
    if (todoEntity.beforeInsert) {
      todoEntity.beforeInsert();
    }

    // Save to database via model
    const savedTodo = await this.model.create({
      userId: todoEntity.userId,
      title: todoEntity.title,
      description: todoEntity.description,
      completed: todoEntity.completed,
      priority: todoEntity.priority,
      dueDate: todoEntity.dueDate,
      tags: todoEntity.tags,
      createdAt: todoEntity.createdAt,
      updatedAt: todoEntity.updatedAt
    });

    // Publish event
    await this.eventBus.publish('todo.created', {
      todoId: savedTodo.id,
      userId,
      title: savedTodo.title,
      priority: savedTodo.priority
    });

    // Return entity instance
    return new Todo(savedTodo);
  }

  /**
   * Get todo by ID
   * @template T
   * @param {string} id - Todo ID
   * @returns {Promise<T extends Todo | null>}
   */
  async getTodoById(id) {
    const todoData = await this.model.findById(id);
    if (!todoData) {
      return null;
    }
    return new Todo(todoData);
  }

  /**
   * Get all todos with optional filters
   * @template T
   * @param {Object} [filter={}] - Filter options
   * @param {boolean} [filter.completed] - Filter by completion status
   * @param {string} [filter.category] - Filter by category
   * @param {number} [filter.priority] - Filter by priority
   * @returns {Promise<Array<T extends Todo>>}
   */
  async getAllTodos(filter = {}) {
    const todosData = await this.model.findAll(filter);
    return todosData.map(data => new Todo(data));
  }

  /**
   * Get todos for a specific user
   * @template T
   * @param {string} userId - User ID
   * @param {Object} [filter={}] - Filter options
   * @returns {Promise<Array<T extends Todo>>}
   */
  async getUserTodos(userId, filter = {}) {
    const todosData = await this.model.findByUser(userId, filter);
    return todosData.map(data => new Todo(data));
  }

  /**
   * Update todo
   * @template T
   * @param {string} id - Todo ID
   * @param {import('../../../types/TodoService/requests/updates.js').Updates} updates - Update data
   * @param {string} userId - ID of user making the update (for authorization)
   * @returns {Promise<T extends Todo>}
   */
  async updateTodo(id, updates, userId) {
    // Get existing todo
    const existing = await this.getTodoById(id);
    if (!existing) {
      throw new Error('Todo not found');
    }

    // Check ownership
    if (existing.userId !== userId) {
      throw new Error('Not authorized to update this todo');
    }

    // Create updated entity
    const updatedEntity = new Todo({
      ...existing,
      ...updates,
      updatedAt: new Date()
    });

    // Execute beforeUpdate lifecycle hook
    if (updatedEntity.beforeUpdate) {
      updatedEntity.beforeUpdate();
    }

    // Validate updated entity
    const validationErrors = updatedEntity.validate();
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    // Save updates
    const savedTodo = await this.model.update(id, {
      title: updatedEntity.title,
      description: updatedEntity.description,
      completed: updatedEntity.completed,
      priority: updatedEntity.priority,
      dueDate: updatedEntity.dueDate,
      tags: updatedEntity.tags,
      updatedAt: updatedEntity.updatedAt
    });

    // Publish events if completion status changed
    if (updates.completed !== undefined && updates.completed !== existing.completed) {
      if (updates.completed) {
        await this.eventBus.publish('todo.completed', {
          todoId: id,
          userId,
          title: savedTodo.title
        });
      }
    }

    return new Todo(savedTodo);
  }

  /**
   * Toggle todo completion status
   * @template T
   * @param {string} id - Todo ID
   * @param {string} userId - ID of user making the change
   * @returns {Promise<T extends Todo>}
   */
  async toggleTodo(id, userId) {
    const todo = await this.getTodoById(id);
    if (!todo) {
      throw new Error('Todo not found');
    }

    // Check ownership
    if (todo.userId !== userId) {
      throw new Error('Not authorized to toggle this todo');
    }

    // Use entity method
    if (todo.completed) {
      todo.markIncomplete();
    } else {
      todo.markCompleted();
    }

    // Save
    const savedTodo = await this.model.update(id, {
      completed: todo.completed,
      updatedAt: new Date()
    });

    // Publish event if marked completed
    if (todo.completed) {
      await this.eventBus.publish('todo.completed', {
        todoId: id,
        userId,
        title: todo.title
      });
    }

    return new Todo(savedTodo);
  }

  /**
   * Delete todo
   * @param {string} id - Todo ID
   * @param {string} userId - ID of user making the deletion
   * @returns {Promise<boolean>}
   */
  async deleteTodo(id, userId) {
    const todo = await this.getTodoById(id);
    if (!todo) {
      throw new Error('Todo not found');
    }

    // Check ownership
    if (todo.userId !== userId) {
      throw new Error('Not authorized to delete this todo');
    }

    const deleted = await this.model.delete(id);

    if (deleted) {
      await this.eventBus.publish('todo.deleted', {
        todoId: id,
        userId
      });
    }

    return deleted;
  }

  /**
   * Get todo statistics for user
   * @template T
   * @param {string} userId - User ID
   * @returns {Promise<T extends Object>}
   */
  async getUserStats(userId) {
    const todos = await this.getUserTodos(userId);
    
    const completed = todos.filter(t => t.completed).length;
    const pending = todos.filter(t => !t.completed).length;
    const overdue = todos.filter(t => t.isOverdue()).length;
    const highPriority = todos.filter(t => t.priority >= 4).length;

    return {
      total: todos.length,
      completed,
      pending,
      overdue,
      highPriority,
      completionRate: todos.length > 0 ? Math.round((completed / todos.length) * 100) : 0
    };
  }

  /**
   * Get overdue todos for user
   * @template T
   * @param {string} userId - User ID
   * @returns {Promise<Array<T extends Todo>>}
   */
  async getOverdueTodos(userId) {
    const todos = await this.getUserTodos(userId, { completed: false });
    return todos.filter(todo => todo.isOverdue());
  }

  /**
   * Get todos by priority
   * @template T
   * @param {string} userId - User ID
   * @param {number} minPriority - Minimum priority level
   * @returns {Promise<Array<T extends Todo>>}
   */
  async getHighPriorityTodos(userId, minPriority = 4) {
    const todos = await this.getUserTodos(userId, { completed: false });
    return todos.filter(todo => todo.priority >= minPriority);
  }

  /**
   * Validate todo input
   * @private
   * @param {Object} input
   */
  validateTodoInput(input) {
    if (!input) {
      throw new Error('Todo input is required');
    }
    if (!input.title || typeof input.title !== 'string') {
      throw new Error('Title is required and must be a string');
    }
    if (input.title.trim().length === 0) {
      throw new Error('Title cannot be empty');
    }
    if (input.title.length > 255) {
      throw new Error('Title must be less than 255 characters');
    }
    if (input.priority !== undefined) {
      if (typeof input.priority !== 'number' || input.priority < 1 || input.priority > 5) {
        throw new Error('Priority must be a number between 1 and 5');
      }
    }
  }
}

export default TodoService;
