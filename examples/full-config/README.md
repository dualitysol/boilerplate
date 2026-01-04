# Full Configuration Example

This example demonstrates **Entity-First Development** and **Distributed Tracing** in the Boilerplate framework.

## Features Demonstrated

✅ Entity-first development with decorators  
✅ Distributed tracing with OpenTelemetry  
✅ Full TypeScript support  
✅ Auto-generated GraphQL schemas  
✅ Auto-generated database migrations  
✅ Lifecycle hooks  
✅ Entity relations  
✅ Field validation  

## Project Structure

```
full-config/
├── boilerplate.config.ts          # Configuration with tracing enabled
├── services/
│   └── ProductService/
│       ├── entity/
│       │   └── Product.ts          # 👈 Entity definition
│       ├── model/
│       │   └── index.ts
│       ├── resolvers/
│       │   └── index.ts
│       ├── typeDefinitions/
│       │   └── Product.ts          # Auto-generated
│       └── queryMutation/
│           └── index.ts
└── migrations/
    └── 2024-01-15-create-product.js # Auto-generated
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
# .env
NODE_ENV=development
MONGODB_URL=mongodb://localhost:27017/ecommerce
REDIS_HOST=localhost
REDIS_PORT=6379

# Tracing
TRACING_ENABLED=true
TRACING_PROVIDER=opentelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
TRACE_SAMPLE_RATE=1.0
```

### 3. Start Jaeger (for tracing)

```bash
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest
```

### 4. Sync Entity

```bash
# This will generate GraphQL schema, migration, and resolvers
npm run sync:entity ProductService Product
```

This command generates:

**GraphQL Schema** (`typeDefinitions/Product.ts`):
```graphql
type Product {
  id: ID!
  name: String!
  slug: String!
  description: String
  price: Int!
  stock: Int!
  category: String!
  images: [String!]
  tags: [String!]
  isActive: Boolean!
  isFeatured: Boolean!
  rating: Float!
  reviewCount: Int!
  createdAt: String!
  updatedAt: String!
}

extend type Query {
  product(id: ID!): Product
  products(limit: Int, offset: Int): [Product!]!
}

extend type Mutation {
  createProduct(input: CreateProductInput!): Product!
  updateProduct(id: ID!, input: UpdateProductInput!): Product!
  deleteProduct(id: ID!): Boolean!
}

input CreateProductInput {
  name: String!
  slug: String!
  description: String
  price: Int!
  stock: Int!
  category: String!
  images: [String!]
  tags: [String!]
}

input UpdateProductInput {
  name: String
  slug: String
  description: String
  price: Int
  stock: Int
  category: String
  images: [String!]
  tags: [String!]
}
```

**MongoDB Migration** (`migrations/2024-01-15-create-product.js`):
```javascript
module.exports = {
  async up(db) {
    await db.createCollection('products', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['name', 'slug', 'price', 'stock', 'category', 'isActive'],
          properties: {
            name: { bsonType: 'string' },
            slug: { bsonType: 'string' },
            description: { bsonType: 'string' },
            price: { bsonType: 'number' },
            stock: { bsonType: 'number' },
            category: { bsonType: 'string' },
            images: { bsonType: 'array' },
            tags: { bsonType: 'array' },
            isActive: { bsonType: 'bool' },
            isFeatured: { bsonType: 'bool' },
            rating: { bsonType: 'number' },
            reviewCount: { bsonType: 'number' },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' }
          }
        }
      }
    })
    
    // Create indexes
    await db.collection('products').createIndex({ name: 1 })
    await db.collection('products').createIndex({ slug: 1 }, { unique: true })
    await db.collection('products').createIndex({ stock: 1 })
    await db.collection('products').createIndex({ isActive: 1 })
    await db.collection('products').createIndex({ createdAt: 1 })
  },
  
  async down(db) {
    await db.collection('products').drop()
  }
}
```

### 5. Generate Bootstrap

```bash
npm run bp bootstrap
```

This generates `bootstrap.ts` with:
- MongoDB connection
- Redis cache
- Event bus
- Queue manager
- Logger
- **OpenTelemetry tracing** ✨
- GraphQL server

### 6. Start Development

```bash
npm run dev
```

### 7. Test Tracing

Make some GraphQL requests:

```graphql
mutation {
  createProduct(input: {
    name: "MacBook Pro"
    slug: "macbook-pro"
    price: 199900
    stock: 10
    category: "electronics"
  }) {
    id
    name
    price
  }
}

query {
  products(limit: 10) {
    id
    name
    price
    stock
  }
}
```

View traces in Jaeger: http://localhost:16686

You'll see:
- HTTP request span
- GraphQL operation span
- Database query span
- All with attributes (user.id, query, etc.)

## Entity Features

### Decorators Used

```typescript
@Entity({ name: 'Product', collection: 'products' })
export class Product {
  @ID()
  id: string

  @Field({ 
    type: 'string',
    nullable: false,
    db: { unique: true },
    validation: { minLength: 1, maxLength: 255 }
  })
  name: string

  @Relation({
    type: () => Category,
    kind: 'many-to-one'
  })
  category: Category

  @BeforeInsert()
  beforeInsert() {
    this.createdAt = new Date()
  }
}
```

### Lifecycle Hooks

```typescript
@BeforeInsert()   // Before creating
@AfterInsert()    // After creating
@BeforeUpdate()   // Before updating
@BeforeDelete()   // Before deleting (soft delete)
```

### Relations

```typescript
@Relation({
  type: () => Category,
  kind: 'many-to-one',
  foreignKey: 'categoryId'
})
category: Category

@Relation({
  type: () => Review,
  kind: 'one-to-many',
  cascade: ['delete']
})
reviews: Review[]
```

## Tracing Features

### Configuration

```typescript
{
  features: {
    tracing: {
      enabled: true,
      provider: 'opentelemetry',
      config: {
        serviceName: 'ecommerce-platform',
        endpoint: 'http://localhost:4318/v1/traces',
        sampleRate: 1.0,
        instrumentations: {
          http: true,
          graphql: true,
          database: true,
          redis: true
        }
      }
    }
  }
}
```

### What Gets Traced

✅ HTTP requests (incoming/outgoing)  
✅ GraphQL queries and mutations  
✅ MongoDB queries  
✅ Redis operations  
✅ Event bus messages  
✅ Queue jobs  

### Manual Spans

```typescript
const span = tracing.createSpan('custom-operation', {
  'user.id': userId,
  'product.id': productId
})

try {
  // Your code
  const result = await doWork()
  span.setAttribute('result.count', result.length)
  return result
} finally {
  span.end()
}
```

## Workflow

```
1. Define Entity (Product.ts)
   ↓
2. npm run sync:entity ProductService Product
   ↓
3. GraphQL schema generated
   Database migration generated
   Resolvers generated (if missing)
   ↓
4. npm run bp bootstrap
   ↓
5. Bootstrap with tracing generated
   ↓
6. npm run dev
   ↓
7. Make requests, view traces in Jaeger!
```

## Next Steps

- Add more entities (User, Order, Payment)
- Customize resolvers
- Add business logic to services
- Configure sampling for production
- Set up Grafana for visualization

## Learn More

- [Entity-First Development](../../docs/ENTITY_FIRST.md)
- [Tracing & Telemetry](../../docs/TRACING.md)
- [CLI Reference](../../docs/CLI_REFERENCE.md)

---

**Built with ❤️ using @dualitysol/boilerplate**
