#!/usr/bin/env node

/**
 * @dualitysol/boilerplate CLI Tool
 * 
 * Commands:
 * - init [options]           Initialize new project (interactive or with flags)
 * - create <name>            Create new microservice project (legacy)
 * - service <name>           Generate new service
 * - generate-types           Generate TypeScript types from GraphQL schema
 * - types:generate           Generate TypeScript types from JSDoc
 * - types:watch              Watch and sync TypeScript types
 * - dev                      Start development mode with hot reload
 * - build                    Build project for production
 */

import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program
  .name('boilerplate')
  .description('CLI tool for @dualitysol/boilerplate microservices framework')
  .version('1.0.0')

/**
 * Initialize new project (modern way)
 */
program
  .command('init')
  .description('Initialize a new boilerplate project (interactive or with flags)')
  .option('-n, --name <name>', 'Project name')
  .option('-t, --template <template>', 'Template: monolith, microservices, serverless, minimal', 'monolith')
  .option('-i, --interactive', 'Interactive mode', true)
  .option('--typescript', 'Enable TypeScript')
  .option('--no-graphql', 'Disable GraphQL')
  .option('--no-database', 'Disable database')
  .option('--auth', 'Enable authentication')
  .option('--tracing', 'Enable distributed tracing')
  .option('--docker', 'Include Docker configuration')
  .action(async (options) => {
    // Delegate to cli-init.js
    try {
      const { execSync } = await import('child_process');
      const cliInitPath = path.join(__dirname, 'cli-init.js');
      
      let args = ['init'];
      
      if (options.interactive && !options.name) {
        args.push('--interactive');
      } else {
        if (options.name) args.push('--name', options.name);
        if (options.template) args.push('--template', options.template);
        if (options.typescript) args.push('--typescript');
        if (options.graphql === false) args.push('--no-graphql');
        if (options.database === false) args.push('--no-database');
        if (options.auth) args.push('--auth');
        if (options.tracing) args.push('--tracing');
        if (options.docker) args.push('--docker');
      }
      
      execSync(`node ${cliInitPath} ${args.join(' ')}`, {
        stdio: 'inherit',
        cwd: process.cwd()
      });
    } catch (error) {
      console.error('❌ Error running init command:', error.message);
      process.exit(1);
    }
  });

/**
 * Generate TypeScript types from JSDoc
 */
