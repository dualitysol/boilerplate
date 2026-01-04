/**
 * Migration: add_tags_and_categories
 * Version: 5
 * Description: Add tags and categories tables for content organization
 */

export default {
  name: '005_add_tags_and_categories',
  version: 5,
  description: 'Add tags and categories tables for content organization',

  /**
   * Apply migration
   */
  async up(db) {
    // MongoDB implementation
    if (db.collection) {
      // Create categories collection
      await db.createCollection('categories');
      await db.collection('categories').createIndex({ slug: 1 }, { unique: true });
      await db.collection('categories').createIndex({ parentId: 1 });
      
      // Create tags collection
      await db.createCollection('tags');
      await db.collection('tags').createIndex({ slug: 1 }, { unique: true });
      await db.collection('tags').createIndex({ name: 1 });
      
      // Create post_tags junction collection
      await db.createCollection('post_tags');
      await db.collection('post_tags').createIndex({ postId: 1, tagId: 1 }, { unique: true });
      await db.collection('post_tags').createIndex({ tagId: 1 });
      
      // Insert default categories
      await db.collection('categories').insertMany([
        { slug: 'uncategorized', name: 'Uncategorized', description: '', parentId: null, createdAt: new Date() },
        { slug: 'technology', name: 'Technology', description: 'Tech posts', parentId: null, createdAt: new Date() },
        { slug: 'lifestyle', name: 'Lifestyle', description: 'Lifestyle posts', parentId: null, createdAt: new Date() }
      ]);
      
      console.log('Created categories, tags, and post_tags collections');
    }
    // PostgreSQL implementation
    else if (db.query) {
      // Create categories table
      await db.query(`
        CREATE TABLE categories (
          id SERIAL PRIMARY KEY,
          slug VARCHAR(100) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          parent_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.query('CREATE INDEX idx_categories_slug ON categories(slug)');
      await db.query('CREATE INDEX idx_categories_parent_id ON categories(parent_id)');
      
      // Create tags table
      await db.query(`
        CREATE TABLE tags (
          id SERIAL PRIMARY KEY,
          slug VARCHAR(100) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          use_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.query('CREATE INDEX idx_tags_slug ON tags(slug)');
      await db.query('CREATE INDEX idx_tags_name ON tags(name)');
      await db.query('CREATE INDEX idx_tags_use_count ON tags(use_count DESC)');
      
      // Create post_tags junction table
      await db.query(`
        CREATE TABLE post_tags (
          post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
          tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (post_id, tag_id)
        )
      `);
      await db.query('CREATE INDEX idx_post_tags_post_id ON post_tags(post_id)');
      await db.query('CREATE INDEX idx_post_tags_tag_id ON post_tags(tag_id)');
      
      // Add category_id to posts table
      await db.query(`
        ALTER TABLE posts ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL
      `);
      await db.query('CREATE INDEX idx_posts_category_id ON posts(category_id)');
      
      // Insert default categories
      await db.query(`
        INSERT INTO categories (slug, name, description)
        VALUES 
          ('uncategorized', 'Uncategorized', ''),
          ('technology', 'Technology', 'Tech posts'),
          ('lifestyle', 'Lifestyle', 'Lifestyle posts')
      `);
      
      console.log('Created categories, tags, and post_tags tables');
    }
  },

  /**
   * Rollback migration
   */
  async down(db) {
    // MongoDB implementation
    if (db.collection) {
      await db.dropCollection('post_tags');
      await db.dropCollection('tags');
      await db.dropCollection('categories');
      console.log('Dropped categories, tags, and post_tags collections');
    }
    // PostgreSQL/MySQL implementation
    else if (db.query) {
      await db.query('ALTER TABLE posts DROP COLUMN IF EXISTS category_id');
      await db.query('DROP TABLE IF EXISTS post_tags');
      await db.query('DROP TABLE IF EXISTS tags');
      await db.query('DROP TABLE IF EXISTS categories');
      console.log('Dropped categories, tags, and post_tags tables');
    }
  }
};
