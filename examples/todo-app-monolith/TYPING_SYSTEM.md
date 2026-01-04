# TypeScript Typing System for JavaScript Projects

## Overview

This project uses an **automated typing system** that generates TypeScript definition files (`.d.ts`) from JSDoc comments and automatically imports them back into JavaScript files for IDE autocompletion and type checking.

## How It Works

```
┌─────────────────┐
│  JavaScript     │
│  with JSDoc     │
│  @param {Object}│
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  generate-types-from-jsdoc  │  Scan JSDoc → Generate .d.ts
└────────┬────────────────────┘
         │
         ▼
┌──────────────────────┐
│  types/ServiceName/  │
│  ├── dto/            │
│  ├── requests/       │
│  ├── responses/      │
│  ├── filters/        │
│  ├── entities/       │
│  └── internal/       │
└────────┬─────────────┘
         │
         ▼
┌─────────────────────────┐
│  import-types-to-jsdoc  │  Import .d.ts → Update JSDoc
└────────┬────────────────┘
         │
         ▼
┌──────────────────────────┐
│  JavaScript with imports │
│  @param {import(...)}    │
└──────────────────────────┘
```

## Directory Structure

```
examples/todo-app-monolith/
├── services/
│   ├── TodoService/
│   │   ├── entity/Todo.js
│   │   ├── model/index.js
│   │   ├── service/TodoService.js    # JSDoc here
│   │   └── resolvers/index.js        # JSDoc here
│   └── UserService/...
│
└── types/                             # Auto-generated
    ├── TodoService/
    │   ├── dto/                       # Generic DTOs (args, context, etc.)
    │   ├── requests/                  # Input types (CreateTodoInput, UpdateTodoInput)
    │   ├── responses/                 # Response types
    │   ├── filters/                   # Filter/query types
    │   ├── entities/                  # Entity types
    │   ├── internal/                  # Internal types (Dependencies, etc.)
    │   └── index.d.ts                 # Re-exports all types
    └── UserService/...
```

## Writing JSDoc for Type Generation

### ✅ Good: Nested Properties

```javascript
/**
 * Create a new todo
 * @param {Object} input - Todo creation data
 * @param {string} input.title - Todo title
 * @param {string} [input.description] - Todo description (optional)
 * @param {number} [input.priority] - Priority (1-5)
 * @param {string[]} [input.tags] - Tags array
 * @param {string} userId - User ID
 * @returns {Promise<Todo>}
 */
async createTodo(input, userId) { ... }
```

**Generates:**
```typescript
// types/TodoService/requests/createTodoInput.d.ts
export interface CreateTodoInput {
  /** Todo title */
  title: string;
  /** Todo description (optional) */
  description?: string;
  /** Priority (1-5) */
  priority?: number;
  /** Tags array */
  tags?: string[];
}
```

**Auto-imports as:**
```javascript
/**
 * Create a new todo
 * @param {import('../../types/TodoService/requests/createTodoInput.js').CreateTodoInput} input
 * @param {string} userId
 * @returns {Promise<Todo>}
 */
async createTodo(input, userId) { ... }
```

### ✅ Good: Optional Parameters

Use `[paramName]` for optional parameters:

```javascript
/**
 * @param {string} id
 * @param {Object} [options] - Optional configuration
 * @param {number} [options.limit] - Limit results
 * @param {string} [options.sortBy] - Sort field
 */
async getTodos(id, options) { ... }
```

### ✅ Good: Array Types

```javascript
/**
 * @param {string[]} ids - Array of todo IDs
 * @param {Object[]} items - Array of objects
 */
```

### ❌ Bad: Generic Object Without Properties

```javascript
/**
 * @param {Object} data - Some data  ❌ No properties defined
 */
```

**Better:**
```javascript
/**
 * @param {Object} data - User data
 * @param {string} data.name - User name
 * @param {string} data.email - User email
 */
```

### ❌ Bad: Using Any

```javascript
/**
 * @param {any} value  ❌ Defeats purpose of typing
 */
```

## NPM Scripts

### Generate Types from JSDoc

```bash
npm run types:generate
```

Scans all services and generates TypeScript `.d.ts` files from JSDoc comments.

### Import Types into JSDoc

```bash
npm run types:import
```

Updates JSDoc `@param {Object}` annotations with proper `@param {import(...).Type}` imports.

### Full Sync (Generate + Import)

```bash
npm run types:sync
```

Runs both generate and import in sequence.

### Watch Mode (Auto-Sync)

```bash
npm run types:watch
```

Watches for file changes and automatically syncs types:
- When `.js` files change → regenerates `.d.ts`
- When `.d.ts` files change → updates JSDoc imports

## Interface Naming Conventions

The generator automatically categorizes interfaces:

| Pattern | Category | Example |
|---------|----------|---------|
| `input` parameter | `requests/` | `CreateTodoInput`, `UpdateUserInput` |
| `filter`, `query` | `filters/` | `TodoFilter`, `UserQuery` |
| `response`, `result` | `responses/` | `TodoResponse`, `UserResult` |
| `dependencies` | `internal/` | `Dependencies` |
| `args`, `context`, `parent` | `dto/` | `Args`, `Context` |
| Method name prefix | Uses method name | `createTodoInput` (from `createTodo` method) |

## Type Inference

### From Method Names

```javascript
/**
 * @param {Object} input  → Becomes CreateTodoInput
 */
async createTodo(input) { ... }

/**
 * @param {Object} input  → Becomes UpdateUserInput
 */
async updateUser(input) { ... }
```

