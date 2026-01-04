/**
 * UserService - Business Logic Layer
 * 
 * Handles all user-related business logic including authentication,
 * authorization, and profile management.
 * 
 * Architecture:
 * GraphQL Resolvers -> UserService (this) -> UserModel -> Entity
 */

import { User } from '../entity/User.js';

export class UserService {
  /**
   * @param {Object} dependencies
   * @param {Object} dependencies.model - UserModel instance
   * @param {Object} dependencies.eventBus - Event bus
   * @param {Object} dependencies.services - Other services
   */
  constructor({ model, eventBus, services }) {
    this.model = model;
    this.eventBus = eventBus;
    this.services = services;
  }

  /**
   * Register a new user
   * @template T
   * @param {Object} input - Registration data
   * @param {string} input.email - User email
   * @param {string} input.name - User name
   * @param {string} input.password - User password
   * @returns {Promise<{user: T extends User, token: string}>}
   */
  async registerUser(input) {
    // Validate input
    this.validateRegistrationInput(input);

    // Check if user exists
    const existingUser = await this.model.findByEmail(input.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create entity
    const userEntity = new User({
      email: input.email,
      name: input.name,
      password: input.password, // Will be hashed in model
      avatar: input.avatar,
      emailVerified: false,
      roles: ['user'],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Validate entity
    const validationErrors = userEntity.validate();
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    // Execute beforeInsert hook
    if (userEntity.beforeInsert) {
      userEntity.beforeInsert();
    }

    // Save user
    const savedUser = await this.model.create({
      email: userEntity.email,
      name: userEntity.name,
      password: input.password, // Model will hash it
      avatar: userEntity.avatar,
      emailVerified: userEntity.emailVerified,
      roles: userEntity.roles,
      createdAt: userEntity.createdAt,
      updatedAt: userEntity.updatedAt
    });

    // Generate token
    const token = await this.model.generateToken(savedUser.id);

    // Publish event
    await this.eventBus.publish('user.registered', {
      userId: savedUser.id,
      email: savedUser.email,
      name: savedUser.name
    });

    return {
      user: new User(savedUser),
      token
    };
  }

  /**
   * Login user
   * @template T
   * @param {Object} input - Login credentials
   * @param {string} input.email - User email
   * @param {string} input.password - User password
   * @returns {Promise<{user: T extends User, token: string}>}
   */
  async loginUser(input) {
    // Validate input
    if (!input.email || !input.password) {
      throw new Error('Email and password are required');
    }

    // Find user
    const userData = await this.model.findByEmail(input.email);
    if (!userData) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValid = await this.model.verifyPassword(input.password, userData.password);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Create entity and update last login
    const userEntity = new User(userData);
    userEntity.updateLastLogin();

    // Save last login time
    await this.model.update(userData.id, {
      lastLoginAt: userEntity.lastLoginAt,
      updatedAt: new Date()
    });

    // Generate token
    const token = await this.model.generateToken(userData.id);

    // Publish event
    await this.eventBus.publish('user.logged_in', {
      userId: userData.id,
      email: userData.email
    });

    return {
      user: userEntity,
      token
    };
  }

  /**
   * Get user by ID
   * @template T
   * @param {string} id - User ID
   * @returns {Promise<T extends User | null>}
   */
  async getUserById(id) {
    const userData = await this.model.findById(id);
    if (!userData) {
      return null;
    }
    return new User(userData);
  }

  /**
   * Get user by email
   * @template T
   * @param {string} email - User email
   * @returns {Promise<T extends User | null>}
   */
  async getUserByEmail(email) {
    const userData = await this.model.findByEmail(email);
    if (!userData) {
      return null;
    }
    return new User(userData);
  }

  /**
   * Get all users
   * @template T
   * @returns {Promise<Array<T extends User>>}
   */
  async getAllUsers() {
    const usersData = await this.model.findAll();
    return usersData.map(data => new User(data));
  }

  /**
   * Update user profile
   * @template T
   * @param {string} id - User ID
   * @param {Object} updates - Update data
   * @param {string} requestingUserId - ID of user making the request
   * @returns {Promise<T extends User>}
   */
  async updateProfile(id, updates, requestingUserId) {
    // Check authorization
    if (id !== requestingUserId) {
      throw new Error('Not authorized to update this profile');
    }

    // Get existing user
    const existing = await this.getUserById(id);
    if (!existing) {
      throw new Error('User not found');
    }

    // Create updated entity
    const updatedEntity = new User({
      ...existing,
      ...updates,
      id: existing.id, // Prevent ID change
      email: existing.email, // Prevent email change
      password: existing.password, // Prevent password change
      roles: existing.roles, // Prevent role change
      updatedAt: new Date()
    });

    // Execute beforeUpdate hook
    if (updatedEntity.beforeUpdate) {
      updatedEntity.beforeUpdate();
    }

    // Validate
    const validationErrors = updatedEntity.validate();
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    // Save
    const savedUser = await this.model.update(id, {
      name: updatedEntity.name,
      avatar: updatedEntity.avatar,
      updatedAt: updatedEntity.updatedAt
    });

    // Publish event
    await this.eventBus.publish('user.profile_updated', {
      userId: id
    });

    return new User(savedUser);
  }

  /**
   * Verify email
   * @template T
   * @param {string} userId - User ID
   * @returns {Promise<T extends User>}
   */
  async verifyEmail(userId) {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.verifyEmail();

    const savedUser = await this.model.update(userId, {
      emailVerified: user.emailVerified,
      updatedAt: new Date()
    });

    await this.eventBus.publish('user.email_verified', {
      userId,
      email: user.email
    });

    return new User(savedUser);
  }

  /**
   * Change user role (admin only)
   * @template T
   * @param {string} userId - User ID to update
   * @param {string} newRole - New role
   * @param {string} adminUserId - ID of admin making the change
   * @returns {Promise<T extends User>}
   */
  async changeUserRole(userId, newRole, adminUserId) {
    // Check if requesting user is admin
    const admin = await this.getUserById(adminUserId);
    if (!admin || !admin.isAdmin()) {
      throw new Error('Not authorized: admin access required');
    }

    // Get target user
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Update roles
    const updatedUser = await this.model.update(userId, {
      roles: [newRole],
      updatedAt: new Date()
    });

    await this.eventBus.publish('user.role_changed', {
      userId,
      newRole,
      changedBy: adminUserId
    });

    return new User(updatedUser);
  }

  /**
   * Delete user
   * @param {string} userId - User ID to delete
   * @param {string} requestingUserId - ID of user making the request
   * @returns {Promise<boolean>}
   */
  async deleteUser(userId, requestingUserId) {
    // Check authorization (user can delete own account, or admin can delete any)
    const requestingUser = await this.getUserById(requestingUserId);
    if (!requestingUser) {
      throw new Error('Requesting user not found');
    }

    if (userId !== requestingUserId && !requestingUser.isAdmin()) {
      throw new Error('Not authorized to delete this user');
    }

    const deleted = await this.model.delete(userId);

    if (deleted) {
      await this.eventBus.publish('user.deleted', {
        userId
      });
    }

    return deleted;
  }

  /**
   * Validate registration input
   * @private
   * @param {Object} input
   */
  validateRegistrationInput(input) {
    if (!input) {
      throw new Error('Registration input is required');
    }
    if (!input.email || typeof input.email !== 'string') {
      throw new Error('Email is required and must be a string');
    }
    if (!input.name || typeof input.name !== 'string') {
      throw new Error('Name is required and must be a string');
    }
    if (!input.password || typeof input.password !== 'string') {
      throw new Error('Password is required and must be a string');
    }
    if (input.password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
  }
}

export default UserService;
