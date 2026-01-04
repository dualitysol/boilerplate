/**
 * TodoService - Manages todo items
 */

export class TodoService {
  constructor({ storage, eventBus }) {
    this.storage = storage;
    this.eventBus = eventBus;
    this.name = 'TodoService';
  }

  async initialize() {
    console.log('📝 TodoService initialized');
    
    // Subscribe to user events
    this.eventBus.subscribe('user.registered', async (data) => {
      console.log(`👤 Creating welcome todo for user ${data.username}`);
      await this.createTodo({
        userId: data.userId,
        title: 'Welcome to Todo App!',
        description: 'Get started by creating your first todo',
        category: 'welcome'
      });
    });
  }

  // Create new todo
  async createTodo({ userId, title, description, category, dueDate }) {
    const todo = await this.storage.insertOne('todos', {
      userId,
      title,
      description: description || null,
      category: category || 'general',
      dueDate: dueDate || null,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Emit event
    this.eventBus.publish('todo.created', {
      todoId: todo.id,
      userId,
      title,
      category
    });

    return todo;
  }

  // Get todo by ID
  async getTodoById(id) {
    return await this.storage.findOne('todos', { id });
  }

  // Get all todos
  async getTodos({ completed, category, userId } = {}) {
    const query = {};
    
    if (completed !== undefined) {
      query.completed = completed;
    }
    if (category) {
      query.category = category;
    }
    if (userId) {
      query.userId = userId;
    }

    return await this.storage.find('todos', query);
  }

  // Get todos for user
  async getTodosForUser(userId, { completed } = {}) {
    const query = { userId };
    if (completed !== undefined) {
      query.completed = completed;
    }
    return await this.storage.find('todos', query);
  }

  // Update todo
  async updateTodo(id, updates) {
    const todo = await this.storage.updateOne('todos', { id }, {
      ...updates,
      updatedAt: new Date().toISOString()
    });

    if (!todo) {
      throw new Error('Todo not found');
    }

    // Emit event if completed status changed
    if (updates.completed !== undefined && updates.completed !== todo.completed) {
      this.eventBus.publish('todo.updated', {
        todoId: id,
        userId: todo.userId,
        completed: updates.completed
      });

      if (updates.completed) {
        this.eventBus.publish('todo.completed', {
          todoId: id,
          userId: todo.userId,
          title: todo.title
        });
      }
    }

    return todo;
  }

  // Toggle todo completed status
  async toggleTodo(id) {
    const todo = await this.getTodoById(id);
    if (!todo) {
      throw new Error('Todo not found');
    }

    return await this.updateTodo(id, { completed: !todo.completed });
  }

  // Delete todo
  async deleteTodo(id) {
    const todo = await this.getTodoById(id);
    if (!todo) {
      throw new Error('Todo not found');
    }

    await this.storage.deleteOne('todos', { id });

    // Emit event
    this.eventBus.publish('todo.deleted', {
      todoId: id,
      userId: todo.userId
    });

    return true;
  }

  // Get statistics
  async getStats(userId) {
    const todos = await this.getTodosForUser(userId);
    const completed = todos.filter(t => t.completed).length;
    const pending = todos.filter(t => !t.completed).length;

    return {
      total: todos.length,
      completed,
      pending,
      completionRate: todos.length > 0 ? (completed / todos.length) * 100 : 0
    };
  }
}
