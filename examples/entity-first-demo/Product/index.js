/**
 * Product Service Entry Point
 * 
 * Exports typeDefinitions, queryMutations, and service class
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import queries from './resolvers/queries.js';
import mutations from './resolvers/mutations.js';
import { ProductModel, validateProduct } from './model/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load GraphQL schema
export const typeDefinitions = readFileSync(
  join(__dirname, 'typeDefs', 'schema.graphql'),
  'utf-8'
);

// Export resolvers
export const queryMutations = {
  Query: queries,
  Mutation: mutations
};

// Product Service
export class ProductService {
  constructor(storage) {
    this.storage = storage || new Map();
  }
  
  async getProducts({ category, minPrice, maxPrice, limit, offset }) {
    let products = Array.from(this.storage.values());
    
    // Filter by category
    if (category) {
      products = products.filter(p => p.category === category);
    }
    
    // Filter by price range
    if (minPrice !== undefined) {
      products = products.filter(p => p.price >= minPrice);
    }
    
    if (maxPrice !== undefined) {
      products = products.filter(p => p.price <= maxPrice);
    }
    
    // Sort by createdAt DESC
    products.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // Paginate
    return products.slice(offset, offset + limit);
  }
  
  async countProducts({ category, minPrice, maxPrice }) {
    let products = Array.from(this.storage.values());
    
    if (category) {
      products = products.filter(p => p.category === category);
    }
    
    if (minPrice !== undefined) {
      products = products.filter(p => p.price >= minPrice);
    }
    
    if (maxPrice !== undefined) {
      products = products.filter(p => p.price <= maxPrice);
    }
    
    return products.length;
  }
  
  async getProductById(id) {
    return this.storage.get(id) || null;
  }
  
  async createProduct(data) {
    validateProduct(data);
    
    const product = new ProductModel(data);
    this.storage.set(product.id, product);
    
    return product.toJSON();
  }
  
  async updateProduct(id, updates) {
    const product = this.storage.get(id);
    
    if (!product) {
      return null;
    }
    
    if (updates.name || updates.price || updates.category) {
      validateProduct({ ...product, ...updates });
    }
    
    product.update(updates);
    
    return product.toJSON();
  }
  
  async deleteProduct(id) {
    return this.storage.delete(id);
  }
  
  async updateStock(id, quantity) {
    const product = this.storage.get(id);
    
    if (!product) {
      return null;
    }
    
    product.stock = quantity;
    product.updatedAt = new Date().toISOString();
    
    return product.toJSON();
  }
  
  async searchProducts(query, limit) {
    const searchTerm = query.toLowerCase();
    let products = Array.from(this.storage.values());
    
    products = products.filter(p => 
      p.name.toLowerCase().includes(searchTerm) ||
      p.description.toLowerCase().includes(searchTerm) ||
      p.category.toLowerCase().includes(searchTerm) ||
      p.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
    
    return products.slice(0, limit).map(p => p.toJSON());
  }
}

export default {
  typeDefinitions,
  queryMutations,
  ProductService
};
