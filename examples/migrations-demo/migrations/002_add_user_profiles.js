/**
 * Migration: add_user_profiles
 * Version: 2
 * Description: Add user profiles table with avatar and bio
 */

export default {
  name: '002_add_user_profiles',
  version: 2,
  description: 'Add user profiles table with avatar and bio',

  /**
   * Apply migration
   */
  async up(db) {
    // MongoDB implementation
    if (db.collection) {
      await db.createCollection('user_profiles');
      
      // Create indexes
      await db.collection('user_profiles').createIndex({ userId: 1 }, { unique: true });
      await db.collection('user_profiles').createIndex({ slug: 1 }, { unique: true });
      
      // Add default profile for existing users
      const users = await db.collection('users').find({}).toArray();
      if (users.length > 0) {
        const profiles = users.map(user => ({
          userId: user._id,
          slug: user.username,
          bio: '',
          avatar: null,
          website: null,
          location: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }));
        
        await db.collection('user_profiles').insertMany(profiles);
        console.log(`Created profiles for ${profiles.length} existing users`);
      }
      
      console.log('Created user_profiles collection');
    }
    // PostgreSQL implementation
    else if (db.query) {
      await db.query(`
        CREATE TABLE user_profiles (
          id SERIAL PRIMARY KEY,
          user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          slug VARCHAR(100) UNIQUE NOT NULL,
          bio TEXT,
          avatar VARCHAR(500),
          website VARCHAR(255),
          location VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create indexes
      await db.query('CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id)');
      await db.query('CREATE INDEX idx_user_profiles_slug ON user_profiles(slug)');
      
      // Add default profile for existing users
      await db.query(`
        INSERT INTO user_profiles (user_id, slug, bio, created_at, updated_at)
        SELECT id, username, '', created_at, created_at
        FROM users
      `);
      
      console.log('Created user_profiles table with default profiles');
    }
  },

  /**
   * Rollback migration
   */
  async down(db) {
    // MongoDB implementation
    if (db.collection) {
      await db.dropCollection('user_profiles');
      console.log('Dropped user_profiles collection');
    }
    // PostgreSQL/MySQL implementation
    else if (db.query) {
      await db.query('DROP TABLE IF EXISTS user_profiles');
      console.log('Dropped user_profiles table');
    }
  }
};
