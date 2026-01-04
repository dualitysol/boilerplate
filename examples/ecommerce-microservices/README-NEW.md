# E-commerce Microservices Example

A complete e-commerce platform demonstrating **microservices architecture** with the @dualitysol/boilerplate framework.

## 🎯 What's New

### ✨ Entity-First Development
Each microservice now uses entity-first approach with auto-generated schemas:
- Define entities once with JSDoc annotations
- Auto-generate GraphQL schemas
- Auto-generate database migrations
- Type-safe development

### 📊 Distributed Tracing
Full observability across all microservices:
- **OpenTelemetry** integration for distributed tracing
- Trace requests across service boundaries
- Monitor performance bottlenecks
- Support for Jaeger, Zipkin, and more

### 🔄 Event-Driven Architecture
Services communicate asynchronously via NATS:
- Decoupled microservices
- Reliable message delivery
- Event sourcing patterns

## Architecture

This example demonstrates a **microservices** architecture where each service runs independently:

| Service | Port | Purpose | Entity |
|---------|------|---------|--------|
| **User Service** | 4001 | Authentication & user profiles | `User.js` |
| **Product Service** | 4002 | Product catalog & inventory | `Product.js` |
| **Order Service** | 4003 | Order management & processing | `Order.js` |
| **Payment Service** | 4004 | Payment processing | `Payment.js` |

### Service Communication

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
   ┌───▼────┬─────────┬──────────┐
   │        │         │          │
┌──▼──┐ ┌──▼───┐ ┌──▼───┐ ┌────▼─┐
│User │ │Product│ │Order │ │Payment│
│4001 │ │ 4002 │ │ 4003 │ │ 4004 │
└──┬──┘ └──┬───┘ └──┬───┘ └───┬──┘
   │       │        │         │
   └───────┴────────┴─────────┘
              │
        ┌─────▼─────┐
        │ NATS Bus  │
        │ (Events)  │
        └───────────┘
              │
        ┌─────▼─────┐
        │  Jaeger   │
        │ (Tracing) │
        └───────────┘
```

## Features

- ✅ **Entity-First Development** - Auto-generate GraphQL schemas from entities
- ✅ **Distributed Tracing** - OpenTelemetry with Jaeger/Zipkin support
- ✅ **Event-Driven** - NATS event bus for inter-service communication
- ✅ **Independent Deployment** - Each service is independently deployable
- ✅ **GraphQL APIs** - Each service exposes its own GraphQL endpoint
- ✅ **Service Discovery** - Health checks and service registration
- ✅ **Metrics** - Prometheus metrics for each service

## Quick Start

### Prerequisites

```bash
# Install NATS (for event bus)
docker run -d --name nats -p 4222:4222 nats:latest

# Install Jaeger (for tracing) - Optional but recommended
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest
```

### Option 1: Run All Services Together

```bash
# Install dependencies for all services
npm run install:all

# Enable tracing
export TRACING_ENABLED=true
export TRACING_PROVIDER=opentelemetry
export OTLP_ENDPOINT=http://localhost:4318/v1/traces

# Run all services concurrently
npm run dev:all
```

### Option 2: Run Services Individually

```bash
# Terminal 1 - User Service
cd services/user-service
npm install
TRACING_ENABLED=true npm run dev

# Terminal 2 - Product Service
cd services/product-service
npm install
TRACING_ENABLED=true npm run dev

# Terminal 3 - Order Service
cd services/order-service
npm install
TRACING_ENABLED=true npm run dev

