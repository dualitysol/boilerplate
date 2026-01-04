# Contributing to @dualitysol/boilerplate

Thank you for your interest in contributing to @dualitysol/boilerplate! We welcome contributions from the community.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)
- [Testing](#testing)

## 🤝 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## 🚀 Getting Started

### Prerequisites

- Node.js >= 22.0.0
- npm >= 9.0.0
- Git

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/boilerplate.git
cd boilerplate
```

3. Add upstream remote:

```bash
git remote add upstream https://github.com/dualitysol/boilerplate.git
```

### Install Dependencies

```bash
npm install
```

### Build the Project

```bash
npm run build
```

## 💻 Development Workflow

### Create a Branch

Always create a new branch for your work:

```bash
git checkout -b feat/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

Branch naming conventions:
- `feat/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks

### Make Changes

1. Make your changes in the codebase
2. Generate types if needed:
```bash
npm run generate:types
```

3. Build the project:
```bash
npm run build
```

4. Test your changes:
```bash
npm test
```

### Sync with Upstream

Keep your fork up to date:

```bash
git fetch upstream
git rebase upstream/master
```

## 📝 Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages. This enables automatic versioning and changelog generation.

### Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- **feat**: A new feature (triggers MINOR version bump)
- **fix**: A bug fix (triggers PATCH version bump)
- **docs**: Documentation only changes
- **style**: Code style changes (formatting, missing semi colons, etc)
- **refactor**: Code refactoring without changing functionality
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **build**: Changes to build system or dependencies
- **ci**: Changes to CI/CD configuration
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

### Breaking Changes

To trigger a MAJOR version bump, include `BREAKING CHANGE:` in the commit footer:

```
feat: change API signature

BREAKING CHANGE: The `createServer` method now requires a config object instead of individual parameters.
```

Or use `!` after the type:

```
feat!: change API signature
```

### Examples

**Feature:**
```
feat(decorators): add @RequirePermission decorator

Add new decorator for permission-based authorization
```

**Bug Fix:**
```
fix(microservice): resolve memory leak in event subscriptions

Fixed memory leak caused by not properly unsubscribing from events
```

**Documentation:**
```
docs(readme): update installation instructions

Added section about global vs local installation
```

**Breaking Change:**
```
feat(context)!: restructure context builder

BREAKING CHANGE: Context.user is now Context.auth.user
```

### Commitlint

We use commitlint to enforce commit conventions. The commit hook will automatically validate your commit messages.

If you need to bypass the hook temporarily (not recommended):
```bash
git commit --no-verify -m "your message"
```

## 🔄 Pull Request Process

### Before Submitting

1. ✅ Ensure your code builds without errors
2. ✅ All tests pass
3. ✅ Your commits follow the commit convention
4. ✅ Update documentation if needed
5. ✅ Update types if you modified APIs

### Submit PR

1. Push your branch to your fork:
```bash
git push origin feat/your-feature-name
```

2. Open a Pull Request on GitHub

3. Fill in the PR template with:
   - Description of changes
   - Related issues (if any)
   - Breaking changes (if any)
   - Screenshots (if applicable)

### PR Title

PR titles should also follow the commit convention:

```
feat: add new Guards decorators
fix: resolve build issue on Windows
docs: improve README examples
```

### Review Process

1. Maintainers will review your PR
2. Address any requested changes
3. Once approved, a maintainer will merge your PR
4. Semantic-release will automatically:
   - Determine the version bump
   - Generate changelog
   - Publish to NPM
   - Create GitHub release

## 📁 Project Structure

```
boilerplate/
├── src/                    # Source code
│   ├── Bootstrap.js        # Bootstrap class
│   ├── Microservice.js     # Base Microservice class
│   ├── Server.js           # Server implementation
│   ├── decorators/         # Decorators
│   ├── graphql/            # GraphQL utilities
│   ├── storage/            # Database abstractions
│   └── transport/          # Transport implementations
├── types/                  # TypeScript definitions
├── bin/                    # CLI scripts
├── examples/               # Usage examples
└── dist/                   # Compiled output
```

### Key Files

- `src/Microservice.js` - Base class for all microservices
- `src/decorators/index.ts` - Guards and other decorators
- `src/graphql/contextBuilder.js` - GraphQL context builder
- `types/` - Auto-generated TypeScript definitions

## 🧪 Testing

### Run Tests

```bash
npm test
```

### Add Tests

When adding new features, please include tests:

```javascript
// tests/unit/decorators.spec.js
describe('RequireAuth decorator', () => {
  it('should throw error when user is not authenticated', async () => {
    // Test implementation
  })
})
```

## 📋 Code Style

- Use ES6+ features
- Follow existing code style
- Use meaningful variable names
- Add JSDoc comments for public APIs
- Keep functions small and focused

### Example:

```javascript
/**
 * Find a single document in the collection
 * @param {Object} filter - MongoDB filter query
 * @param {Object} options - Query options
 * @returns {Promise<Object|null>} Found document or null
 */
async findOne(filter, options = {}) {
  const collection = await this.getCollection()
  return collection.findOne(filter, options)
}
```

## 🐛 Reporting Bugs

- Use GitHub Issues
- Search existing issues first
- Include reproduction steps
- Provide error messages and stack traces
- Specify your environment (Node version, OS, etc.)

## 💡 Feature Requests

- Use GitHub Issues with "enhancement" label
- Describe the use case
- Explain why this feature would be useful
- Consider submitting a PR!

## 📜 License

By contributing, you agree that your contributions will be licensed under the ISC License.

## 🙏 Thank You!

Your contributions make this project better for everyone. Thank you for taking the time to contribute!

---

**Questions?** Open an issue or reach out to the maintainers.
