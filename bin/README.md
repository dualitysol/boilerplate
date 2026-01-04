# Boilerplate Type Generation

Automatic TypeScript type generation for `@dualitysol/boilerplate`.

## 📝 What is Generated

- `types/Microservice.d.ts` - types for base Microservice class with CRUD methods
- `types/decorators.d.ts` - types for all decorators (Guards, GraphQL, etc.)

## 🚀 Usage

### Automatic Generation on Build

Types are automatically generated before each build:

```bash
npm run build
# Automatically calls prebuild -> generate:types -> build
```

### Manual Generation

```bash
npm run generate:types
```

### Watch Mode for Development

During development you can run a watcher that will automatically regenerate types when files change:

```bash
npm run dev:types
```

Now when any file in `src/` changes, types will be automatically updated! 🎉

## 🔧 How It Works

1. **prebuild hook** - runs automatically before `npm run build`
2. **generate-boilerplate-types.js** - generates types from source code
3. **watch-types.js** - watches for changes in `src/` and regenerates types

## 📦 What is Included in npm Package

```json
"files": [
  "dist",     // Compiled code
  "types",    // TypeScript types (generated)
  "bin",      // CLI scripts
  "src"       // Source code (for debugging)
]
```

## ✅ Benefits

- ✅ Types are always up-to-date
- ✅ No need to manually update `.d.ts` files
- ✅ Automatic synchronization with code
- ✅ Watch mode for development
- ✅ Generation before npm publication

## 🎯 For Boilerplate Developers

When adding new methods to `Microservice.js`:

1. Add method to `src/Microservice.js`
2. Update template in `bin/generate-boilerplate-types.js`
3. Run `npm run generate:types`
4. Check generated types in `types/Microservice.d.ts`

When adding new decorators to `src/decorators/index.ts`:

1. Add decorator to `src/decorators/index.ts`
2. Update template in `bin/generate-boilerplate-types.js`
3. Run `npm run generate:types`
4. Check generated types in `types/decorators.d.ts`

## 🔄 CI/CD

In CI/CD types will be generated automatically during build:

```yaml
# .github/workflows/publish.yml
- name: Build
  run: npm run build  # Automatically generates types
```
