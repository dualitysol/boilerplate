# Database Migrations Demo

Complete database migration system with schema versioning, rollback support, and integrity verification.

## Features

- ✅ **Up/Down Migrations** - Forward and backward migration support
- ✅ **Migration History** - Track executed migrations in database
- ✅ **Automatic Detection** - Auto-discover migration files
- ✅ **Multi-Database** - MongoDB, PostgreSQL, MySQL support
- ✅ **Integrity Verification** - Checksum validation for migration files
- ✅ **Dry-Run Mode** - Preview changes without executing
- ✅ **CLI Tool** - Command-line interface for easy management
- ✅ **Transaction Support** - SQL migrations run in transactions
- ✅ **Migration Versioning** - Sequential version numbers

## Installation

```bash
npm install
```

## Database Setup

### MongoDB (Default)

```bash
# Start MongoDB
docker run -d -p 27017:27017 mongo:latest

# Set environment variables
export DB_TYPE=mongodb
export MONGO_URL=mongodb://localhost:27017
export MONGO_DATABASE=migrations_demo
```

### PostgreSQL

```bash
# Start PostgreSQL
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:latest

# Set environment variables
export DB_TYPE=postgres
export PG_HOST=localhost
export PG_PORT=5432
export PG_DATABASE=test
export PG_USER=postgres
export PG_PASSWORD=password
```

### MySQL

```bash
# Start MySQL
docker run -d -p 3306:3306 -e MYSQL_ROOT_PASSWORD=password mysql:latest

# Set environment variables
export DB_TYPE=mysql
export MYSQL_HOST=localhost
export MYSQL_PORT=3306
export MYSQL_DATABASE=test
export MYSQL_USER=root
export MYSQL_PASSWORD=password
```

## Usage

### Run Demo

```bash
node index.js
```

This will:
1. Initialize migration manager
2. Show migration status
3. Apply pending migrations
4. Verify migration integrity
5. Create a new migration file
6. Display CLI usage examples

### CLI Commands

#### Show Migration Status

```bash
npm run migrate:status
# or
node ../../src/migrations/cli.js status
```

Output:
```
📊 Migration Status:

Total migrations: 5
Executed: 3
Pending: 2

Migrations:
  ✓ [1] 001_create_users_table - Create users table
  ✓ [2] 002_add_user_profiles - Add user profiles
  ✓ [3] 003_add_posts_table - Add posts table
  ○ [4] 004_add_comments_table - Add comments table
  ○ [5] 005_add_tags_and_categories - Add tags and categories
```

#### Apply All Pending Migrations

```bash
npm run migrate:up
# or
node ../../src/migrations/cli.js up
```

#### Apply Next Migration Only

```bash
node ../../src/migrations/cli.js up 1
```

#### Rollback Last Migration

```bash
npm run migrate:down
# or
node ../../src/migrations/cli.js down
```

#### Rollback Multiple Migrations

```bash
node ../../src/migrations/cli.js down 2
```

#### Create New Migration

```bash
npm run migrate:create add_user_settings
# or
node ../../src/migrations/cli.js create add_user_settings --description "Add user settings table"
```

This creates a new migration file:
```
migrations/006_add_user_settings.js
```

#### Verify Migration Integrity

```bash
npm run migrate:verify
# or
node ../../src/migrations/cli.js verify
```

Checks if migration files have been modified after execution.

#### Dry-Run (Preview)

```bash
node ../../src/migrations/cli.js up --dry-run true
```

Shows what would be executed without making changes.

#### Reset All Migrations (DANGEROUS)

```bash
npm run migrate:reset
# or
node ../../src/migrations/cli.js reset
```

⚠️ **Warning:** This rolls back ALL migrations. Use with caution!

## Migration Files

### Structure

Migration files are located in `./migrations/` directory:

```
migrations/
├── 001_create_users_table.js
├── 002_add_user_profiles.js
├── 003_add_posts_table.js
├── 004_add_comments_table.js
└── 005_add_tags_and_categories.js
```

### Migration Template

```javascript
export default {
  name: '001_create_users_table',
  version: 1,
  description: 'Create users table with basic fields',

  async up(db) {
    // Forward migration
    if (db.collection) {
      // MongoDB
      await db.createCollection('users');
      await db.collection('users').createIndex({ email: 1 }, { unique: true });
    } else if (db.query) {
      // PostgreSQL/MySQL
      await db.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL
        )
      `);
    }
  },

  async down(db) {
    // Rollback migration
    if (db.collection) {
      await db.dropCollection('users');
    } else if (db.query) {
      await db.query('DROP TABLE IF EXISTS users');
    }
  }
};
```

### Example Migrations

#### 1. Create Users Table (001)

Creates users table with:
- Email (unique)
- Username (unique)
- Password hash
- Name fields
- Status
- Timestamps

**MongoDB:** Collection with unique indexes
**PostgreSQL/MySQL:** Table with indexes

#### 2. Add User Profiles (002)

Creates user_profiles table with:
- User reference
- Slug (unique)
- Bio, avatar, website, location
- Automatic profile creation for existing users

**MongoDB:** Separate collection with userId reference
**PostgreSQL/MySQL:** Foreign key to users table

#### 3. Add Posts Table (003)

Creates posts table with:
- Author reference
- Slug, title, content
- Status, tags, view count
- Full-text search indexes

**MongoDB:** Text indexes for search
**PostgreSQL:** GIN indexes + tsvector for full-text search
**MySQL:** FULLTEXT indexes

#### 4. Add Comments Table (004)

Creates comments table with:
- Post and author references
- Parent comment (threading support)
- Status, like count
- Timestamps

#### 5. Add Tags and Categories (005)

Creates:
- Categories table (hierarchical)
- Tags table
- Post-tags junction table
- Default categories

**MongoDB:** Separate collections
**PostgreSQL/MySQL:** Foreign keys + junction table

## Programmatic Usage

```javascript
import { MigrationManager } from '@dualitysol/boilerplate/migrations';
import { MongoClient } from 'mongodb';

