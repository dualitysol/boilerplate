# GraphQL Schema

This directory contains the GraphQL schema definition files for the microservices framework.

## Structure

```
schema/
├── root.graphql      # Root Query, Mutation, Subscription types
├── scalars.graphql   # Custom scalar types (DateTime, JSON, Upload)
├── common.graphql    # Common types (PageInfo, Error, Node, etc.)
└── user.graphql      # Example: User service schema
```

## Usage

### 1. Define Your Schema

Create `.graphql` files in this directory to define your GraphQL types, queries, mutations, and subscriptions.

Example (`todo.graphql`):

```graphql
type Todo implements Node {
  id: ID!
  title: String!
  completed: Boolean!
  createdAt: DateTime!
}

extend type Query {
  todos: [Todo!]!
  todo(id: ID!): Todo
}

extend type Mutation {
  createTodo(title: String!): Todo!
  toggleTodo(id: ID!): Todo!
}
```

### 2. Generate TypeScript Types

Run the code generator to create TypeScript types from your schema:

```bash
# Generate types once
npm run generate:graphql

# Watch mode (regenerate on schema changes)
npm run generate:graphql -- --watch

# Or using the CLI
boilerplate generate-types
boilerplate generate-types --watch
```

This will generate:
- `types/graphql-generated.d.ts` - Server-side types (resolvers, context)
- `types/graphql-operations.d.ts` - Client-side operation types

### 3. Use Generated Types in Resolvers

```typescript
import { Resolvers, QueryResolvers, MutationResolvers } from '../types/graphql-generated'
import { GraphQLContext } from './context'

const todoResolvers: Resolvers<GraphQLContext> = {
  Query: {
    todos: async (parent, args, context) => {
      // Full type safety with generated types
      return context.services.todoService.getAll()
    },
    
    todo: async (parent, { id }, context) => {
      return context.services.todoService.getById(id)
    }
  },
  
  Mutation: {
    createTodo: async (parent, { title }, context) => {
      return context.services.todoService.create({ title })
    },
    
    toggleTodo: async (parent, { id }, context) => {
      return context.services.todoService.toggle(id)
    }
  }
}
```

## Best Practices

### 1. Use Extends for Modularity

Each service can extend the root types:

```graphql
# user.graphql
extend type Query {
  users: [User!]!
}

# product.graphql  
extend type Query {
  products: [Product!]!
}
```

### 2. Implement Common Interfaces

Use the provided interfaces for consistency:

```graphql
type User implements Node {
  id: ID!
  # ...
}

type CreateUserResponse implements MutationResponse {
  success: Boolean!
  message: String
  errors: [Error!]
  user: User
}
```

### 3. Use Custom Scalars

Leverage the defined scalars for better type safety:

```graphql
type Event {
  id: ID!
  timestamp: DateTime!  # ISO-8601 datetime
  metadata: JSON!       # Arbitrary JSON data
}
```

### 4. Document with Descriptions

Add descriptions to your types and fields:

```graphql
"""
Represents a user in the system
"""
type User implements Node {
  """Unique identifier"""
  id: ID!
  
  """User's email address"""
  email: String!
}
```

## Schema Stitching

The framework automatically stitches all `.graphql` files together. You don't need to manually combine schemas.

## Validation

Schema validation happens automatically during code generation. Any schema errors will be reported.

## Example: Complete Service Schema

```graphql
# product.graphql

type Product implements Node {
  id: ID!
  name: String!
  description: String
  price: Float!
  stock: Int!
  category: Category!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Category {
  id: ID!
  name: String!
}

type ProductConnection {
  edges: [ProductEdge!]!
  pageInfo: PageInfo!
}

type ProductEdge {
  node: Product!
  cursor: String!
}

input CreateProductInput {
  name: String!
  description: String
  price: Float!
  stock: Int!
  categoryId: ID!
}

input UpdateProductInput {
  name: String
  description: String
  price: Float
  stock: Int
  categoryId: ID
}

type CreateProductResponse implements MutationResponse {
  success: Boolean!
  message: String
  errors: [Error!]
  product: Product
}

extend type Query {
  product(id: ID!): Product
  products(
    pagination: PaginationInput
    filter: ProductFilterInput
    sort: SortInput
  ): ProductConnection!
}

extend type Mutation {
  createProduct(input: CreateProductInput!): CreateProductResponse!
  updateProduct(id: ID!, input: UpdateProductInput!): CreateProductResponse!
  deleteProduct(id: ID!): MutationResponse!
}

extend type Subscription {
  productUpdated(productId: ID): Product!
}
```

## Resources

- [GraphQL Schema Documentation](https://graphql.org/learn/schema/)
- [GraphQL Code Generator](https://the-guild.dev/graphql/codegen)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
