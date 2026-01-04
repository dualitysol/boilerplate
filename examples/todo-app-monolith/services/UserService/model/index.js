/**
 * UserService Model
 * Handles user management and authentication
 */

import crypto from 'crypto';

export class UserModel {
  constructor({ storage, eventBus, queueManager }) {
    this.storage = storage;
    this.eventBus = eventBus;
    this.queueManager = queueManager;
  }

  async initialize() {
    console.log('🔐 UserService initialized');
    
    // Subscribe to events if needed
    await this.subscribeToEvents();
  }

  async subscribeToEvents() {
    // Example: Listen for todo completion to award badges
    // await this.eventBus.subscribe('todo.completed', async (data) => {
    //   await this.handleTodoCompleted(data);
    // });
  }

  // Hash password (simple implementation - use bcrypt in production)
  hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  // Register new user
  async registerUser({ username, email, password, firstName, lastName }) {
    // Check if user exists
    const existing = await this.storage.findOne('users', { username });
    if (existing) {
      throw new Error('Username already exists');
    }

    const existingEmail = await this.storage.findOne('users', { email });
    if (existingEmail) {
      throw new Error('Email already registered');
    }

    // Create user
    const user = await this.storage.insertOne('users', {
      username,
      email,
      firstName,
      lastName,
      password: this.hashPassword(password),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Emit event
    await this.eventBus.publish('user.registered', {
      userId: user.id,
      username: user.username,
      email: user.email
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Login user
  async loginUser({ username, password }) {
    const user = await this.storage.findOne('users', { 
      username,
      password: this.hashPassword(password)
    });

    if (!user) {
      throw new Error('Invalid username or password');
    }

    // Emit event
    await this.eventBus.publish('user.loggedIn', {
      userId: user.id,
      username: user.username
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Get user by ID
  async findById(id) {
    const user = await this.storage.findOne('users', { id });
    if (!user) {
      return null;
    }
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Get all users
  async findAll(filter = {}) {
    const users = await this.storage.find('users', filter);
    return users.map(({ password, ...user }) => user);
  }

  // Get user by username
  async findByUsername(username) {
    const user = await this.storage.findOne('users', { username });
    if (!user) {
      return null;
    }
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Update user
  async update(id, data) {
    const updated = await this.storage.updateOne('users', { id }, {
      ...data,
      updatedAt: new Date().toISOString()
    });

    await this.eventBus.publish('user.updated', {
      userId: id,
      changes: data
    });

    const { password: _, ...userWithoutPassword } = updated;
    return userWithoutPassword;
  }

  // Delete user
  async delete(id) {
    const deleted = await this.storage.deleteOne('users', { id });

    if (deleted) {
      await this.eventBus.publish('user.deleted', { userId: id });
    }

    return deleted;
  }

  validate(data) {
    if (!data) {
      throw new Error('User data is required');
    }
    if (data.username && data.username.length < 3) {
      throw new Error('Username must be at least 3 characters');
    }
    if (data.email && !data.email.includes('@')) {
      throw new Error('Invalid email address');
    }
    if (data.password && data.password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
  }
}

export default UserModel;
