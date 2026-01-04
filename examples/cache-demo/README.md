# Cache Demo

Complete demonstration of multi-level caching with TTL and invalidation.

## Structure

```
Cache/
├── typeDefs/
│   └── schema.graphql    # GraphQL schema
├── resolvers/
│   ├── queries.js        # Query resolvers
│   └── mutations.js      # Mutation resolvers
├── model/
│   └── index.js          # Cache keys, TTLs, utilities
└── index.js              # Service entry point
```

## Running

```bash
npm install
npm start
```

Open http://localhost:4004/graphql

## Features

- **Cache-aside pattern**: Lazy loading with automatic cache population
- **Write-through**: Update cache on writes
- **TTL support**: Different TTLs per query type
- **Pattern invalidation**: Invalidate multiple keys at once
- **Cache statistics**: Hit rate, size, performance metrics
- **Memory storage**: Fast in-memory caching (production: use Redis)

## Cache TTLs

- **Product**: 60 seconds
- **Product List**: 30 seconds
- **Stats** (expensive): 300 seconds

## Example Queries

### Get Cached Product

```graphql
query {
  cachedProduct(id: "prod_xxx") {
    success
    product {
      id
      name
      price
      stock
      cacheInfo {
        cached
        ttl
        key
      }
    }
  }
}
```

### Get Cached Products

```graphql
query {
  cachedProducts(category: "Electronics", limit: 10) {
    success
    products {
      id
      name
      price
      cacheInfo {
        cached
        ttl
      }
    }
    total
  }
}
```

### Product Stats (Expensive Query)

```graphql
query {
  productStats(category: "Electronics") {
    success
    products {
      id
      name
      price
      cacheInfo {
        cached
        ttl
      }
    }
  }
}
```

### Cache Statistics

```graphql
query {
  cacheStats {
    success
    stats {
      hits
      misses
      sets
      deletes
      hitRate
      size
    }
  }
}
```

## Example Mutations

### Create Product (Warms Cache)

```graphql
mutation {
  createProduct(input: {
    name: "New Laptop"
    price: 1299.99
    stock: 25
    category: "Electronics"
  }) {
    success
    message
    product {
      id
      name
      cacheInfo {
        cached
        ttl
      }
    }
  }
}
```

### Update Product (Invalidates Cache)

```graphql
mutation {
  updateProduct(id: "prod_xxx", input: {
    name: "Updated Laptop"
    price: 899.99
    stock: 45
    category: "Electronics"
  }) {
    success
    message
    product {
      id
      name
      price
    }
  }
}
```

### Clear All Cache

```graphql
mutation {
  clearCache {
    success
    stats {
      hits
      misses
      hitRate
      size
    }
  }
}
```

## Testing Cache Behavior

1. **First query** - Cache MISS (slow, ~100-500ms)
2. **Second query** - Cache HIT (fast, <5ms)
3. **After TTL expires** - Cache MISS again
4. **After update** - Cache invalidated, next query is MISS
5. **Check stats** - See hit rate improve over time

## Features Demonstrated

✅ Cache-aside pattern (lazy loading)  
✅ Write-through caching  
✅ TTL (Time To Live)  
✅ Pattern-based invalidation  
✅ Cache warming on create  
✅ Cache statistics & hit rate  
✅ Multiple TTLs for different query types  
✅ Cache info in responses  

## Production Tips

- Use Redis for distributed caching
- Set appropriate TTLs based on data change frequency
- Monitor cache hit rate (aim for >80%)
- Invalidate cache on writes
- Use cache warming for critical data
- Add cache headers (X-Cache: HIT/MISS)
