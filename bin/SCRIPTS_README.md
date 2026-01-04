# Boilerplate Scripts Directory

This directory contains utility scripts for code generation, type management, and service scaffolding.

## 📋 Type Generation Scripts (New!)

### generate-types-from-jsdoc.js ⭐ NEW

Scans JavaScript files for JSDoc comments and automatically generates TypeScript definition files.

**Usage:**
```bash
node bin/generate-types-from-jsdoc.js <servicePath>
node bin/generate-types-from-jsdoc.js examples/todo-app-monolith/services/TodoService
```

**Features:**
- ✅ Parses JSDoc `@param {Object}` with nested properties
- ✅ Generates clean `.d.ts` interface files
- ✅ Organizes types into categories (dto, requests, responses, filters, internal)
- ✅ Handles optional parameters `[param]`
- ✅ Creates index.d.ts with re-exports
- ✅ Smart interface naming based on context

**Output:**
```
types/ServiceName/
├── dto/              # Generic DTOs (args, context)
├── requests/         # Input types (CreateInput, UpdateInput)
├── responses/        # Response types
├── filters/          # Filter/query types
├── entities/         # Entity types  
├── internal/         # Internal types (Dependencies)
└── index.d.ts        # Re-exports all types
```

### import-types-to-jsdoc.js ⭐ NEW

Updates JavaScript files by importing generated TypeScript types into JSDoc annotations.

**Usage:**
```bash
node bin/import-types-to-jsdoc.js <servicePath>
node bin/import-types-to-jsdoc.js examples/todo-app-monolith/services/TodoService
```

**Features:**
- ✅ Finds all `@param {Object}` annotations
- ✅ Replaces with `@param {import('path').Type}`
- ✅ Skips nested properties (only parent objects)
- ✅ Uses relative paths
- ✅ Deduplicates replacements

**Example:**
```javascript
// Before
/**
 * @param {Object} input - Todo data
 * @param {string} input.title
 */

// After
/**
 * @param {import('../../types/TodoService/requests/createTodoInput.js').CreateTodoInput} input
 */
```

### watch-types-sync.js ⭐ NEW

Watches for file changes and automatically keeps JSDoc and TypeScript types in sync.

**Usage:**
```bash
node bin/watch-types-sync.js                    # Watch all services
node bin/watch-types-sync.js --service=TodoService  # Watch specific service
```

**Features:**
- ✅ Watches `.js` files → regenerates `.d.ts`
- ✅ Watches `.d.ts` files → updates JSDoc
- ✅ Debounced processing (1 second)
- ✅ Initial sync on startup
- ✅ Parallel processing

## 🏗️ Service Generation Scripts

### generate-service.js

Generates complete service structure with proper architecture layers.

**Usage:**
```bash
node bin/generate-service.js <ServiceName> <EntityName>
node bin/generate-service.js TodoService Todo
```

**Generates:**
- `service/TodoService.js` - Business logic layer
- `resolvers/index.js` - Thin GraphQL resolvers
- Proper imports and JSDoc
- CRUD template methods

## 🔧 Core Boilerplate Scripts

### generate-boilerplate-types.js

Generates TypeScript types for the core boilerplate framework.

**Usage:**
```bash
npm run generate:types
```

**Generates:**
- `types/Microservice.d.ts` - Microservice class types
- `types/decorators.d.ts` - Decorator types

### watch-types.js

Watches boilerplate source files and regenerates core types.

**Usage:**
```bash
npm run dev:types
```

## 📖 Common Workflows

### 1. Create New Service with Types

```bash
# Step 1: Generate service structure
node bin/generate-service.js ProductService Product

# Step 2: Write business logic with JSDoc

# Step 3: Generate TypeScript types
node bin/generate-types-from-jsdoc.js services/ProductService

# Step 4: Import types into JSDoc  
node bin/import-types-to-jsdoc.js services/ProductService
```

### 2. Development with Auto-Sync

```bash
# From project root
node bin/watch-types-sync.js

# Or from example directory
cd examples/todo-app-monolith
npm run types:watch
```

### 3. Manual Type Sync

```bash
# In example directory
npm run types:generate   # Generate .d.ts from JSDoc
npm run types:import     # Import types into JSDoc
npm run types:sync       # Both generate + import
```

## 📚 Documentation

- **[TYPING_SYSTEM.md](../examples/todo-app-monolith/TYPING_SYSTEM.md)** - Complete guide to the typing system
- **[ARCHITECTURE.md](../ARCHITECTURE.md)** - Boilerplate architecture overview
- **[EXAMPLES_UPDATE_SUMMARY.md](../examples/EXAMPLES_UPDATE_SUMMARY.md)** - Examples refactoring summary

## 💡 Tips

1. **Document JSDoc first** - Write detailed `@param` with nested properties
2. **Use watch mode** - Let types auto-sync during development
3. **Check generated types** - Review `.d.ts` files for correctness
4. **Manual enhancement** - You can manually edit `.d.ts` files if needed

## 🎯 Type Generation Best Practices

### ✅ Good JSDoc

```javascript
/**
 * Create a new todo
 * @param {Object} input - Todo creation data
 * @param {string} input.title - Todo title
 * @param {string} [input.description] - Optional description
 * @param {number} [input.priority] - Priority (1-5)
 * @param {string} userId - User ID
 * @returns {Promise<Todo>}
 */
async createTodo(input, userId) { ... }
```

Generates:

```typescript
export interface CreateTodoInput {
  /** Todo title */
  title: string;
  /** Optional description */
  description?: string;
  /** Priority (1-5) */
  priority?: number;
}
```

### ❌ Bad JSDoc

```javascript
/**
 * @param {Object} input  ❌ No nested properties
 * @param {any} data      ❌ Using 'any'
 */
```

## 🔄 Integration

### With npm scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "types:generate": "node ../../bin/generate-types-from-jsdoc.js services/MyService",
    "types:import": "node ../../bin/import-types-to-jsdoc.js services/MyService",
    "types:sync": "npm run types:generate && npm run types:import",
    "types:watch": "node ../../bin/watch-types-sync.js"
  }
}
```

### With VSCode

Types work automatically in VSCode with IntelliSense:
- Autocompletion on `input.`
- Type checking on hover
- Go to definition (Ctrl+Click)
- Real-time error detection

### With TypeScript

Enable in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "noEmit": true
  }
}
```

## 🚀 Quick Start

```bash
# Generate types for all TodoService files
node bin/generate-types-from-jsdoc.js examples/todo-app-monolith/services/TodoService

# Import types into JSDoc
node bin/import-types-to-jsdoc.js examples/todo-app-monolith/services/TodoService

# Watch for changes
node bin/watch-types-sync.js
```

---

**Happy Coding with Types! 🎉**