### From Parameter Names

```javascript
/**
 * @param {Object} filter  → Becomes Filter (in filters/)
 * @param {Object} options → Becomes Options (in dto/)
 * @param {Object} data    → Becomes Data (in dto/)
 */
```

## IDE Integration

### VSCode

Types are automatically recognized by VSCode's IntelliSense:

1. **Autocompletion**: Type `input.` and see all properties
2. **Type Checking**: Hover over parameters to see full type
3. **Go to Definition**: Ctrl+Click on type to jump to `.d.ts`
4. **Error Detection**: See type mismatches in real-time

### Configuration

No additional configuration needed! The `import(...)` syntax is natively supported by:
- VSCode
- TypeScript Language Server
- ESLint with TypeScript plugin

## Best Practices

### 1. Always Document Object Parameters

```javascript
// ❌ Bad
/**
 * @param {Object} input
 */

// ✅ Good
/**
 * @param {Object} input - Todo creation data
 * @param {string} input.title - Todo title
 * @param {string} [input.description] - Optional description
 */
```

### 2. Use Meaningful Descriptions

```javascript
// ❌ Bad
/**
 * @param {string} input.title - Title
 */

// ✅ Good
/**
 * @param {string} input.title - Todo title (max 100 chars)
 */
```

### 3. Mark Optional Parameters

```javascript
// ❌ Bad
/**
 * @param {string} input.description
 */

// ✅ Good
/**
 * @param {string} [input.description] - Optional description
 */
```

### 4. Specify Array Element Types

```javascript
// ❌ Bad
/**
 * @param {Array} tags
 */

// ✅ Good
/**
 * @param {string[]} tags - Array of tag names
 */
```

### 5. Use TypeScript Utility Types

```javascript
/**
 * @param {Partial<Todo>} updates - Partial todo updates
 * @param {Pick<User, 'id' | 'name'>} user - User subset
 * @param {Omit<Todo, 'id'>} data - Todo without ID
 */
```

## Manual Type Definitions

You can manually create or enhance types in the `types/` directory:

```typescript
// types/TodoService/requests/updateTodoInput.d.ts
export interface UpdateTodoInput {
  title?: string;
  description?: string;
  completed?: boolean;
  priority?: number;
  tags?: string[];
}
```

Then import it manually in JSDoc:

```javascript
/**
 * @param {import('../../types/TodoService/requests/updateTodoInput.js').UpdateTodoInput} input
 */
async updateTodo(id, input) { ... }
```

## Troubleshooting

### Types Not Showing in IDE

1. **Restart TypeScript Server**: Cmd+Shift+P → "TypeScript: Restart TS Server"
2. **Check Import Path**: Ensure relative path is correct
3. **Regenerate Types**: Run `npm run types:sync`

### Duplicate Interfaces

The generator deduplicates interfaces by name. If you see duplicates:

1. Check `types/ServiceName/index.d.ts`
2. Remove duplicates manually
3. Run `npm run types:generate` to regenerate

### Wrong Interface Category

Override category by renaming the parameter:

```javascript
// Will go to filters/
/**
 * @param {Object} todoFilter
 */

// Will go to requests/
/**
 * @param {Object} createInput
 */
```

## Advanced Usage

### Generic Types

```javascript
/**
 * @template T
 * @param {Object} input
 * @returns {Promise<T extends Todo>}
 */
async createTodo(input) { ... }
```

### Union Types

```javascript
/**
 * @param {Object} input
 * @param {'pending'|'completed'|'archived'} input.status - Todo status
 */
```

### Complex Types

```javascript
/**
 * @param {Object} input
 * @param {Object} input.metadata - Additional metadata
 * @param {string} input.metadata.source - Data source
 * @param {number} input.metadata.version - Schema version
 */
```

## Integration with Existing Tools

### With ESLint

Add to `.eslintrc.js`:

```javascript
module.exports = {
  plugins: ['jsdoc'],
  rules: {
    'jsdoc/check-types': 'warn',
    'jsdoc/require-param-description': 'warn',
    'jsdoc/require-param-type': 'error'
  }
};
```

### With Prettier

Types in JSDoc are automatically formatted by Prettier.

### With TypeScript

Use `checkJs: true` in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "noEmit": true
  },
  "include": ["services/**/*.js"]
}
```

## Migration Guide

### From Plain JSDoc

1. **Add nested properties** to all `{Object}` parameters
2. **Run** `npm run types:generate`
3. **Run** `npm run types:import`
4. **Verify** types in IDE

### From TypeScript

1. **Convert** `.ts` files to `.js`
2. **Keep** interface definitions in `types/`
3. **Add** JSDoc with imports
4. **Remove** `tsconfig.json` or set `noEmit: true`

## Examples

See the following files for complete examples:
- `services/TodoService/service/TodoService.js` - Full service with types
- `services/UserService/service/UserService.js` - Authentication service
- `types/TodoService/` - Generated type definitions

## Summary

✅ **Automatic**: Types generated from JSDoc  
✅ **Bidirectional**: JSDoc ↔ TypeScript sync  
✅ **IDE Support**: Full IntelliSense in VSCode  
✅ **Type Safe**: Catch errors during development  
✅ **No Build Step**: Works with pure JavaScript  
✅ **Maintainable**: Types live next to code  

---

**Happy Typing! 🎉**
