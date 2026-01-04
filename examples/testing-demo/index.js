/**
 * Testing Demo - Main Application
 * 
 * Demonstrates testing utilities for microservices
 */

import { makeExecutableSchema } from 'graphql';
import { GraphQLTester, userFactory, MockDatabase } from '@dualitysol/boilerplate/testing';

/**
 * GraphQL Schema
 */
const typeDefs = `
  type User {
    id: ID!
    email: String!
    username: String!
    firstName: String!
    lastName: String!
    age: Int!
    roles: [String!]!
    isActive: Boolean!
    createdAt: String!
  }

  type Product {
    id: ID!
    name: String!
    description: String!
    price: Float!
    stock: Int!
    category: String!
    isPublished: Boolean!
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    author: User!
    status: String!
    viewCount: Int!
    createdAt: String!
  }

  type Query {
    users: [User!]!
    user(id: ID!): User
    products: [Product!]!
    product(id: ID!): Product
    posts: [Post!]!
    post(id: ID!): Post
  }

  type Mutation {
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deleteUser(id: ID!): Boolean!
    
    createProduct(input: CreateProductInput!): Product!
    updateProduct(id: ID!, input: UpdateProductInput!): Product!
    deleteProduct(id: ID!): Boolean!
  }

  input CreateUserInput {
    email: String!
    username: String!
    firstName: String!
    lastName: String!
    password: String!
  }

  input UpdateUserInput {
    email: String
    username: String
    firstName: String
    lastName: String
  }

  input CreateProductInput {
    name: String!
    description: String!
    price: Float!
    stock: Int!
    category: String!
  }

  input UpdateProductInput {
    name: String
    description: String
    price: Float
    stock: Int
  }
`;

/**
 * Create mock database
 */
export function createDatabase() {
  const db = new MockDatabase();
  
  // Seed with test data
  const users = db.collection('users');
  const products = db.collection('products');
  const posts = db.collection('posts');
  
  return { db, users, products, posts };
}

/**
 * GraphQL Resolvers
 */
export function createResolvers({ users, products, posts }) {
  return {
    Query: {
      users: async () => {
        return await users.find();
      },
      
      user: async (_, { id }) => {
        return await users.findById(id);
      },
      
      products: async () => {
        return await products.find();
      },
      
      product: async (_, { id }) => {
        return await products.findById(id);
      },
      
      posts: async () => {
        return await posts.find();
      },
      
      post: async (_, { id }) => {
        return await posts.findById(id);
      }
    },
    
    Mutation: {
      createUser: async (_, { input }) => {
        const user = {
          ...input,
          roles: ['user'],
          isActive: true,
          createdAt: new Date().toISOString()
        };
        
        return await users.insertOne(user);
      },
      
      updateUser: async (_, { id, input }) => {
        return await users.updateOne({ id }, input);
      },
      
      deleteUser: async (_, { id }) => {
        const result = await users.deleteOne({ id });
        return result.deletedCount > 0;
      },
      
      createProduct: async (_, { input }) => {
        const product = {
          ...input,
          isPublished: true,
          createdAt: new Date().toISOString()
        };
        
        return await products.insertOne(product);
      },
      
      updateProduct: async (_, { id, input }) => {
        return await products.updateOne({ id }, input);
      },
      
      deleteProduct: async (_, { id }) => {
        const result = await products.deleteOne({ id });
        return result.deletedCount > 0;
      }
    },
    
    Post: {
      author: async (post, _, { users }) => {
        return await users.findById(post.authorId);
      }
    }
  };
}

/**
 * Create GraphQL Schema
 */
export function createSchema(database) {
  return makeExecutableSchema({
    typeDefs,
    resolvers: createResolvers(database)
  });
}

/**
 * Main demo
 */
async function main() {
  console.log('🧪 Testing Demo\n');
  
  // 1. Create database
  const database = createDatabase();
  const { users, products } = database;
  
  // 2. Seed data using factories
  console.log('📝 Seeding test data...');
  
  const testUsers = userFactory.buildMany(5);
  await users.insertMany(testUsers);
  
  console.log(`   ✓ Created ${testUsers.length} users`);
  
  // 3. Create schema and tester
  const schema = createSchema(database);
  const tester = new GraphQLTester(schema, {
    context: { users }
  });
  
  // 4. Run sample queries
  console.log('\n🔍 Running GraphQL queries...\n');
  
  // Query all users
  const usersResult = await tester.query(`
    query {
      users {
        id
        email
        username
        firstName
        lastName
      }
    }
  `);
  
  console.log('Query: users');
  console.log('Result:', JSON.stringify(usersResult.data, null, 2));
  
  // Query single user
  const singleUserResult = await tester.query(`
    query GetUser($id: ID!) {
      user(id: $id) {
        id
        email
        username
      }
    }
  `, {
    variables: { id: testUsers[0].id }
  });
  
  console.log('\nQuery: user(id)');
  console.log('Result:', JSON.stringify(singleUserResult.data, null, 2));
  
  // 5. Run mutations
  console.log('\n✏️  Running GraphQL mutations...\n');
  
  const createResult = await tester.mutate(`
    mutation CreateUser($input: CreateUserInput!) {
      createUser(input: $input) {
        id
        email
        username
      }
    }
  `, {
    variables: {
      input: {
        email: 'newuser@example.com',
        username: 'newuser',
        firstName: 'New',
        lastName: 'User',
        password: 'password123'
      }
    }
  });
  
  console.log('Mutation: createUser');
  console.log('Result:', JSON.stringify(createResult.data, null, 2));
  
  // 6. Assertions
  console.log('\n✅ Running assertions...\n');
  
  try {
    await tester.expectQuery('{ users { id } }')
      .then(assertion => assertion.toHaveNoErrors());
    console.log('   ✓ Query has no errors');
  } catch (error) {
    console.error('   ✗ Assertion failed:', error.message);
  }
  
  try {
    const assertion = await tester.expectQuery('{ users { id email } }');
    const users = assertion.getDataPath('users');
    console.log(`   ✓ Found ${users.length} users`);
  } catch (error) {
    console.error('   ✗ Assertion failed:', error.message);
  }
  
  // 7. Snapshot testing
  console.log('\n📸 Snapshot testing...\n');
  
  await tester.expectSnapshot('users-query', '{ users { id email } }');
  console.log('   ✓ Snapshot saved: users-query');
  
  // 8. Database testing
  console.log('\n💾 Database operations...\n');
  
  const allUsers = await users.find();
  console.log(`   ✓ Total users in database: ${allUsers.length}`);
  
  const activeUsers = await users.find({ isActive: true });
  console.log(`   ✓ Active users: ${activeUsers.length}`);
  
  // 9. Query history
  console.log('\n📊 Database query history...\n');
  
  const history = database.db.getQueryHistory('users');
  console.log(`   ✓ Total queries to 'users' collection: ${history.length}`);
  
  history.slice(0, 3).forEach((query, i) => {
    console.log(`   ${i + 1}. ${query.operation}`);
  });
  
  console.log('\n✨ Demo complete!\n');
}

// Run demo if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default {
  createDatabase,
  createResolvers,
  createSchema
};
