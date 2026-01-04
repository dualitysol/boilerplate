/**
 * Binary Filters Demo
 * 
 * Demonstrates ultra-fast user-to-marketplace matching using binary filters
 */

import { 
  BinaryFilterBuilder,
  BinaryFilterMatcher,
  BatchMatcher,
  FilterAnalyzer,
  BitwiseOps
} from '@dualitysol/boilerplate/binary-filters';

console.log('🎯 Binary Filters Demo - Ultra-Fast Entity Matching\n');

// ============================================================================
// STEP 1: Define Filter Schema
// ============================================================================

console.log('📋 Step 1: Define Filter Schema\n');

const builder = new BinaryFilterBuilder({ maxBits: 64 });

// Operating System (4 variants = 2 bits)
builder.addFilter('os', {
  variants: 4,
  rules: [
    { eq: 'ios' },
    { eq: 'android' },
    { eq: 'windows' },
    { eq: 'macos' }
  ],
  type: 'string'
});

// Age groups (4 variants = 2 bits)
builder.addFilter('age', {
  variants: 4,
  rules: [
    { gte: 18, lt: 21 },   // 18-20
    { gte: 21, lt: 25 },   // 21-24
    { gte: 25, lt: 35 },   // 25-34
    { gte: 35 }            // 35+
  ],
  type: 'number'
});

// Sex (2 variants = 1 bit)
builder.addFilter('sex', {
  variants: 2,
  rules: [
    { eq: 'male' },
    { eq: 'female' }
  ],
  type: 'string'
});

// Adult content (2 variants = 1 bit)
builder.addFilter('adult', {
  variants: 2,
  rules: [
    { eq: true },
    { eq: false }
  ],
  type: 'boolean'
});

// Country (8 variants = 3 bits)
builder.addFilter('country', {
  variants: 8,
  rules: [
    { eq: 'US' },
    { eq: 'UK' },
    { eq: 'CA' },
    { eq: 'AU' },
    { eq: 'DE' },
    { eq: 'FR' },
    { eq: 'JP' },
    { in: ['IT', 'ES', 'NL', 'Other'] }
  ],
  type: 'string'
});

// Premium status (2 variants = 1 bit)
builder.addFilter('premium', {
  variants: 2,
  rules: [
    { eq: true },
    { eq: false }
  ],
  type: 'boolean'
});

console.log('Filter Schema Statistics:');
console.log(builder.getStats());
console.log('');

// ============================================================================
// STEP 2: Encode Users
// ============================================================================

console.log('👤 Step 2: Encode Users\n');

const users = [
  {
    id: 'user_1',
    name: 'John Doe',
    os: 'ios',
    age: 23,
    sex: 'male',
    adult: true,
    country: 'US',
    premium: true
  },
  {
    id: 'user_2',
    name: 'Jane Smith',
    os: 'android',
    age: 19,
    sex: 'female',
    adult: false,
    country: 'UK',
    premium: false
  },
  {
    id: 'user_3',
    name: 'Bob Johnson',
    os: 'ios',
    age: 28,
    sex: 'male',
    adult: true,
    country: 'CA',
    premium: true
  },
  {
    id: 'user_4',
    name: 'Alice Williams',
    os: 'windows',
    age: 42,
    sex: 'female',
    adult: true,
    country: 'US',
    premium: false
  },
  {
    id: 'user_5',
    name: 'Charlie Brown',
    os: 'android',
    age: 20,
    sex: 'male',
    adult: false,
    country: 'AU',
    premium: true
  }
];

// Encode all users
for (const user of users) {
  user.binaryFilter = builder.encode(user);
  user.binaryFilterString = user.binaryFilter.toString();
  user.binaryFilterBinary = BinaryFilterBuilder.toBinaryString(user.binaryFilter, 16);
}

console.log('Encoded Users:');
users.forEach(user => {
  console.log(`  ${user.name}:`);
  console.log(`    ID: ${user.id}`);
  console.log(`    Filter (decimal): ${user.binaryFilterString}`);
  console.log(`    Filter (binary):  ${user.binaryFilterBinary}`);
  console.log(`    Profile: ${user.os}, ${user.age}yo, ${user.sex}, adult:${user.adult}, ${user.country}, premium:${user.premium}`);
  console.log('');
});

// ============================================================================
// STEP 3: Define Marketplace Requirements
// ============================================================================

console.log('🏪 Step 3: Define Marketplace Requirements\n');

const marketplaces = [
  {
    id: 'marketplace_1',
    name: 'Tech Store (iOS Premium)',
    requirements: builder.encodeRequirements({
      os: 'ios',
      premium: true
      // age, sex, adult, country = wildcards (any value)
    })
  },
  {
    id: 'marketplace_2',
    name: 'Gaming Store (Young Males)',
    requirements: builder.encodeRequirements({
      age: { gte: 18, lt: 25 }, // Match variants 0 or 1
      sex: 'male',
      adult: true
    })
  },
  {
    id: 'marketplace_3',
    name: 'Fashion Store (Female, 25-34)',
    requirements: builder.encodeRequirements({
      sex: 'female',
      age: { gte: 25, lt: 35 }
    })
  },
  {
    id: 'marketplace_4',
    name: 'Family Store (Non-Adult)',
    requirements: builder.encodeRequirements({
      adult: false
    })
  }
];

