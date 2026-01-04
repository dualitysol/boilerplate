/**
 * Migration: add_comments_table
 * Version: 4
 * Description: Add comments table with threading support
 */

export default {
  name: '004_add_comments_table',
  version: 4,
  description: 'Add comments table with threading support',

  /**
   * Apply migration
   */
  async up(db) {
    // MongoDB implementation
    if (db.collection) {
      await db.createCollection('comments');
      
      // Create indexes
      await db.collection('comments').createIndex({ postId: 1 });
      await db.collection('comments').createIndex({ authorId: 1 });
      await db.collection('comments').createIndex({ parentId: 1 });
      await db.collection('comments').createIndex({ createdAt: -1 });
      await db.collection('comments').createIndex({ status: 1 });
      
      console.log('Created comments collection with indexes');
    }
    // PostgreSQL implementation
    else if (db.query) {
      await db.query(`
        CREATE TABLE comments (
          id SERIAL PRIMARY KEY,
          post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
          author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          status VARCHAR(20) DEFAULT 'approved',
          like_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create indexes
      await db.query('CREATE INDEX idx_comments_post_id ON comments(post_id)');
      await db.query('CREATE INDEX idx_comments_author_id ON comments(author_id)');
      await db.query('CREATE INDEX idx_comments_parent_id ON comments(parent_id)');
      await db.query('CREATE INDEX idx_comments_created_at ON comments(created_at DESC)');
      await db.query('CREATE INDEX idx_comments_status ON comments(status)');
      
      console.log('Created comments table with indexes');
    }
  },

  /**
   * Rollback migration
   */
  async down(db) {
    // MongoDB implementation
    if (db.collection) {
      await db.dropCollection('comments');
      console.log('Dropped comments collection');
    }
    // PostgreSQL/MySQL implementation
    else if (db.query) {
      await db.query('DROP TABLE IF EXISTS comments');
      console.log('Dropped comments table');
    }
  }
};