# Terminal 4 - Payment Service
cd services/payment-service
npm install
TRACING_ENABLED=true npm run dev
```

## Service Endpoints

| Service | GraphQL API | Metrics | Purpose |
|---------|-------------|---------|---------|
| User Service | http://localhost:4001/graphql | :9091/metrics | Authentication |
| Product Service | http://localhost:4002/graphql | :9092/metrics | Catalog |
| Order Service | http://localhost:4003/graphql | :9093/metrics | Orders |
| Payment Service | http://localhost:4004/graphql | :9094/metrics | Payments |

**Observability:**
- Jaeger UI: http://localhost:16686
- Prometheus: Configure to scrape :909x/metrics

## Entity-First Development

### Entity Structure

Each service has an `entity/` folder containing the data model:

```
services/
├── user-service/
│   └── src/
│       └── entity/
│           └── User.js       # 👈 Single source of truth
├── product-service/
│   └── src/
│       └── entity/
│           └── Product.js    # 👈 Single source of truth
├── order-service/
│   └── src/
│       └── entity/
│           └── Order.js      # 👈 Single source of truth
└── payment-service/
    └── src/
        └── entity/
            └── Payment.js    # 👈 Single source of truth
```

### Example: Product Entity

```javascript
/**
 * Product Entity
 * @entity Product
 * @collection products
 */
class Product {
  /**
   * @type {string}
   * @id
   * @generated
   */
  id

  /**
   * @type {string}
   * @required
   * @minLength 1
   * @maxLength 255
   * @index
   */
  name

  /**
   * @type {number}
   * @required
   * @min 0
   * @precision 2
   */
  price

  /**
   * @type {number}
   * @required
   * @min 0
   * @default 0
   */
  stock

  // ... methods
  isInStock() {
    return this.stock > 0
  }
}
```

### Sync Entities

After modifying an entity, sync to generate schemas:

```bash
cd services/product-service
npm run sync:entity Product

# This generates:
# ✅ GraphQL type definitions
# ✅ Database migrations
# ✅ Resolvers (if needed)
```

## Distributed Tracing

### Enable Tracing

```bash
# .env
TRACING_ENABLED=true
TRACING_PROVIDER=opentelemetry
OTLP_ENDPOINT=http://localhost:4318/v1/traces
```

### Trace Example: Creating an Order

When a client creates an order, the trace spans across multiple services:

```
Trace: POST /graphql (createOrder)
├─ Span: order-service.createOrder (80ms)
│  ├─ Span: order-service.validateOrder (5ms)
│  ├─ Span: order-service.db.insert (10ms)
│  └─ Span: eventBus.publish(order.created) (2ms)
│
├─ Span: payment-service.processPayment (45ms)
│  ├─ Event: order.created received
│  ├─ Span: payment-service.stripe.charge (35ms)
│  ├─ Span: payment-service.db.insert (5ms)
│  └─ Span: eventBus.publish(payment.completed) (2ms)
│
└─ Span: product-service.updateInventory (15ms)
   ├─ Event: payment.completed received
   ├─ Span: product-service.decreaseStock (8ms)
   └─ Span: product-service.db.update (5ms)

Total: 140ms across 3 services
```

### View Traces in Jaeger

1. Open http://localhost:16686
2. Select service: `order-service`, `payment-service`, or `product-service`
3. Click "Find Traces"
4. View trace details with spans across all services

## Event Flow Examples

### 1. User Registration

```
Client → User Service: registerUser
  ↓
User Service: Create user
  ↓
Event Bus: user.registered
  ↓
Email Service: Send welcome email (if enabled)
```

### 2. Order Creation

```
Client → Order Service: createOrder
  ↓
Order Service: Validate & create order
  ↓
Event Bus: order.created
  ↓
Payment Service: Process payment
  ↓
Event Bus: payment.completed
  ↓
Order Service: Update order status
  ↓
Product Service: Update inventory
  ↓
Event Bus: inventory.updated
```

### 3. Payment Refund

```
Client → Payment Service: refundPayment
  ↓
Payment Service: Process refund
  ↓
Event Bus: payment.refunded
  ↓
Order Service: Update order status
  ↓