console.log('Marketplaces:');
marketplaces.forEach(mp => {
  console.log(`  ${mp.name}:`);
  console.log(`    Filter: ${mp.requirements.filter.toString()}`);
  console.log(`    Mask:   ${mp.requirements.mask.toString()}`);
  console.log(`    Binary Filter: ${BinaryFilterBuilder.toBinaryString(mp.requirements.filter, 16)}`);
  console.log(`    Binary Mask:   ${BinaryFilterBuilder.toBinaryString(mp.requirements.mask, 16)}`);
  console.log('');
});

// ============================================================================
// STEP 4: Match Users to Marketplaces
// ============================================================================

console.log('🔍 Step 4: Match Users to Marketplaces\n');

const batchMatcher = new BatchMatcher(builder);

console.log('Matching Results:');
for (const user of users) {
  console.log(`\n${user.name} (${user.id}):`);
  
  const matches = batchMatcher.matchMany(user.binaryFilter, marketplaces);
  
  if (matches.length > 0) {
    matches.forEach(mp => {
      console.log(`  ✅ Matches: ${mp.name}`);
    });
  } else {
    console.log('  ❌ No matches');
  }
}

// ============================================================================
// STEP 5: Reverse Matching (Find Users for Marketplace)
// ============================================================================

console.log('\n\n🎯 Step 5: Reverse Matching (Find Users for Each Marketplace)\n');

for (const marketplace of marketplaces) {
  console.log(`${marketplace.name}:`);
  
  const matchedUsers = batchMatcher.matchUsers(users, marketplace.requirements);
  
  if (matchedUsers.length > 0) {
    matchedUsers.forEach(user => {
      console.log(`  👤 ${user.name} - ${user.os}, ${user.age}yo, ${user.sex}`);
    });
  } else {
    console.log('  (No matching users)');
  }
  
  console.log('');
}

// ============================================================================
// STEP 6: Performance Analysis
// ============================================================================

console.log('📊 Step 6: Performance Analysis\n');

const analyzer = new FilterAnalyzer(builder);

// Analyze distribution
const distribution = analyzer.analyzeDistribution(users);
console.log('Distribution Analysis:');
console.log(`  Unique filters: ${distribution.unique}`);
console.log(`  Total users: ${distribution.total}`);
console.log(`  Unique ratio: ${(distribution.uniqueRatio * 100).toFixed(2)}%`);
console.log('');

// Analyze selectivity
const selectivity = analyzer.analyzeSelectivity(users);
console.log('Selectivity Analysis:');
for (const [filter, data] of Object.entries(selectivity)) {
  console.log(`  ${filter}:`);
  data.variants.forEach(v => {
    if (v.variant > 0) {
      console.log(`    Variant ${v.variant}: ${v.count} users (${v.percentage})`);
      if (v.rule) {
        console.log(`      Rule: ${JSON.stringify(v.rule)}`);
      }
    }
  });
}
console.log('');

// ============================================================================
// STEP 7: Database Query Examples
// ============================================================================

console.log('💾 Step 7: Database Query Examples\n');

const matcher = new BinaryFilterMatcher(builder);

// MongoDB query
const mongoQuery = matcher.buildMongoQuery({
  os: 'ios',
  premium: true
});
console.log('MongoDB Query:');
console.log(JSON.stringify(mongoQuery, null, 2));
console.log('');

// PostgreSQL query
const pgQuery = matcher.buildPostgresQuery({
  os: 'ios',
  premium: true
});
console.log('PostgreSQL Query:');
console.log(`SELECT * FROM users WHERE ${pgQuery};`);
console.log('');

// ============================================================================
// STEP 8: Export Schema for Migration
// ============================================================================

console.log('📤 Step 8: Export Schema (for migrations)\n');

const schema = builder.exportSchema();
console.log('Exported Schema:');
console.log(JSON.stringify(schema, null, 2));
console.log('');

// ============================================================================
// STEP 9: Demonstrate Binary Operations
// ============================================================================

console.log('🔢 Step 9: Binary Operations Examples\n');

const user1Filter = users[0].binaryFilter;
const user2Filter = users[1].binaryFilter;

console.log('User 1 filter:', BinaryFilterBuilder.toBinaryString(user1Filter, 16));
console.log('User 2 filter:', BinaryFilterBuilder.toBinaryString(user2Filter, 16));
console.log('');

// XOR - find differences
const differences = user1Filter ^ user2Filter;
console.log('Differences (XOR):', BinaryFilterBuilder.toBinaryString(differences, 16));
console.log('Number of different bits:', BitwiseOps.popcount(differences));
console.log('');

// AND - find commonalities
const commonalities = user1Filter & user2Filter;
console.log('Commonalities (AND):', BinaryFilterBuilder.toBinaryString(commonalities, 16));
console.log('');

// Decode filter
const decoded = builder.decode(user1Filter);
console.log('Decoded User 1 filter:');
console.log(JSON.stringify(decoded, null, 2));
console.log('');

// ============================================================================
// Summary
// ============================================================================

console.log('\n✅ Demo Complete!\n');
console.log('Key Benefits:');
console.log('  • Ultra-fast matching (bitwise operations)');
console.log('  • Compact storage (10 bits for 6 filters)');
console.log('  • Database-friendly (single integer column)');
console.log('  • Migration support (schema versioning)');
console.log('  • Flexible rules (ranges, exact, contains, etc.)');
console.log('');
console.log('Use Cases:');
console.log('  • User-to-marketplace matching');
console.log('  • Content recommendation');
console.log('  • Ad targeting');
console.log('  • Access control / permissions');
console.log('  • Feature flags');
console.log('');