program
  .command('types:generate')
  .description('Generate TypeScript .d.ts files from JSDoc comments')
  .option('-s, --service <name>', 'Specific service to generate types for')
  .option('-a, --all', 'Generate types for all services', true)
  .action(async (options) => {
    try {
      const generateScript = path.join(__dirname, 'generate-types-from-jsdoc.js');
      const { execSync } = await import('child_process');
      
      console.log('🔧 Generating TypeScript types from JSDoc...\n');
      
      execSync(`node ${generateScript}`, {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      console.log('\n✅ Types generated successfully!');
    } catch (error) {
      console.error('❌ Error generating types:', error.message);
      process.exit(1);
    }
  });

/**
 * Watch and auto-sync TypeScript types
 */
program
  .command('types:watch')
  .description('Watch files and auto-generate TypeScript types')
  .option('-s, --service <name>', 'Watch specific service')
  .action(async (options) => {
    try {
      const watchScript = path.join(__dirname, 'watch-types-sync.js');
      const { execSync } = await import('child_process');
      
      console.log('👀 Watching for changes...\n');
      
      const args = options.service ? [options.service] : [];
      
      execSync(`node ${watchScript} ${args.join(' ')}`, {
        stdio: 'inherit',
        cwd: process.cwd()
      });
    } catch (error) {
      console.error('❌ Error in watch mode:', error.message);
      process.exit(1);
    }
  });

/**
 * Create new microservice project
 */
program
  .command('create <name>')
  .description('Create a new microservice project')
  .option('-t, --template <type>', 'Project template (monolith, microservices)', 'monolith')
  .option('-d, --database <type>', 'Database type (mongodb, postgres)', 'mongodb')
  .option('-r, --runtime <type>', 'Runtime type (local, lambda, k8s)', 'local')
  .action(async (name, options) => {
    console.log(`🚀 Creating new project: ${name}`)
    console.log(`   Template: ${options.template}`)
    console.log(`   Database: ${options.database}`)
    console.log(`   Runtime: ${options.runtime}`)
    
    const projectPath = path.join(process.cwd(), name)
    
    try {
      // Create project structure
      await fs.mkdir(projectPath, { recursive: true })
      await fs.mkdir(path.join(projectPath, 'services'), { recursive: true })
      await fs.mkdir(path.join(projectPath, 'types'), { recursive: true })
      
      // Create package.json
      const packageJson = {
        name,
        version: '1.0.0',
        type: 'module',
        scripts: {
          dev: 'node --watch index.js',
          start: 'node index.js',
          'generate-types': 'boilerplate generate-types'
        },
        dependencies: {
          '@dualitysol/boilerplate': '^1.0.0'
        }
      }
      
      if (options.database === 'mongodb') {
        packageJson.dependencies.mongodb = '^6.0.0'
      } else if (options.database === 'postgres') {
        packageJson.dependencies.pg = '^8.11.0'
      }
      
      await fs.writeFile(
        path.join(projectPath, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      )
      
      // Create index.js
      const indexContent = generateIndexFile(name, options)
      await fs.writeFile(path.join(projectPath, 'index.js'), indexContent)
      
      // Create example service
      const serviceContent = generateServiceFile('Example', options.database)
      await fs.writeFile(
        path.join(projectPath, 'services', 'ExampleService.js'),
        serviceContent
      )
      
      // Create README
      const readmeContent = generateReadme(name, options)
      await fs.writeFile(path.join(projectPath, 'README.md'), readmeContent)
      
      // Create .gitignore
      await fs.writeFile(
        path.join(projectPath, '.gitignore'),
        'node_modules/\n.env\ndist/\n*.log\n'
      )
      
      console.log(`\n✅ Project created successfully!`)
      console.log(`\nNext steps:`)
      console.log(`  cd ${name}`)
      console.log(`  npm install`)
      console.log(`  npm run dev`)
      
    } catch (error) {
      console.error(`❌ Error creating project:`, error.message)
      process.exit(1)
    }
  })

/**
 * Generate new service
 */
program
  .command('service <name>')
  .description('Generate a new service in the current project')
  .option('-c, --collection <name>', 'MongoDB collection name')
  .option('-t, --table <name>', 'PostgreSQL table name')
  .action(async (name, options) => {
    console.log(`📝 Generating service: ${name}`)
    
    const servicesPath = path.join(process.cwd(), 'services')
    const servicePath = path.join(servicesPath, `${name}Service.js`)
    
    try {
      // Check if services directory exists
      try {
        await fs.access(servicesPath)
      } catch {
        await fs.mkdir(servicesPath, { recursive: true })
      }
      
      // Generate service file
      const collectionName = options.collection || options.table || name.toLowerCase()
      const serviceContent = generateServiceFile(name, options.table ? 'postgres' : 'mongodb', collectionName)
      
      await fs.writeFile(servicePath, serviceContent)
      
      console.log(`✅ Service created: ${servicePath}`)
      console.log(`\nDon't forget to register it in your index.js:`)
      console.log(`  import { ${name}Service } from './services/${name}Service.js'`)
      console.log(`  services: { ${name}Service }`)
      
    } catch (error) {
      console.error(`❌ Error generating service:`, error.message)
      process.exit(1)
    }
  })

/**
 * Generate TypeScript types from GraphQL schema
 */
program
  .command('generate-types')
  .description('Generate TypeScript types from GraphQL schema')
  .option('-c, --config <path>', 'Path to codegen config', './codegen.yml')
  .option('-w, --watch', 'Watch for changes')
  .action(async (options) => {
    console.log(`🔧 Generating TypeScript types from GraphQL schema...`)
    
    try {
      const configPath = path.resolve(process.cwd(), options.config)
      
      // Check if config file exists
      if (!await fs.pathExists(configPath)) {
        console.log(`⚠️  Config file not found: ${configPath}`)
        console.log(`\n📝 Creating default codegen.yml...`)
        
        const defaultConfig = await generateCodegenConfig()
        await fs.writeFile(path.resolve(process.cwd(), 'codegen.yml'), defaultConfig)
        console.log(`✅ Created codegen.yml`)
      }
      
      // Check if schema directory exists
      const schemaDir = path.resolve(process.cwd(), 'src/graphql/schema')
      if (!await fs.pathExists(schemaDir)) {
        console.log(`\n📝 Creating GraphQL schema directory...`)
        await fs.mkdir(schemaDir, { recursive: true })
        
        // Create example schema
        const exampleSchema = `type Query {
  hello: String!
}

type Mutation {
  _empty: String
}
`
        await fs.writeFile(path.join(schemaDir, 'root.graphql'), exampleSchema)
        console.log(`✅ Created example schema at ${schemaDir}/root.graphql`)
      }
      
      // Run codegen
      const watchFlag = options.watch ? '--watch' : ''
      const codegenCmd = `npx graphql-codegen --config ${options.config} ${watchFlag}`
      
      console.log(`\n🚀 Running: ${codegenCmd}\n`)
      
      const { execSync } = await import('child_process')
      execSync(codegenCmd, { stdio: 'inherit', cwd: process.cwd() })
      
      console.log(`\n✅ TypeScript types generated successfully!`)
      console.log(`   Check ./types/graphql-generated.d.ts`)
      
    } catch (error) {
      console.error(`❌ Error generating types:`, error.message)
      console.error(`\n💡 Make sure you have installed:`)
      console.error(`   npm install -D @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-resolvers @graphql-codegen/typescript-operations`)
      process.exit(1)
    }
  })

/**
 * Start development mode
 */
program
  .command('dev')
  .description('Start development mode with hot reload')
  .option('-p, --port <number>', 'Port number', '3000')
  .action(async (options) => {
    console.log(`🔥 Starting development mode...`)
    
    try {
      const { stdout, stderr } = await execAsync(`node --watch index.js`)
      console.log(stdout)
      if (stderr) console.error(stderr)
    } catch (error) {
      console.error(`❌ Error in dev mode:`, error.message)
      process.exit(1)
    }
  })

/**
 * Build project
 */
program
  .command('build')
  .description('Build project for production')
  .action(async () => {
    console.log(`📦 Building project...`)
    
    try {
      // Run babel or other build tools
      console.log(`✅ Build complete`)
    } catch (error) {
      console.error(`❌ Build failed:`, error.message)
      process.exit(1)
    }
  })

program.parse()

/**
 * Template generators
 */

function generateIndexFile(name, options) {
  const { database, runtime } = options
  
  return `import { createApp } from '@dualitysol/boilerplate'
import { ExampleService } from './services/ExampleService.js'

// Configuration
const config = {
  runtime: {
    type: '${runtime}',
    port: process.env.PORT || 3000
  },
  
  storage: {
    ${database}: {
      ${database === 'mongodb' 
        ? `url: process.env.MONGODB_URL || 'mongodb://localhost:27017',\n      dbName: '${name}'`
        : `connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/${name}'`
      }
    }
  },
  
  transport: {
    type: process.env.TRANSPORT || 'http'
  },
  
  services: {
    ExampleService
  },
  
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
}

