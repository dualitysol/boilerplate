# Entity-First Auto-Generation Demo

Complete demonstration of defining entities once and auto-generating everything else.

## Structure

```
Product/
├── typeDefs/
│   └── schema.graphql    # GraphQL schema
├── resolvers/
│   ├── queries.js        # Query resolvers
│   └── mutations.js      # Mutation resolvers
├── model/
│   └── index.js          # Business logic & validation
└── index.js              # Service entry point (exports typeDefinitions, queryMutations)
```

## Running

```bash
npm install
npm start
```

Open http://localhost:4000/graphql

## Example Queries

### Create Product

```graphql
mutation {
  createProduct(input: {
    name: "Laptop"
    description: "High-performance laptop"
    price: 999.99
    stock: 50
    category: "Electronics"
    tags: ["computer", "portable"]
  }) {
    success
    message
    product {
      id
      name
      price
      stock
    }
  }
}
```

### Get All Products

```graphql
query {
  products(category: "Electronics", limit: 10) {
    success
    products {
      id
      name
      price
      stock
      category
    }
    total
  }
}
```

### Search Products

```graphql
query {
  searchProducts(query: "laptop", limit: 5) {
    success
    products {
      id
      name
      price
    }
  }
}
```

### Update Product

```graphql
mutation {
  updateProduct(id: "prod_xxx", input: {
    price: 899.99
    stock: 45
  }) {
    success
    message
    product {
      id
      name
      price
      stock
      updatedAt
    }
  }
}
```

## Features Demonstrated

✅ GraphQL schema definition  
✅ Query and Mutation resolvers  
✅ Business logic in model layer  
✅ Input validation  
✅ Error handling with response types  
✅ Service registration  
✅ Clean separation of concerns  