Product Service: Restore inventory
```

## API Examples

### User Service

**Register User:**
```graphql
mutation {
  registerUser(input: {
    username: "johndoe"
    email: "john@example.com"
    password: "secret123"
    firstName: "John"
    lastName: "Doe"
  }) {
    success
    user {
      id
      username
      email
    }
    token
  }
}
```

**Login:**
```graphql
mutation {
  loginUser(input: {
    username: "johndoe"
    password: "secret123"
  }) {
    success
    token
    user {
      id
      username
      role
    }
  }
}
```

### Product Service

**Get Products:**
```graphql
query {
  products(limit: 10) {
    id
    name
    slug
    price
    stock
    inStock
    rating
    images
  }
}
```

**Create Product (Admin):**
```graphql
mutation {
  createProduct(input: {
    name: "Wireless Headphones"
    sku: "WH-1000"
    price: 299.99
    stock: 50
    category: "Electronics"
    description: "Premium wireless headphones"
  }) {
    id
    name
    price
  }
}
```

### Order Service

**Create Order:**
```graphql
mutation {
  createOrder(input: {
    items: [
      { productId: "prod_123", quantity: 2, price: 299.99 }
    ]
    shippingAddress: {
      street: "123 Main St"
      city: "San Francisco"
      state: "CA"
      country: "USA"
      postalCode: "94102"
    }
    customerEmail: "john@example.com"
  }) {
    id
    orderNumber
    total
    status
  }
}
```

**Get Order:**
```graphql
query {
  order(id: "order_123") {
    id
    orderNumber
    status
    items {
      productId
      quantity
      price
    }
    total
    trackingNumber
  }
}
```

### Payment Service

**Process Payment:**
```graphql
mutation {
  processPayment(input: {
    orderId: "order_123"
    amount: 599.98
    method: "CREDIT_CARD"
    provider: "STRIPE"
  }) {
    id
    status
    transactionId
  }
}
```

**Get Payment:**
```graphql
query {
  payment(id: "pay_123") {
    id
    orderId
    amount
    status
    method
    completedAt
  }
}
```

## Configuration

### Environment Variables

Create `.env` file in each service directory:

```bash
# Service Configuration
NODE_ENV=development
PORT=4001

# Database
DB_TYPE=mongodb
DATABASE_URL=mongodb://localhost:27017/ecommerce_users

# Event Bus (NATS)
EVENT_BUS_TYPE=nats
NATS_SERVERS=nats://localhost:4222

# Tracing
TRACING_ENABLED=true
TRACING_PROVIDER=opentelemetry
OTLP_ENDPOINT=http://localhost:4318/v1/traces
TRACE_SAMPLE_RATE=1.0

# Metrics
METRICS_ENABLED=true
METRICS_PORT=9091

# Cache (Redis)
CACHE_ENABLED=true
REDIS_URL=redis://localhost:6379

# Security (User Service)
JWT_SECRET=your-secret-key-change-in-production

# Payment Providers (Payment Service)
STRIPE_ENABLED=true
STRIPE_SECRET_KEY=sk_test_...
PAYPAL_ENABLED=false
```

### Switch to MongoDB

```bash
# Start MongoDB
docker run -d --name mongodb -p 27017:27017 mongo:latest

# Update each service's .env
DB_TYPE=mongodb
DATABASE_URL=mongodb://localhost:27017/ecommerce_users
```

### Add Redis Cache

```bash
# Start Redis
docker run -d --name redis -p 6379:6379 redis:latest

# Update .env
CACHE_ENABLED=true
CACHE_TYPE=redis
REDIS_URL=redis://localhost:6379
```

## Development Workflow

### 1. Define Entity

Edit entity file (e.g., `services/product-service/src/entity/Product.js`):

```javascript
/**
 * @type {boolean}
 * @required
 * @default false
 */
featured
```

### 2. Sync Entity

```bash
cd services/product-service
npm run sync:entity Product
```

This generates:
- GraphQL schema updates
- Database migration
- Type definitions

### 3. Run Migration

```bash
npm run migrate:up
```

### 4. Test Changes

```bash
npm run dev
```

Open GraphQL Playground at http://localhost:4002/graphql

### 5. View Traces

Open Jaeger UI at http://localhost:16686 to see traces

## Testing

```bash
# Run all service tests
npm run test:all

