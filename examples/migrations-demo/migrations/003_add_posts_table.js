/**
 * Migration: add_posts_table
 * Version: 3
 * Description: Add posts table for user content
 */

export default {
  name: '003_add_posts_table',
  version: 3,
  description: 'Add posts table for user content',

  /**
   * Apply migration
   */
  async up(db) {
    // MongoDB implementation
    if (db.collection) {
      await db.createCollection('posts');
      
      // Create indexes
      await db.collection('posts').createIndex({ authorId: 1 });
      await db.collection('posts').createIndex({ slug: 1 }, { unique: true });
      await db.collection('posts').createIndex({ status: 1 });
      await db.collection('posts').createIndex({ publishedAt: -1 });
      await db.collection('posts').createIndex({ tags: 1 });
      
      // Create text index for full-text search
      await db.collection('posts').createIndex(
        { title: 'text', content: 'text' },
        { weights: { title: 10, content: 5 } }
      );
      
      console.log('Created posts collection with indexes');
    }
    // PostgreSQL implementation
    else if (db.query) {
      await db.query(`
        CREATE TABLE posts (
          id SERIAL PRIMARY KEY,
          author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          slug VARCHAR(200) UNIQUE NOT NULL,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          excerpt TEXT,
          status VARCHAR(20) DEFAULT 'draft',
          tags TEXT[],
          view_count INTEGER DEFAULT 0,
          published_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create indexes
      await db.query('CREATE INDEX idx_posts_author_id ON posts(author_id)');
      await db.query('CREATE INDEX idx_posts_slug ON posts(slug)');
      await db.query('CREATE INDEX idx_posts_status ON posts(status)');
      await db.query('CREATE INDEX idx_posts_published_at ON posts(published_at DESC)');
      await db.query('CREATE INDEX idx_posts_tags ON posts USING GIN(tags)');
      
      // Create full-text search index
      await db.query(`
        ALTER TABLE posts ADD COLUMN tsv tsvector;
      `);
      await db.query(`
        CREATE INDEX idx_posts_tsv ON posts USING GIN(tsv);
      `);
      await db.query(`
        CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
        ON posts FOR EACH ROW EXECUTE FUNCTION
        tsvector_update_trigger(tsv, 'pg_catalog.english', title, content);
      `);
      
      console.log('Created posts table with indexes and full-text search');
    }
  },

  /**
   * Rollback migration
   */
  async down(db) {
    // MongoDB implementation
    if (db.collection) {
      await db.dropCollection('posts');
      console.log('Dropped posts collection');
    }
    // PostgreSQL/MySQL implementation
    else if (db.query) {
      await db.query('DROP TABLE IF EXISTS posts');
      console.log('Dropped posts table');
    }
  }
};
