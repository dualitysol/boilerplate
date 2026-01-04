#!/usr/bin/env node

/**
 * Migration script to convert old service structure to new unified structure
 * 
 * Usage:
 *   node bin/migrate-to-unified.js <path-to-service>
 * 
 * This script:
 * 1. Analyzes existing service structure
 * 2. Creates new folder structure (model/, resolvers/, typeDefinitions/, queryMutation/, tests/)
 * 3. Migrates code to appropriate locations
 * 4. Creates boilerplate.config.js if needed
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

const servicePath = process.argv[2];

if (!servicePath) {
  console.error(chalk.red('Error: Please provide a path to the service'));
  console.log(chalk.yellow('Usage: node bin/migrate-to-unified.js <path-to-service>'));
  process.exit(1);
}

async function migrateService() {
  console.log(chalk.cyan.bold(`\n🔄 Migrating service: ${servicePath}\n`));

  // Check if service exists
  if (!await fs.pathExists(servicePath)) {
    console.error(chalk.red(`Error: Service not found at ${servicePath}`));
    process.exit(1);
  }

  // Check if already migrated
  const modelPath = path.join(servicePath, 'model');
  if (await fs.pathExists(modelPath)) {
    console.log(chalk.yellow('⚠️  Service appears to already have the new structure'));
    const proceed = await askToProceed();
    if (!proceed) {
      console.log(chalk.gray('Migration cancelled'));
      process.exit(0);
    }
  }

  // Create backup
  const backupPath = `${servicePath}.backup-${Date.now()}`;
  console.log(chalk.gray(`Creating backup at ${backupPath}...`));
  await fs.copy(servicePath, backupPath);

  try {
    // Create new directory structure
    console.log(chalk.cyan('Creating new directory structure...'));
    await fs.ensureDir(path.join(servicePath, 'model'));
    await fs.ensureDir(path.join(servicePath, 'resolvers'));
    await fs.ensureDir(path.join(servicePath, 'queryMutation'));
    await fs.ensureDir(path.join(servicePath, 'typeDefinitions'));
    await fs.ensureDir(path.join(servicePath, 'tests'));

    // Analyze existing files
    const files = await fs.readdir(servicePath);
    
    for (const file of files) {
      const filePath = path.join(servicePath, file);
      const stat = await fs.stat(filePath);
      
      if (stat.isFile()) {
        await migrateFile(filePath, servicePath, file);
      }
    }

    console.log(chalk.green.bold('\n✅ Migration completed successfully!'));
    console.log(chalk.gray(`Backup saved at: ${backupPath}`));
    console.log(chalk.yellow('\n📝 Next steps:'));
    console.log(chalk.gray('  1. Review migrated files'));
    console.log(chalk.gray('  2. Update imports if necessary'));
    console.log(chalk.gray('  3. Run tests'));
    console.log(chalk.gray('  4. Delete backup if everything works\n'));

  } catch (error) {
    console.error(chalk.red('\n❌ Migration failed:'), error.message);
    console.log(chalk.yellow(`\nRestoring from backup: ${backupPath}`));
    await fs.remove(servicePath);
    await fs.copy(backupPath, servicePath);
    await fs.remove(backupPath);
    console.log(chalk.green('Service restored from backup'));
    process.exit(1);
  }
}

async function migrateFile(filePath, servicePath, filename) {
  console.log(chalk.gray(`  Processing ${filename}...`));

  // Skip directories and already migrated folders
  if (['model', 'resolvers', 'queryMutation', 'typeDefinitions', 'tests'].includes(filename)) {
    return;
  }

  // Read file content
  const content = await fs.readFile(filePath, 'utf-8');

  // Determine file type and destination
  if (filename.includes('service.js') || filename.includes('Service.js') || filename.includes('model')) {
    // Business logic → model/
    const ext = path.extname(filename);
    const newPath = path.join(servicePath, 'model', `index${ext}`);
    console.log(chalk.green(`    → Moving to model/index${ext}`));
    await fs.move(filePath, newPath, { overwrite: true });
  }
  else if (filename.includes('resolver')) {
    // Resolvers → resolvers/
    const ext = path.extname(filename);
    const newPath = path.join(servicePath, 'resolvers', `index${ext}`);
    console.log(chalk.green(`    → Moving to resolvers/index${ext}`));
    await fs.move(filePath, newPath, { overwrite: true });
  }
  else if (filename.includes('typeDef') || filename.includes('schema') || filename.endsWith('.gql') || filename.endsWith('.graphql')) {
    // GraphQL schemas → typeDefinitions/
    const ext = filename.endsWith('.gql') || filename.endsWith('.graphql') ? '.gql' : path.extname(filename);
    const newPath = path.join(servicePath, 'typeDefinitions', `index${ext}`);
    console.log(chalk.green(`    → Moving to typeDefinitions/index${ext}`));
    await fs.move(filePath, newPath, { overwrite: true });
  }
  else if (filename.includes('query') || filename.includes('mutation') || filename.includes('qm')) {
    // Query/Mutation helpers → queryMutation/
    const ext = path.extname(filename);
    const newPath = path.join(servicePath, 'queryMutation', `index${ext}`);
    console.log(chalk.green(`    → Moving to queryMutation/index${ext}`));
    await fs.move(filePath, newPath, { overwrite: true });
  }
  else if (filename.includes('test') || filename.includes('spec')) {
    // Tests → tests/
    const newPath = path.join(servicePath, 'tests', filename);
    console.log(chalk.green(`    → Moving to tests/${filename}`));
    await fs.move(filePath, newPath, { overwrite: true });
  }
  else if (filename === 'index.js' || filename === 'index.ts') {
    // Main index file - check content to determine destination
    if (content.includes('class') && content.includes('extends')) {
      // Looks like a service class → model/
      const ext = path.extname(filename);
      const newPath = path.join(servicePath, 'model', `index${ext}`);
      console.log(chalk.green(`    → Moving to model/index${ext}`));
      await fs.move(filePath, newPath, { overwrite: true });
    } else if (content.includes('resolver')) {
      // Resolvers
      const ext = path.extname(filename);
      const newPath = path.join(servicePath, 'resolvers', `index${ext}`);
      console.log(chalk.green(`    → Moving to resolvers/index${ext}`));
      await fs.move(filePath, newPath, { overwrite: true });
    }
  }
  else if (filename === 'README.md' || filename === 'package.json') {
    // Keep at root
    console.log(chalk.gray(`    → Keeping at root`));
  }
  else {
    console.log(chalk.yellow(`    → Skipping (unknown file type)`));
  }
}

async function askToProceed() {
  // Simple yes/no - in real implementation would use inquirer
  return true;
}

migrateService().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