const client = new MongoClient('mongodb://localhost:27017');
await client.connect();
const db = client.db('test');

const migrationManager = new MigrationManager({
  directory: './migrations',
  database: 'mongodb',
  connection: db,
  tableName: 'migrations',
  logger: console
});

await migrationManager.initialize();

// Show status
const status = await migrationManager.status();
console.log(`Pending migrations: ${status.pending}`);

// Apply migrations
await migrationManager.migrate('up');

// Rollback
await migrationManager.migrate('down', 1);

// Create new migration
await migrationManager.create('add_feature', 'Description');

// Verify integrity
const verification = await migrationManager.verify();
if (!verification.valid) {
  console.error('Migration integrity issues:', verification.issues);
}
```

## Migration History

The migration history is tracked in the database:

### MongoDB Collection

```json
{
  "_id": ObjectId("..."),
  "name": "001_create_users_table",
  "version": 1,
  "description": "Create users table",
  "checksum": "abc123...",
  "status": "completed",
  "executedAt": ISODate("2024-01-01T00:00:00Z"),
  "executionTime": 150
}
```

### PostgreSQL/MySQL Table

```sql
CREATE TABLE migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  version INTEGER NOT NULL,
  description TEXT,
  checksum VARCHAR(64) NOT NULL,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  execution_time INTEGER,
  status VARCHAR(20) DEFAULT 'pending'
);
```

## Best Practices

### 1. Never Modify Executed Migrations

Once a migration is executed in production, never modify it. Create a new migration instead.

```bash
# ❌ Wrong: Modify 001_create_users_table.js
# ✅ Right: Create new migration
node cli.js create add_user_email_index
```

### 2. Always Provide Rollback

Every migration should have a working `down()` method:

```javascript
async down(db) {
  // Undo changes from up()
  await db.dropCollection('users');
}
```

### 3. Test Migrations

Test both `up()` and `down()` in development:

```bash
# Apply
node cli.js up 1

# Verify data
# ...

# Rollback
node cli.js down 1

# Verify rollback
# ...
```

### 4. Use Transactions (SQL)

PostgreSQL/MySQL migrations should use transactions when possible:

```javascript
async up(db) {
  await db.query('BEGIN');
  try {
    await db.query('CREATE TABLE users (...)');
    await db.query('CREATE INDEX ...');
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}
```

### 5. Keep Migrations Small

Create small, focused migrations:

```bash
# ❌ Wrong: One huge migration
create massive_schema_update

# ✅ Right: Multiple small migrations
create add_users_table
create add_posts_table
create add_comments_table
```

### 6. Verify Before Production

Always verify migrations in staging:

```bash
# Staging environment
node cli.js verify
node cli.js up

# Test application
# ...

# Production
node cli.js verify
node cli.js up
```

## Troubleshooting

### Migration Fails

If a migration fails, it's marked as "failed" in the database:

```bash
# Check status
node cli.js status

# Fix the migration file
# Then retry
node cli.js up
```

### Checksum Mismatch

If you see "checksum mismatch" errors:

1. **Production:** Never modify executed migrations! Create a new migration.
2. **Development:** If safe, reset and re-apply:

```bash
node cli.js reset
node cli.js up
```

### Wrong Database Type

Make sure `DB_TYPE` matches your database:

```bash
export DB_TYPE=mongodb  # or postgres, mysql
node cli.js status
```

## Production Deployment

### 1. Automated Deployment

Add to your CI/CD pipeline:

```bash
# Before deploying application
npm run migrate:up

# Deploy application
npm start
```

### 2. Manual Deployment

```bash
# 1. Verify migrations
node cli.js verify

# 2. Check status
node cli.js status

# 3. Apply migrations
node cli.js up

# 4. Start application
npm start
```

### 3. Rollback Plan

Always have a rollback plan:

```bash
# If deployment fails
node cli.js down 1  # Rollback last migration
# Redeploy previous application version
```

## API Reference

### MigrationManager

```javascript
const manager = new MigrationManager({
  directory: './migrations',      // Migrations directory
  database: 'mongodb',             // Database type
  connection: db,                  // Database connection
  tableName: 'migrations',         // Migration history table/collection
  logger: console,                 // Logger instance
  dryRun: false                    // Dry-run mode
});

await manager.initialize();        // Initialize manager
await manager.migrate('up', 0);    // Apply migrations (0 = all)
await manager.migrate('down', 1);  // Rollback migrations
await manager.status();            // Get migration status
await manager.create(name, desc);  // Create new migration
await manager.verify();            // Verify integrity
await manager.reset();             // Reset all migrations
```

## License

ISC
