/**
 * Product Model and Business Logic
 */

import crypto from 'crypto';

export class ProductModel {
  constructor(data) {
    this.id = data.id || this.generateId();
    this.name = data.name;
    this.description = data.description || '';
    this.price = data.price;
    this.stock = data.stock || 0;
    this.category = data.category;
    this.tags = data.tags || [];
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }
  
  generateId() {
    return `prod_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }
  
  update(updates) {
    Object.assign(this, updates);
    this.updatedAt = new Date().toISOString();
    return this;
  }
  
  addStock(quantity) {
    this.stock += quantity;
    this.updatedAt = new Date().toISOString();
    return this;
  }
  
  removeStock(quantity) {
    if (this.stock < quantity) {
      throw new Error('Insufficient stock');
    }
    this.stock -= quantity;
    this.updatedAt = new Date().toISOString();
    return this;
  }
  
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      price: this.price,
      stock: this.stock,
      category: this.category,
      tags: this.tags,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

// Validation utilities
export const validateProduct = (data) => {
  const errors = [];
  
  if (!data.name || data.name.trim().length === 0) {
    errors.push('Name is required');
  }
  
  if (data.name && data.name.length > 200) {
    errors.push('Name must be less than 200 characters');
  }
  
  if (data.price === undefined || data.price < 0) {
    errors.push('Price must be a positive number');
  }
  
  if (data.stock !== undefined && data.stock < 0) {
    errors.push('Stock must be a positive number');
  }
  
  if (!data.category || data.category.trim().length === 0) {
    errors.push('Category is required');
  }
  
  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }
  
  return true;
};

// Business logic utilities
export const calculateDiscount = (product, percentage) => {
  return product.price * (1 - percentage / 100);
};

export const isInStock = (product) => {
  return product.stock > 0;
};

export const isLowStock = (product, threshold = 10) => {
  return product.stock > 0 && product.stock <= threshold;
};
