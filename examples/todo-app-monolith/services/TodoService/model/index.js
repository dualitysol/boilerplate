/**
 * TodoService Model
 * Manages todo items
 */

export class TodoModel {
  constructor({ storage, eventBus, queueManager }) {
    this.storage = storage;
    this.eventBus = eventBus;
    this.queueManager = queueManager;
  }

  async initialize() {
    console.log('📝 TodoService initialized');
    await this.subscribeToEvents();
  }

  async subscribeToEvents() {
    // Subscribe to user registration to create welcome todo
    await this.eventBus.subscribe('user.registered', async (data) => {
      console.log(`👤 Creating welcome todo for user ${data.username}`);
      await this.create({
        userId: data.userId,
        title: 'Welcome to Todo App!',
        description: 'Get started by creating your first todo',
        category: 'welcome'
      });
    });
  }

  // Create new todo
  async create({ userId, title, description, category, dueDate }) {
    this.validate({ title, userId });

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
    await this.eventBus.publish('todo.created', {
      todoId: todo.id,
      userId,
      title,
      category
    });

    return todo;
  }

  // Get todo by ID
  async findById(id) {
    return await this.storage.findOne('todos', { id });
  }

  // Get all todos with optional filters
  async findAll(filter = {}) {
    const query = {};
    
    if (filter.completed !== undefined) {
      query.completed = filter.completed;
    }
    if (filter.category) {
      query.category = filter.category;
    }
    if (filter.userId) {
      query.userId = filter.userId;
    }

    return await this.storage.find('todos', query);
  }

  // Get todos for specific user
  async findByUser(userId, filter = {}) {
    const query = { userId };
    if (filter.completed !== undefined) {
      query.completed = filter.completed;
    }
    if (filter.category) {
      query.category = filter.category;
    }
    return await this.storage.find('todos', query);
  }

  // Update todo
  async update(id, updates) {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error('Todo not found');
    }

    const todo = await this.storage.updateOne('todos', { id }, {
      ...updates,
      updatedAt: new Date().toISOString()
    });

    // Emit event if completed status changed
    if (updates.completed !== undefined && updates.completed !== existing.completed) {
      await this.eventBus.publish('todo.updated', {
        todoId: id,
        userId: todo.userId,
        completed: updates.completed
      });

      if (updates.completed) {
        await this.eventBus.publish('todo.completed', {
          todoId: id,
          userId: todo.userId,
          title: todo.title
        });
      }
    }

    return todo;
  }

  // Toggle todo completed status
  async toggle(id) {
    const todo = await this.findById(id);
    if (!todo) {
      throw new Error('Todo not found');
    }

    return await this.update(id, { completed: !todo.completed });
  }

  // Delete todo
  async delete(id) {
    const todo = await this.findById(id);
    if (!todo) {
      throw new Error('Todo not found');
    }

    const deleted = await this.storage.deleteOne('todos', { id });

    if (deleted) {
      await this.eventBus.publish('todo.deleted', {
        todoId: id,
        userId: todo.userId
      });
    }

    return deleted;
  }

  // Get statistics for user
  async getStats(userId) {
    const todos = await this.findByUser(userId);
    const completed = todos.filter(t => t.completed).length;
    const pending = todos.filter(t => !t.completed).length;

    return {
      total: todos.length,
      completed,
      pending,
      completionRate: todos.length > 0 ? Math.round((completed / todos.length) * 100) : 0
    };
  }

  // Validation
  validate(data) {
    if (!data) {
      throw new Error('Todo data is required');
    }
    if (!data.title || data.title.trim().length === 0) {
      throw new Error('Title is required');
    }
    if (data.title.length > 200) {
      throw new Error('Title must be less than 200 characters');
    }
    if (!data.userId) {
      throw new Error('User ID is required');
    }
  }
}

export default TodoModel;
