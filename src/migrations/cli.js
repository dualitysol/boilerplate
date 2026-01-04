#!/usr/bin/env node

/**
 * Migration CLI
 * 
 * Commands:
 * - migrate up [steps]      - Apply pending migrations
 * - migrate down [steps]    - Rollback migrations
 * - migrate status          - Show migration status
 * - migrate create <name>   - Create new migration
 * - migrate verify          - Verify migration integrity
 * - migrate reset           - Reset all migrations (DANGEROUS)
 * 
 * @example
 * node cli.js up
 * node cli.js down 1
 * node cli.js status
 * node cli.js create add_users_table
 * node cli.js verify
 */

import { MigrationManager } from './MigrationManager.js';
import { MongoClient } from 'mongodb';
import pg from 'pg';
import mysql from 'mysql2/promise';

const { Pool } = pg;

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  
  return {
    command: args[0] || 'status',
    subcommand: args[1],
    options: parseOptions(args.slice(2))
  };
}

function parseOptions(args) {
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[i + 1];
      options[key] = value;
      i++;
    }
  }
  
  return options;
}

/**
 * Get database configuration from environment
 */
function getDbConfig() {
  const type = process.env.DB_TYPE || 'mongodb';
  
  switch (type) {
    case 'mongodb':
      return {
        type: 'mongodb',
        url: process.env.MONGO_URL || 'mongodb://localhost:27017',
        database: process.env.MONGO_DATABASE || 'test'
      };
    case 'postgres':
      return {
        type: 'postgres',
        host: process.env.PG_HOST || 'localhost',
        port: parseInt(process.env.PG_PORT || '5432'),
        database: process.env.PG_DATABASE || 'test',
        user: process.env.PG_USER || 'postgres',
        password: process.env.PG_PASSWORD || ''
      };
    case 'mysql':
      return {
        type: 'mysql',
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT || '3306'),
        database: process.env.MYSQL_DATABASE || 'test',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || ''
      };
    default:
      throw new Error(`Unsupported database type: ${type}`);
  }
}

/**
 * Connect to database
 */
async function connectDatabase(config) {
  switch (config.type) {
    case 'mongodb': {
      const client = new MongoClient(config.url);
      await client.connect();
      return {
        connection: client.db(config.database),
        type: 'mongodb',
        close: () => client.close()
      };
    }
    case 'postgres': {
      const pool = new Pool(config);
      await pool.query('SELECT 1'); // Test connection
      return {
        connection: pool,
        type: 'postgres',
        close: () => pool.end()
      };
    }
    case 'mysql': {
      const connection = await mysql.createConnection(config);
      return {
        connection,
        type: 'mysql',
        close: () => connection.end()
      };
    }
    default:
      throw new Error(`Unsupported database type: ${config.type}`);
  }
}

/**
 * Main CLI function
 */
