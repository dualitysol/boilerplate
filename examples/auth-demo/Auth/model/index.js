/**
 * Auth Model and Business Logic
 */

import crypto from 'crypto';

export class UserModel {
  constructor(data) {
    this.id = data.id || this.generateId();
    this.email = data.email;
    this.name = data.name;
    this.password = data.password; // Hashed
    this.role = data.role || 'user';
    this.createdAt = data.createdAt || new Date().toISOString();
  }
  
  generateId() {
    return `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }
  
  toJSON() {
    const { password, ...user } = this;
    return user;
  }
}

// Simple password hashing (use bcrypt in production)
export const hashPassword = (password) => {
  return crypto
    .createHash('sha256')
    .update(password + 'salt')
    .digest('hex');
};

export const comparePassword = (password, hash) => {
  return hashPassword(password) === hash;
};

// Validation
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) {
    throw new Error('Invalid email format');
  }
};

export const validatePassword = (password) => {
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }
};

export const validateRegistration = (input) => {
  validateEmail(input.email);
  validatePassword(input.password);
  
  if (!input.name || input.name.trim().length === 0) {
    throw new Error('Name is required');
  }
};
