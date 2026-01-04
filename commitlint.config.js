module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation
        'style',    // Code style (formatting, missing semi colons, etc)
        'refactor', // Code refactoring
        'perf',     // Performance improvement
        'test',     // Adding tests
        'build',    // Build system changes
        'ci',       // CI/CD changes
        'chore',    // Other changes (updating dependencies, etc)
        'revert'    // Revert commit
      ]
    ],
    'subject-case': [0], // Allow any case
    'header-max-length': [2, 'always', 100]
  }
}
