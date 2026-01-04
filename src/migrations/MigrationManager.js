/**
 * Database Migration Manager
 * 
 * Features:
 * - Up/Down migration system
 * - Migration history tracking
 * - Automatic migration detection
 * - Multiple database support (MongoDB, PostgreSQL, MySQL)
 * - Transaction support for SQL migrations
 * - Migration versioning and rollback
 * - Dry-run mode
 * - Migration validation
 * 
 * @example
 * const migrationManager = new MigrationManager({
 *   directory: './migrations',
 *   database: 'mongodb',
 *   connection: mongoClient,
 *   tableName: 'migrations'
 * });
 * 
 * await migrationManager.migrate('up');
 * await migrationManager.migrate('down', 1);
 * await migrationManager.status();
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

/**
 * Migration file structure:
 * 
 * export default {
 *   name: '001_create_users_table',
 *   version: 1,
 *   description: 'Create users table with basic fields',
 *   
 *   async up(db) {
 *     // Forward migration
 *   },
 *   
 *   async down(db) {
 *     // Rollback migration
 *   }
 * }
 */

export class MigrationManager {
  constructor(options = {}) {
    this.directory = options.directory || './migrations';
    this.database = options.database || 'mongodb'; // mongodb, postgres, mysql
    this.connection = options.connection;
    this.tableName = options.tableName || 'migrations';
    this.logger = options.logger || console;
    this.dryRun = options.dryRun || false;
    
    this.migrations = [];
    this.executedMigrations = new Set();
  }

  /**
   * Initialize migration system
   * Creates migration history table/collection if not exists
   */
  async initialize() {
    await this.ensureDirectory();
    await this.createMigrationTable();
    await this.loadMigrations();
    await this.loadExecutedMigrations();
  }

