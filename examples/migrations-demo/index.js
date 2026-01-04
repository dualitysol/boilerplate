/**
 * Database Migrations Demo
 * 
 * This example demonstrates the Migration Manager for database schema versioning.
 * 
 * Features:
 * - Up/Down migrations
 * - Migration history tracking
 * - Automatic migration detection
 * - Support for MongoDB, PostgreSQL, MySQL
 * - Migration integrity verification
 * - Dry-run mode
 * 
 * Usage:
 * 1. Set up database connection (see environment variables below)
 * 2. Run: node index.js
 * 3. Try CLI commands
 */

import { MigrationManager } from '../../src/migrations/MigrationManager.js';
import { MongoClient } from 'mongodb';

/**
 * Configure database connection
 * 
 * For PostgreSQL:
 * import pg from 'pg';
 * const { Pool } = pg;
 * const pool = new Pool({
 *   host: 'localhost',
 *   port: 5432,
 *   database: 'test',
 *   user: 'postgres',
 *   password: 'password'
 * });
 * 
 * For MySQL:
 * import mysql from 'mysql2/promise';
 * const connection = await mysql.createConnection({
 *   host: 'localhost',
 *   port: 3306,
 *   database: 'test',
 *   user: 'root',
 *   password: 'password'
 * });
 */

async function runDemo() {
  console.log('🔄 Database Migration Manager Demo\n');
  
  // Connect to MongoDB (change this for your database)
  const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
  const client = new MongoClient(mongoUrl);
  
  try {
    await client.connect();
    console.log('✓ Connected to MongoDB\n');
    
    const db = client.db('migrations_demo');
    
    // Initialize migration manager
    const migrationManager = new MigrationManager({
      directory: './migrations',
      database: 'mongodb', // Change to 'postgres' or 'mysql' for other databases
      connection: db,
      tableName: 'migrations',
      logger: console
    });
    
    await migrationManager.initialize();
    console.log('✓ Migration manager initialized\n');
    
    // Demo 1: Show current status
    console.log('=== Demo 1: Migration Status ===\n');
    const status = await migrationManager.status();
    console.log(`Total migrations: ${status.total}`);
    console.log(`Executed: ${status.executed}`);
    console.log(`Pending: ${status.pending}\n`);
    
    if (status.migrations.length > 0) {
      console.log('Available migrations:');
      status.migrations.forEach(m => {
        const icon = m.status === 'executed' ? '✓' : '○';
        console.log(`  ${icon} [${m.version}] ${m.name}`);
        console.log(`     ${m.description}`);
      });
      console.log();
    }
    
    // Demo 2: Apply migrations
    if (status.pending > 0) {
      console.log('=== Demo 2: Apply Migrations ===\n');
      console.log(`Applying ${status.pending} pending migration(s)...\n`);
      
      const result = await migrationManager.migrate('up');
      console.log(`\n✓ Applied ${result.applied} migration(s)\n`);
      
      // Show updated status
      const newStatus = await migrationManager.status();
      console.log(`New status: ${newStatus.executed}/${newStatus.total} executed\n`);
    }
    
    // Demo 3: Verify migration integrity
    console.log('=== Demo 3: Verify Migration Integrity ===\n');
    const verification = await migrationManager.verify();
    
    if (verification.valid) {
      console.log('✓ All migrations are valid and unmodified\n');
    } else {
      console.log('⚠ Migration integrity issues found:');
      verification.issues.forEach(issue => {
        console.log(`  - ${issue.name}: ${issue.message}`);
      });
      console.log();
    }
    
    // Demo 4: Create new migration
    console.log('=== Demo 4: Create New Migration ===\n');
    const newMigration = await migrationManager.create(
      'add_user_settings',
      'Add user settings table for preferences'
    );
    console.log(`✓ Created migration: ${newMigration.filename}`);
    console.log(`  Path: ${newMigration.filepath}`);
    console.log(`  Version: ${newMigration.version}\n`);
    
    // Demo 5: Rollback example (commented out to prevent data loss)
    console.log('=== Demo 5: Rollback (Preview Only) ===\n');
    console.log('To rollback the last migration, run:');
    console.log('  await migrationManager.migrate(\'down\', 1);\n');
    console.log('To rollback all migrations, run:');
    console.log('  await migrationManager.reset();\n');
    
    // Demo 6: CLI usage
    console.log('=== Demo 6: CLI Usage ===\n');
    console.log('You can also use the CLI for migrations:\n');
    console.log('Show status:');
    console.log('  node ../../src/migrations/cli.js status\n');
    console.log('Apply all pending migrations:');
    console.log('  node ../../src/migrations/cli.js up\n');
    console.log('Apply next migration only:');
    console.log('  node ../../src/migrations/cli.js up 1\n');
    console.log('Rollback last migration:');
    console.log('  node ../../src/migrations/cli.js down\n');
    console.log('Rollback last 2 migrations:');
    console.log('  node ../../src/migrations/cli.js down 2\n');
    console.log('Create new migration:');
    console.log('  node ../../src/migrations/cli.js create add_feature --description "Add feature"\n');
    console.log('Verify migrations:');
    console.log('  node ../../src/migrations/cli.js verify\n');
    console.log('Dry-run (preview):');
    console.log('  node ../../src/migrations/cli.js up --dry-run true\n');
    
    // Demo 7: Environment variables
    console.log('=== Demo 7: Environment Variables ===\n');
    console.log('For MongoDB:');
    console.log('  DB_TYPE=mongodb');
    console.log('  MONGO_URL=mongodb://localhost:27017');
    console.log('  MONGO_DATABASE=test\n');
    console.log('For PostgreSQL:');
    console.log('  DB_TYPE=postgres');
    console.log('  PG_HOST=localhost');
    console.log('  PG_PORT=5432');
    console.log('  PG_DATABASE=test');
    console.log('  PG_USER=postgres');
    console.log('  PG_PASSWORD=password\n');
    console.log('For MySQL:');
    console.log('  DB_TYPE=mysql');
    console.log('  MYSQL_HOST=localhost');
    console.log('  MYSQL_PORT=3306');
    console.log('  MYSQL_DATABASE=test');
    console.log('  MYSQL_USER=root');
    console.log('  MYSQL_PASSWORD=password\n');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('✓ Closed database connection');
  }
}

// Run demo
runDemo().catch(console.error);