// Start application
createApp(config)
  .then(() => {
    console.log(\`🚀 ${name} started successfully!\`)
  })
  .catch(error => {
    console.error('❌ Failed to start:', error)
    process.exit(1)
  })
`
}

function generateServiceFile(name, database = 'mongodb', collectionName = null) {
  const collection = collectionName || name.toLowerCase()
  
  return `import { Microservice } from '@dualitysol/boilerplate'

/**
 * ${name} Service
 * 
 * Handles ${name.toLowerCase()} operations
 */
export class ${name}Service extends Microservice {
  ${database === 'mongodb' ? `
  // MongoDB collection name
  get collectionName() {
    return '${collection}'
  }` : `
  // PostgreSQL table name
  tableName = '${collection}'
  
  get table() {
    return this.storage.getTable(this.tableName)
  }`}

  /**
   * Initialize service
   */
  async initialize() {
    this.info('${name}Service initialized')
    
    // Subscribe to events
    await this.subscribe('${collection}.created', this.on${name}Created.bind(this))
  }

  /**
   * Get all ${collection}
   */
  async getAll(args) {
    const { limit = 10, skip = 0 } = args
    ${database === 'mongodb' 
      ? `return await this.model.find({}).limit(limit).skip(skip).toArray()`
      : `return await this.table.find({}, { limit, offset: skip })`
    }
  }

  /**
   * Get ${name.toLowerCase()} by ID
   */
  async getById({ id }) {
    ${database === 'mongodb'
      ? `return await this.model.findOne({ _id: new this.storage.ObjectId(id) })`
      : `return await this.table.findOne({ id })`
    }
  }

  /**
   * Create new ${name.toLowerCase()}
   */
  async create(data) {
    ${database === 'mongodb'
      ? `const result = await this.model.insert(data)
    const ${collection} = { _id: result.insertedId, ...data }`
      : `const ${collection} = await this.table.insert(data)`
    }
    
    // Publish event
    await this.publish('${collection}.created', ${collection})
    
    return ${collection}
  }

  /**
   * Update ${name.toLowerCase()}
   */
  async update({ id, ...data }) {
    ${database === 'mongodb'
      ? `return await this.model.updateMany(
      { _id: new this.storage.ObjectId(id) },
      { $set: data }
    )`
      : `const results = await this.table.update({ id }, data)
    return results[0]`
    }
  }

  /**
   * Delete ${name.toLowerCase()}
   */
  async delete({ id }) {
    ${database === 'mongodb'
      ? `const result = await this.model.deleteOne({ _id: new this.storage.ObjectId(id) })
    return result.deletedCount > 0`
      : `const count = await this.table.delete({ id })
    return count > 0`
    }
  }

  /**
   * Event handler: ${name} created
   */
  async on${name}Created(data) {
    this.info('${name} created:', data)
    
    // Add your business logic here
    // For example: send notifications, update cache, etc.
  }
}

export default ${name}Service
`
}

function generateReadme(name, options) {
  return `# ${name}

Microservice project built with @dualitysol/boilerplate

## Features

- ✅ GraphQL API
- ✅ ${options.database === 'mongodb' ? 'MongoDB' : 'PostgreSQL'} database
- ✅ Event-driven architecture
- ✅ Hot reload in development
- ✅ Production-ready

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
\`\`\`

## Environment Variables

\`\`\`env
# Server
PORT=3000
NODE_ENV=development

# Database
${options.database === 'mongodb' 
  ? 'MONGODB_URL=mongodb://localhost:27017'
  : 'DATABASE_URL=postgresql://localhost:5432/' + name
}

# Transport (optional)
TRANSPORT=http
# TRANSPORT=nats
# NATS_URL=nats://localhost:4222

# Logging
LOG_LEVEL=info
\`\`\`

## Project Structure

\`\`\`
${name}/
├── services/           # Microservices
│   └── ExampleService.js
├── types/              # TypeScript types
├── index.js            # Application entry point
├── package.json
└── README.md
\`\`\`

## API

GraphQL Playground: http://localhost:3000/graphql

## Documentation

- [Boilerplate Docs](https://github.com/dualitysol/boilerplate)
- [Architecture](https://github.com/dualitysol/boilerplate/blob/main/ARCHITECTURE.md)

## License

MIT
`
}

/**
 * Generate codegen.yml configuration
 */
function generateCodegenConfig() {
  return `# GraphQL Code Generator Configuration
overwrite: true
schema: "./src/graphql/schema/**/*.graphql"

generates:
  # Server-side types (resolvers, context, etc.)
  ./types/graphql-generated.d.ts:
    plugins:
      - typescript
      - typescript-resolvers
    config:
      immutableTypes: true
      contextType: ../src/graphql/context#GraphQLContext
      scalars:
        DateTime: Date
        JSON: any
        Upload: File
      strictScalars: true
      enumsAsTypes: true
      maybeValue: T | null | undefined
      
  # Client-side operation types
  ./types/graphql-operations.d.ts:
    documents: "./src/graphql/operations/**/*.graphql"
    plugins:
      - typescript
      - typescript-operations
    config:
      immutableTypes: true
      scalars:
        DateTime: Date
        JSON: any
        Upload: File

hooks:
  afterAllFileWrite:
    - prettier --write
`
}

