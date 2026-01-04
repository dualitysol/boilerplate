/**
 * Migration: create_users_table
 * Version: 1
 * Description: Create users table with basic authentication fields
 */

export default {
  name: '001_create_users_table',
  version: 1,
  description: 'Create users table with basic authentication fields',

  /**
   * Apply migration
   */
  async up(db) {
    // MongoDB implementation
    if (db.collection) {
      await db.createCollection('users');
      
      // Create indexes
      await db.collection('users').createIndex({ email: 1 }, { unique: true });
      await db.collection('users').createIndex({ username: 1 }, { unique: true });
      await db.collection('users').createIndex({ createdAt: -1 });
      
      console.log('Created users collection with indexes');
    }
    // PostgreSQL implementation
    else if (db.query) {
      await db.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          username VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create indexes
      await db.query('CREATE INDEX idx_users_email ON users(email)');
      await db.query('CREATE INDEX idx_users_username ON users(username)');
      await db.query('CREATE INDEX idx_users_status ON users(status)');
      await db.query('CREATE INDEX idx_users_created_at ON users(created_at DESC)');
      
      console.log('Created users table with indexes');
    }
  },

  /**
   * Rollback migration
   */
  async down(db) {
    // MongoDB implementation
    if (db.collection) {
      await db.dropCollection('users');
      console.log('Dropped users collection');
    }
    // PostgreSQL/MySQL implementation
    else if (db.query) {
      await db.query('DROP TABLE IF EXISTS users');
      console.log('Dropped users table');
    }
  }
};