async function main() {
  const { command, subcommand, options } = parseArgs();
  
  console.log('🔄 Database Migration Tool\n');
  
  try {
    // Connect to database
    const dbConfig = getDbConfig();
    console.log(`📦 Connecting to ${dbConfig.type} database...`);
    const db = await connectDatabase(dbConfig);
    
    // Initialize migration manager
    const migrationManager = new MigrationManager({
      directory: options.directory || './migrations',
      database: db.type,
      connection: db.connection,
      tableName: options.table || 'migrations',
      dryRun: options['dry-run'] === 'true'
    });
    
    await migrationManager.initialize();
    
    // Execute command
    switch (command) {
      case 'up':
      case 'migrate': {
        const steps = parseInt(subcommand) || 0;
        console.log(`\n📈 Migrating up${steps > 0 ? ` (${steps} step${steps > 1 ? 's' : ''})` : ' (all)'}...\n`);
        const result = await migrationManager.migrate('up', steps);
        console.log(`\n✅ Applied ${result.applied} migration(s)`);
        break;
      }
      
      case 'down':
      case 'rollback': {
        const steps = parseInt(subcommand) || 1;
        console.log(`\n📉 Rolling back${steps > 0 ? ` (${steps} step${steps > 1 ? 's' : ''})` : ' (all)'}...\n`);
        const result = await migrationManager.migrate('down', steps);
        console.log(`\n✅ Rolled back ${result.rolledBack} migration(s)`);
        break;
      }
      
      case 'status': {
        console.log('\n📊 Migration Status:\n');
        const status = await migrationManager.status();
        
        console.log(`Total migrations: ${status.total}`);
        console.log(`Executed: ${status.executed}`);
        console.log(`Pending: ${status.pending}\n`);
        
        if (status.migrations.length > 0) {
          console.log('Migrations:');
          status.migrations.forEach(m => {
            const icon = m.status === 'executed' ? '✓' : '○';
            console.log(`  ${icon} [${m.version}] ${m.name} - ${m.description || 'No description'}`);
          });
        }
        break;
      }
      
      case 'create': {
        if (!subcommand) {
          throw new Error('Migration name is required');
        }
        
        const description = options.description || '';
        console.log(`\n📝 Creating migration: ${subcommand}...\n`);
        const result = await migrationManager.create(subcommand, description);
        console.log(`✅ Created: ${result.filename}`);
        console.log(`   Path: ${result.filepath}`);
        console.log(`   Version: ${result.version}`);
        break;
      }
      
      case 'verify': {
        console.log('\n🔍 Verifying migration integrity...\n');
        const result = await migrationManager.verify();
        
        if (result.valid) {
          console.log('✅ All migrations are valid');
        } else {
          console.log('❌ Migration integrity issues found:\n');
          result.issues.forEach(issue => {
            console.log(`  ${issue.name}: ${issue.message}`);
          });
          process.exit(1);
        }
        break;
      }
      
      case 'reset': {
        console.log('\n⚠️  WARNING: This will rollback ALL migrations!');
        console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        await migrationManager.reset();
        console.log('✅ All migrations reset');
        break;
      }
      
      default:
        console.log(`Unknown command: ${command}\n`);
        printUsage();
        process.exit(1);
    }
    
    // Close database connection
    await db.close();
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(1);
  }
}

/**
 * Print usage information
 */
function printUsage() {
  console.log(`
Usage: node cli.js <command> [options]

Commands:
  up [steps]           Apply pending migrations (default: all)
  down [steps]         Rollback migrations (default: 1)
  status               Show migration status
  create <name>        Create new migration file
  verify               Verify migration integrity
  reset                Reset all migrations (DANGEROUS)

Options:
  --directory <path>   Migrations directory (default: ./migrations)
  --table <name>       Migration table name (default: migrations)
  --dry-run            Preview changes without executing
  --description <text> Migration description (for create command)

Environment Variables:
  DB_TYPE              Database type: mongodb, postgres, mysql (default: mongodb)
  
  MongoDB:
    MONGO_URL          Connection URL (default: mongodb://localhost:27017)
    MONGO_DATABASE     Database name (default: test)
  
  PostgreSQL:
    PG_HOST            Host (default: localhost)
    PG_PORT            Port (default: 5432)
    PG_DATABASE        Database (default: test)
    PG_USER            User (default: postgres)
    PG_PASSWORD        Password
  
  MySQL:
    MYSQL_HOST         Host (default: localhost)
    MYSQL_PORT         Port (default: 3306)
    MYSQL_DATABASE     Database (default: test)
    MYSQL_USER         User (default: root)
    MYSQL_PASSWORD     Password

Examples:
  node cli.js up                          # Apply all pending migrations
  node cli.js up 1                        # Apply next migration
  node cli.js down                        # Rollback last migration
  node cli.js down 2                      # Rollback last 2 migrations
  node cli.js status                      # Show migration status
  node cli.js create add_users_table      # Create new migration
  node cli.js verify                      # Verify integrity
  node cli.js up --dry-run true           # Preview migrations
`);
}

// Run CLI
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
