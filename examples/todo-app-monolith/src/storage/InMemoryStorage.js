/**
 * Simple In-Memory Storage
 * 
 * This is a simple in-memory storage implementation for the Todo app.
 * In production, replace this with PostgreSQL or MongoDB.
 */

export class InMemoryStorage {
  constructor() {
    this.collections = new Map();
  }

  async connect() {
    console.log('✅ In-memory storage initialized');
  }

  async disconnect() {
    this.collections.clear();
    console.log('✅ In-memory storage cleared');
  }

  getCollection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Map());
    }
    return this.collections.get(name);
  }

  // Find one document
  async findOne(collection, query) {
    const coll = this.getCollection(collection);
    for (const [id, doc] of coll.entries()) {
      if (this.matches(doc, query)) {
        return { ...doc, id };
      }
    }
    return null;
  }

  // Find many documents
  async find(collection, query = {}, options = {}) {
    const coll = this.getCollection(collection);
    let results = [];

    for (const [id, doc] of coll.entries()) {
      if (this.matches(doc, query)) {
        results.push({ ...doc, id });
      }
    }

    // Apply limit
    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  // Insert one document
  async insertOne(collection, document) {
    const coll = this.getCollection(collection);
    const id = document.id || this.generateId();
    const doc = { ...document, id };
    coll.set(id, doc);
    return doc;
  }

  // Update one document
  async updateOne(collection, query, update) {
    const coll = this.getCollection(collection);
    for (const [id, doc] of coll.entries()) {
      if (this.matches(doc, query)) {
        const updated = { ...doc, ...update };
        coll.set(id, updated);
        return updated;
      }
    }
    return null;
  }

  // Delete one document
  async deleteOne(collection, query) {
    const coll = this.getCollection(collection);
    for (const [id, doc] of coll.entries()) {
      if (this.matches(doc, query)) {
        coll.delete(id);
        return true;
      }
    }
    return false;
  }

  // Count documents
  async count(collection, query = {}) {
    const results = await this.find(collection, query);
    return results.length;
  }

  // Helper: Check if document matches query
  matches(doc, query) {
    for (const [key, value] of Object.entries(query)) {
      if (doc[key] !== value) {
        return false;
      }
    }
    return true;
  }

  // Helper: Generate unique ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