# Test specific service
cd services/user-service
npm test

# Integration tests (requires all services running)
npm run test:integration

# E2E tests
npm run test:e2e
```

## Deployment

### Docker Compose

```bash
# Build all services
docker-compose build

# Run all services + dependencies
docker-compose up -d

# View logs
docker-compose logs -f

# Scale a service
docker-compose up -d --scale product-service=3
```

### Kubernetes

```bash
# Deploy to Kubernetes
kubectl apply -f k8s/

# Check status
kubectl get pods
kubectl get services

# View logs
kubectl logs -f deployment/user-service

# Port forward to access locally
kubectl port-forward svc/user-service 4001:4001
```

## Monitoring & Observability

### Metrics (Prometheus)

Each service exposes Prometheus metrics:

```bash
# User Service metrics
curl http://localhost:9091/metrics

# Product Service metrics
curl http://localhost:9092/metrics
```

Configure Prometheus to scrape:

```yaml
scrape_configs:
  - job_name: 'user-service'
    static_configs:
      - targets: ['localhost:9091']
  - job_name: 'product-service'
    static_configs:
      - targets: ['localhost:9092']
  - job_name: 'order-service'
    static_configs:
      - targets: ['localhost:9093']
  - job_name: 'payment-service'
    static_configs:
      - targets: ['localhost:9094']
```

### Traces (Jaeger)

View distributed traces:

1. Open http://localhost:16686
2. Select service from dropdown
3. Click "Find Traces"
4. Analyze trace timeline

### Logs

Structured JSON logging:

```bash
# View logs for all services
docker-compose logs -f

# Filter by service
docker-compose logs -f user-service

# Follow logs in Kubernetes
kubectl logs -f deployment/user-service
```

## Project Structure

```
ecommerce-microservices/
├── docker-compose.yml
├── k8s/
│   ├── user-service.yaml
│   ├── product-service.yaml
│   ├── order-service.yaml
│   └── payment-service.yaml
├── services/
│   ├── user-service/
│   │   ├── boilerplate.config.js   # Service configuration
│   │   ├── package.json
│   │   └── src/
│   │       ├── entity/
│   │       │   └── User.js         # 👈 Entity definition
│   │       └── index.js
│   ├── product-service/
│   │   ├── boilerplate.config.js
│   │   └── src/
│   │       └── entity/
│   │           └── Product.js      # 👈 Entity definition
│   ├── order-service/
│   │   ├── boilerplate.config.js
│   │   └── src/
│   │       └── entity/
│   │           └── Order.js        # 👈 Entity definition
│   └── payment-service/
│       ├── boilerplate.config.js
│       └── src/
│           └── entity/
│               └── Payment.js      # 👈 Entity definition
└── README.md
```

## Troubleshooting

### Services Can't Communicate

Check NATS connection:
```bash
# Verify NATS is running
docker ps | grep nats

# Check service logs for connection errors
docker-compose logs | grep "NATS"
```

### Tracing Not Working

Check OpenTelemetry endpoint:
```bash
# Verify Jaeger is running
curl http://localhost:4318/v1/traces

# Check if tracing is enabled
echo $TRACING_ENABLED
```

### Database Connection Issues

```bash
# Check MongoDB
docker ps | grep mongo
docker logs mongodb

# Test connection
mongo mongodb://localhost:27017
```

## Learn More

- [Entity-First Development Guide](../../docs/ENTITY_FIRST.md)
- [Distributed Tracing Guide](../../docs/TRACING.md)
- [Microservices Patterns](../../docs/MICROSERVICES.md)
- [Event-Driven Architecture](../../docs/EVENTS.md)

## License

ISC

---

**Built with ❤️ using @dualitysol/boilerplate**
