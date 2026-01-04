# 🚀 Release Preparation Checklist

Everything is prepared for publishing packages to GitHub and NPM!

## ✅ Completed Tasks

### 1. ✅ Documentation
- [x] **README.md for boilerplate** - Full documentation with examples, features, architecture
- [x] **README.md for boilerplate-cli** - Documentation of all CLI commands with examples
- [x] **CONTRIBUTING.md** - Contributor guides with commit rules
- [x] **CHANGELOG.md** - Initial templates for auto-generation

### 2. ✅ CI/CD Pipeline
- [x] **GitHub Actions for boilerplate** - `.github/workflows/release.yml` and `test.yml`
- [x] **GitHub Actions for boilerplate-cli** - Similar workflows
- [x] **semantic-release** - Configured for automatic versioning
- [x] **Conventional Commits** - commitlint and husky configured

### 3. ✅ Configuration
- [x] **.releaserc.json** - semantic-release configuration
- [x] **commitlint.config.js** - Rules for commit messages
- [x] **package.json** - Updated metadata (keywords, repository, bugs, homepage)

## 📋 What Happens on Commit

### Conventional Commits Format

```bash
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types and Versioning

| Commit Type | Version | Example |
|------------|--------|--------|
| `feat:` | MINOR (1.0.0 → 1.1.0) | `feat: add new Guards decorator` |
| `fix:` | PATCH (1.0.0 → 1.0.1) | `fix: resolve memory leak` |
| `BREAKING CHANGE:` | MAJOR (1.0.0 → 2.0.0) | `feat!: change API signature` |
| `docs:`, `style:`, etc. | PATCH | `docs: update README` |

### Commit Examples

**Feature (Minor):**
```bash
git commit -m "feat(decorators): add @RequirePermission decorator

Add new decorator for permission-based authorization"
```

**Bug Fix (Patch):**
```bash
git commit -m "fix(microservice): resolve memory leak in event subscriptions"
```

**Breaking Change (Major):**
```bash
git commit -m "feat(context)!: restructure context builder

BREAKING CHANGE: Context.user is now Context.auth.user"
```

## 🔄 Workflow on Push to Master

1. **GitHub Actions Starts**
   ```
   ✓ Checkout code
   ✓ Setup Node.js 22
   ✓ Install dependencies
   ✓ Run linter (if present)
   ✓ Generate types
   ✓ Build project
   ✓ Run tests (if present)
   ```

2. **semantic-release Analyzes Commits**
   - Determines version type (major/minor/patch)
   - Generates CHANGELOG.md
   - Updates package.json version
   - Creates git tag

3. **Publishing**
   - Publishes to NPM registry
   - Creates GitHub Release
   - Adds release notes
   - Updates documentation

## 🔐 Required GitHub Secrets

Before first release, add to GitHub Secrets:

### For boilerplate:
```
Repository Settings → Secrets and variables → Actions → New repository secret
```

**NPM_TOKEN:**
1. Go to https://www.npmjs.com/
2. Settings → Access Tokens → Generate New Token
3. Select "Automation" token
4. Copy the token
5. Add as `NPM_TOKEN` in GitHub Secrets

**GITHUB_TOKEN:**
- Automatically provided by GitHub Actions
- No additional setup required

### For boilerplate-cli:
- Same steps for NPM_TOKEN

## 🎯 First Release

### 1. Make Sure All Commits Follow Conventional Commits

Check recent commits:
```bash
git log --oneline -10
```

If there are commits not following the standard, do squash or rebase.

### 2. Create Commit for First Release

```bash
cd /Users/atant/Workstation/boilerplate
git add .
git commit -m "feat: initial release

- Thin resolvers pattern
- Guards decorators
- Built-in CRUD methods
- Multiple transports
- Event-driven architecture
- Service registry
- TypeScript support"
```

### 3. Push to Master

```bash
git push origin master
```

### 4. Check GitHub Actions

Navigate to:
```
https://github.com/dualitysol/boilerplate/actions
```

Wait for successful workflow execution.

### 5. Check NPM

After successful release:
```
https://www.npmjs.com/package/@dualitysol/boilerplate
```

## 📦 Installation After Publishing

```bash
# Users will be able to install
npm install @dualitysol/boilerplate
npm install -g @dualitysol/boilerplate-cli

# And use
boilerplate create my-app
```

## 🔄 Subsequent Releases

### For New Features (Minor):
```bash
git commit -m "feat: add new decorator"
git push origin master
# Автоматически: 1.0.0 → 1.1.0
```

### For Bug Fixes (Patch):
```bash
git commit -m "fix: resolve build issue"
git push origin master
# Автоматически: 1.0.0 → 1.0.1
```

### For Breaking Changes (Major):
```bash
git commit -m "feat!: change API signature

BREAKING CHANGE: Method signature changed"
git push origin master
# Автоматически: 1.0.0 → 2.0.0
```

## 📊 Release Monitoring

- **GitHub Releases**: https://github.com/dualitysol/boilerplate/releases
- **NPM Package**: https://www.npmjs.com/package/@dualitysol/boilerplate
- **CHANGELOG**: Automatically updated in repository

## 🎉 Done!

Your packages are fully ready for publishing with professional CI/CD pipeline!

### What's Next?

1. ✅ Add NPM_TOKEN to GitHub Secrets
2. ✅ Make commit with `feat:` type
3. ✅ Push to master
4. ✅ Watch automatic release! 🚀

---

**Questions?** Check:
- [GitHub Actions Logs](https://github.com/dualitysol/boilerplate/actions)
- [semantic-release docs](https://semantic-release.gitbook.io/)
- [Conventional Commits](https://www.conventionalcommits.org/)
