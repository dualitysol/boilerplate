# Rate Limiting Demo

Complete demonstration of rate limiting with token bucket algorithm.

## Structure

```
RateLimit/
├── typeDefs/
│   └── schema.graphql    # GraphQL schema
├── resolvers/
│   ├── queries.js        # Query resolvers
│   └── mutations.js      # Mutation resolvers
├── model/
│   └── index.js          # Rate limit configs & utilities
└── index.js              # Service entry point
```

## Running

```bash
npm install
npm start
```

Open http://localhost:4001/graphql

## Rate Limits

- **Public API**: 10 requests/minute (blocks for 5 minutes)
- **User API**: 100 requests/minute
- **Admin API**: 1000 requests/minute
- **Expensive Operations**: 2 requests/minute (blocks for 2 minutes)

## Example Queries

### Test Public API

```graphql
query {
  publicData(key: "test") {
    success
    message
    rateLimit {
      allowed
      remaining
      total
      resetAt
      retryAfter
    }
  }
}
```

### Check Rate Limit Status

```graphql
query {
  checkRateLimit(identifier: "192.168.1.1") {
    allowed
    remaining
    total
    resetAt
  }
}
```

### Test Expensive Operation

```graphql
mutation {
  processData(input: "large dataset") {
    success
    message
    rateLimit {
      remaining
      retryAfter
    }
  }
}
```

## Features Demonstrated

✅ Token bucket algorithm  
✅ Per-IP rate limiting  
✅ Per-user rate limiting  
✅ Multiple rate limit tiers  
✅ Temporary blocking  
✅ X-RateLimit-* headers  
✅ 429 Too Many Requests responses  
✅ Retry-After headers  
