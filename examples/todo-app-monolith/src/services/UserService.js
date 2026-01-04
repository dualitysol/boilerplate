/**
 * UserService - Handles user management and authentication
 */

import crypto from 'crypto';

export class UserService {
  constructor({ storage, eventBus }) {
    this.storage = storage;
    this.eventBus = eventBus;
    this.name = 'UserService';
  }

  async initialize() {
    console.log('🔐 UserService initialized');
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
      createdAt: new Date().toISOString()
    });

    // Emit event
    this.eventBus.publish('user.registered', {
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
    this.eventBus.publish('user.loggedIn', {
      userId: user.id,
      username: user.username
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Get user by ID
  async getUserById(id) {
    const user = await this.storage.findOne('users', { id });
    if (!user) {
      return null;
    }
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Get all users
  async getUsers() {
    const users = await this.storage.find('users');
    return users.map(({ password, ...user }) => user);
  }

  // Get user by username
  async getUserByUsername(username) {
    const user = await this.storage.findOne('users', { username });
    if (!user) {
      return null;
    }
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