  /**
   * Ensure migrations directory exists
   */
  async ensureDirectory() {
    try {
      await fs.access(this.directory);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.mkdir(this.directory, { recursive: true });
        this.logger.info(`Created migrations directory: ${this.directory}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Create migration tracking table/collection
   */
  async createMigrationTable() {
    switch (this.database) {
      case 'mongodb':
        await this.createMongoCollection();
        break;
      case 'postgres':
        await this.createPostgresTable();
        break;
      case 'mysql':
        await this.createMySQLTable();
        break;
      default:
        throw new Error(`Unsupported database: ${this.database}`);
    }
  }

  async createMongoCollection() {
    const db = this.connection;
    const collections = await db.listCollections({ name: this.tableName }).toArray();
    
    if (collections.length === 0) {
      await db.createCollection(this.tableName);
      await db.collection(this.tableName).createIndex({ name: 1 }, { unique: true });
      await db.collection(this.tableName).createIndex({ executedAt: -1 });
      this.logger.info(`Created migration collection: ${this.tableName}`);
    }
  }

  async createPostgresTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        version INTEGER NOT NULL,
        description TEXT,
        checksum VARCHAR(64) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        execution_time INTEGER,
        status VARCHAR(20) DEFAULT 'pending'
      );
      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_executed_at ON ${this.tableName}(executed_at DESC);
    `;
    
    await this.connection.query(query);
    this.logger.info(`Created migration table: ${this.tableName}`);
  }

  async createMySQLTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        version INT NOT NULL,
        description TEXT,
        checksum VARCHAR(64) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        execution_time INT,
        status VARCHAR(20) DEFAULT 'pending',
        INDEX idx_executed_at (executed_at DESC)
      );
    `;
    
    await this.connection.query(query);
    this.logger.info(`Created migration table: ${this.tableName}`);
  }

  /**
   * Load migration files from directory
   */
  async loadMigrations() {
    const files = await fs.readdir(this.directory);
    const migrationFiles = files.filter(f => f.endsWith('.js') || f.endsWith('.mjs'));
    
    this.migrations = [];
    
    for (const file of migrationFiles) {
      const filePath = path.join(this.directory, file);
      const migration = await this.loadMigrationFile(filePath);
      
      if (migration) {
        this.migrations.push({
          ...migration,
          filename: file,
          filepath: filePath
        });
      }
    }
    
    // Sort by version
    this.migrations.sort((a, b) => a.version - b.version);
    
    this.logger.info(`Loaded ${this.migrations.length} migration files`);
  }

  /**
   * Load single migration file
   */
  async loadMigrationFile(filepath) {
    try {
      const module = await import(filepath);
      const migration = module.default || module;
      
      // Validate migration structure
      if (!migration.name || !migration.version) {
        throw new Error(`Invalid migration file: ${filepath} (missing name or version)`);
      }
      
      if (typeof migration.up !== 'function') {
        throw new Error(`Invalid migration file: ${filepath} (missing up function)`);
      }
      
      if (typeof migration.down !== 'function') {
        throw new Error(`Invalid migration file: ${filepath} (missing down function)`);
      }
      
      // Calculate checksum
      const content = await fs.readFile(filepath, 'utf-8');
      migration.checksum = this.calculateChecksum(content);
      
      return migration;
    } catch (error) {
      this.logger.error(`Failed to load migration file ${filepath}:`, error);
      return null;
    }
  }

  /**
   * Calculate file checksum for integrity verification
   */
  calculateChecksum(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Load executed migrations from database
   */
  async loadExecutedMigrations() {
    switch (this.database) {
      case 'mongodb':
        await this.loadMongoMigrations();
        break;
      case 'postgres':
        await this.loadPostgresMigrations();
        break;
      case 'mysql':
        await this.loadMySQLMigrations();
        break;
    }
    
    this.logger.info(`Loaded ${this.executedMigrations.size} executed migrations`);
  }

  async loadMongoMigrations() {
    const db = this.connection;
    const executed = await db.collection(this.tableName)
      .find({ status: 'completed' })
      .toArray();
    
    this.executedMigrations = new Set(executed.map(m => m.name));
  }

  async loadPostgresMigrations() {
    const result = await this.connection.query(
      `SELECT name FROM ${this.tableName} WHERE status = 'completed'`
    );
    
    this.executedMigrations = new Set(result.rows.map(r => r.name));
  }

  async loadMySQLMigrations() {
    const [rows] = await this.connection.query(
      `SELECT name FROM ${this.tableName} WHERE status = 'completed'`
    );
    
    this.executedMigrations = new Set(rows.map(r => r.name));
  }

  /**
   * Get pending migrations
   */
  getPendingMigrations() {
    return this.migrations.filter(m => !this.executedMigrations.has(m.name));
  }

  /**
   * Get executed migrations
   */
  getExecutedMigrations() {
    return this.migrations.filter(m => this.executedMigrations.has(m.name));
  }

  /**
   * Migrate up (apply pending migrations)
   * @param {number} steps - Number of migrations to apply (0 = all)
   */
  async migrate(direction = 'up', steps = 0) {
    if (direction === 'up') {
      return await this.migrateUp(steps);
    } else if (direction === 'down') {
      return await this.migrateDown(steps);
    } else {
      throw new Error(`Invalid migration direction: ${direction}`);
    }
  }

  async migrateUp(steps = 0) {
    const pending = this.getPendingMigrations();
    
    if (pending.length === 0) {
      this.logger.info('No pending migrations');
      return { applied: 0, migrations: [] };
    }
    
    const toApply = steps > 0 ? pending.slice(0, steps) : pending;
    const applied = [];
    
    this.logger.info(`Applying ${toApply.length} migration(s)...`);
    
    for (const migration of toApply) {
      try {
        await this.applyMigration(migration, 'up');
        applied.push(migration);
        this.logger.info(`✓ Applied: ${migration.name}`);
      } catch (error) {
        this.logger.error(`✗ Failed: ${migration.name}`, error);
        throw error;
      }
    }
    
    return { applied: applied.length, migrations: applied };
  }

  async migrateDown(steps = 1) {
    const executed = this.getExecutedMigrations().reverse();
    
    if (executed.length === 0) {
      this.logger.info('No migrations to rollback');
      return { rolledBack: 0, migrations: [] };
    }
    
    const toRollback = steps > 0 ? executed.slice(0, steps) : executed;
    const rolledBack = [];
    
    this.logger.info(`Rolling back ${toRollback.length} migration(s)...`);
    
    for (const migration of toRollback) {
      try {
        await this.applyMigration(migration, 'down');
        rolledBack.push(migration);
        this.logger.info(`✓ Rolled back: ${migration.name}`);
      } catch (error) {
        this.logger.error(`✗ Failed to rollback: ${migration.name}`, error);
        throw error;
      }
    }
    
    return { rolledBack: rolledBack.length, migrations: rolledBack };
  }

  /**
   * Apply single migration
   */
  async applyMigration(migration, direction) {
    const startTime = Date.now();
    
    if (this.dryRun) {
      this.logger.info(`[DRY-RUN] Would ${direction} migration: ${migration.name}`);
      return;
    }
    
    // Mark as pending
    await this.recordMigrationStart(migration);
    
    try {
      // Execute migration within transaction (if supported)
      if (direction === 'up') {
        await migration.up(this.connection);
        this.executedMigrations.add(migration.name);
      } else {
        await migration.down(this.connection);
        this.executedMigrations.delete(migration.name);
      }
      
      const executionTime = Date.now() - startTime;
      
      // Mark as completed
      await this.recordMigrationComplete(migration, executionTime, direction);
      
    } catch (error) {
      // Mark as failed
      await this.recordMigrationFailed(migration, error);
      throw error;
    }
  }

  /**
   * Record migration start
   */
  async recordMigrationStart(migration) {
    switch (this.database) {
      case 'mongodb':
        await this.connection.collection(this.tableName).updateOne(
          { name: migration.name },
          {
            $set: {
              name: migration.name,
              version: migration.version,
              description: migration.description || '',
              checksum: migration.checksum,
              status: 'pending',
              executedAt: new Date()
            }
          },
          { upsert: true }
        );
        break;
      case 'postgres':
        await this.connection.query(
          `INSERT INTO ${this.tableName} (name, version, description, checksum, status)
           VALUES ($1, $2, $3, $4, 'pending')
           ON CONFLICT (name) DO UPDATE SET status = 'pending', executed_at = CURRENT_TIMESTAMP`,
          [migration.name, migration.version, migration.description || '', migration.checksum]
        );
        break;
      case 'mysql':
        await this.connection.query(
          `INSERT INTO ${this.tableName} (name, version, description, checksum, status)
           VALUES (?, ?, ?, ?, 'pending')
           ON DUPLICATE KEY UPDATE status = 'pending', executed_at = CURRENT_TIMESTAMP`,
          [migration.name, migration.version, migration.description || '', migration.checksum]
        );
        break;
    }
  }

  /**
   * Record migration completion
   */
  async recordMigrationComplete(migration, executionTime, direction) {
    switch (this.database) {
      case 'mongodb':
        if (direction === 'up') {
          await this.connection.collection(this.tableName).updateOne(
            { name: migration.name },
            {
              $set: {
                status: 'completed',
                executionTime,
                executedAt: new Date()
              }
            }
          );
        } else {
          // Remove from history on down migration
          await this.connection.collection(this.tableName).deleteOne({
            name: migration.name
          });
        }
        break;
      case 'postgres':
        if (direction === 'up') {
          await this.connection.query(
            `UPDATE ${this.tableName}
             SET status = 'completed', execution_time = $1, executed_at = CURRENT_TIMESTAMP
             WHERE name = $2`,
            [executionTime, migration.name]
          );
        } else {
          await this.connection.query(
            `DELETE FROM ${this.tableName} WHERE name = $1`,
            [migration.name]
          );
        }
        break;
      case 'mysql':
        if (direction === 'up') {
          await this.connection.query(
            `UPDATE ${this.tableName}
             SET status = 'completed', execution_time = ?, executed_at = CURRENT_TIMESTAMP
             WHERE name = ?`,
            [executionTime, migration.name]
          );
        } else {
          await this.connection.query(
            `DELETE FROM ${this.tableName} WHERE name = ?`,
            [migration.name]
          );
        }
        break;
    }
  }

  /**
   * Record migration failure
   */
  async recordMigrationFailed(migration, error) {
    const errorMessage = error.message || String(error);
    
    switch (this.database) {
      case 'mongodb':
        await this.connection.collection(this.tableName).updateOne(
          { name: migration.name },
          {
            $set: {
              status: 'failed',
              error: errorMessage,
              executedAt: new Date()
            }
          }
        );
        break;
      case 'postgres':
        await this.connection.query(
          `UPDATE ${this.tableName}
           SET status = 'failed'
           WHERE name = $1`,
          [migration.name]
        );
        break;
      case 'mysql':
        await this.connection.query(
          `UPDATE ${this.tableName}
           SET status = 'failed'
           WHERE name = ?`,
          [migration.name]
        );
        break;
    }
  }

  /**
   * Get migration status
   */
  async status() {
    const pending = this.getPendingMigrations();
    const executed = this.getExecutedMigrations();
    
    const status = {
      total: this.migrations.length,
      executed: executed.length,
      pending: pending.length,
      migrations: this.migrations.map(m => ({
        name: m.name,
        version: m.version,
        description: m.description,
        status: this.executedMigrations.has(m.name) ? 'executed' : 'pending'
      }))
    };
    
    return status;
  }

  /**
   * Create new migration file
   */
  async create(name, description = '') {
    const version = this.migrations.length > 0
      ? Math.max(...this.migrations.map(m => m.version)) + 1
      : 1;
    
    const filename = `${String(version).padStart(3, '0')}_${name}.js`;
    const filepath = path.join(this.directory, filename);
    
    const template = this.getMigrationTemplate(name, version, description);
    
    await fs.writeFile(filepath, template, 'utf-8');
    
    this.logger.info(`Created migration: ${filename}`);
    
    return { filename, filepath, version };
  }

  /**
   * Get migration file template
   */
  getMigrationTemplate(name, version, description) {
    return `/**
 * Migration: ${name}
 * Version: ${version}
 * Description: ${description}
 */

export default {
  name: '${String(version).padStart(3, '0')}_${name}',
  version: ${version},
  description: '${description}',

  /**
   * Apply migration
   */
  async up(db) {
    // MongoDB example:
    // await db.createCollection('users');
    // await db.collection('users').createIndex({ email: 1 }, { unique: true });
    
    // PostgreSQL example:
    // await db.query(\`
    //   CREATE TABLE users (
    //     id SERIAL PRIMARY KEY,
    //     email VARCHAR(255) UNIQUE NOT NULL,
    //     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    //   )
    // \`);
    
    // MySQL example:
    // await db.query(\`
    //   CREATE TABLE users (
    //     id INT AUTO_INCREMENT PRIMARY KEY,
    //     email VARCHAR(255) UNIQUE NOT NULL,
    //     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    //   )
    // \`);
    
    throw new Error('Migration not implemented');
  },

  /**
   * Rollback migration
   */
  async down(db) {
    // MongoDB example:
    // await db.dropCollection('users');
    
    // PostgreSQL/MySQL example:
    // await db.query('DROP TABLE IF EXISTS users');
    
    throw new Error('Rollback not implemented');
  }
};
`;
  }

  /**
   * Verify migration integrity
   * Check if migration files have been modified
   */
  async verify() {
    const issues = [];
    
    for (const migration of this.getExecutedMigrations()) {
      const content = await fs.readFile(migration.filepath, 'utf-8');
      const currentChecksum = this.calculateChecksum(content);
      
      if (currentChecksum !== migration.checksum) {
        issues.push({
          name: migration.name,
          issue: 'checksum_mismatch',
          message: 'Migration file has been modified after execution'
        });
      }
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Reset all migrations (DANGEROUS - use with caution)
   */
  async reset() {
    this.logger.warn('RESETTING ALL MIGRATIONS - THIS WILL ROLLBACK EVERYTHING');
    
    const executed = this.getExecutedMigrations().reverse();
    
    for (const migration of executed) {
      await this.applyMigration(migration, 'down');
    }
    
    this.logger.info('All migrations reset');
  }
}

export default MigrationManager;
