# Quick Start Guide - E-commerce Microservices

Get the full e-commerce platform running in 5 minutes with distributed tracing and metrics!

## 🚀 Option 1: Docker Compose (Recommended)

### Prerequisites
- Docker and Docker Compose installed

### Run Everything
```bash
# Clone and navigate to example
cd examples/ecommerce-microservices

# Start all services + infrastructure
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Access Services
- **User Service GraphQL**: http://localhost:4001/graphql
- **Product Service GraphQL**: http://localhost:4002/graphql
- **Order Service GraphQL**: http://localhost:4003/graphql
- **Payment Service GraphQL**: http://localhost:4004/graphql

### Access Observability
- **Jaeger UI (Traces)**: http://localhost:16686
- **Prometheus (Metrics)**: http://localhost:9090
- **Grafana (Dashboards)**: http://localhost:3000 (admin/admin)

### Stop Everything
```bash
docker-compose down

# Remove volumes
docker-compose down -v
```

---

## 💻 Option 2: Local Development

### Prerequisites
- Node.js 18+
- NATS running locally
- MongoDB running locally (optional)
- Jaeger running locally (optional)

### 1. Start Infrastructure

```bash
# NATS for event bus
docker run -d --name nats -p 4222:4222 nats:latest

# Jaeger for tracing (optional but recommended)
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest

# MongoDB (optional - services use memory by default)
docker run -d --name mongodb -p 27017:27017 mongo:latest

# Redis (optional - for caching)
docker run -d --name redis -p 6379:6379 redis:alpine
```

### 2. Install Dependencies

```bash
# Option A: Install all at once
npm run install:all

# Option B: Install per service
cd services/user-service && npm install
cd ../product-service && npm install
cd ../order-service && npm install
cd ../payment-service && npm install
```

### 3. Configure Services

Copy `.env.example` to `.env` in each service:

```bash
cd services/user-service && cp .env.example .env
cd ../product-service && cp .env.example .env
cd ../order-service && cp .env.example .env
cd ../payment-service && cp .env.example .env
```

Edit `.env` files to enable features:

```bash
# Enable distributed tracing
TRACING_ENABLED=true
TRACING_PROVIDER=opentelemetry
OTLP_ENDPOINT=http://localhost:4318/v1/traces

# Enable metrics
METRICS_ENABLED=true

# Use NATS for events (if running)
EVENT_BUS_TYPE=nats
NATS_SERVERS=nats://localhost:4222

# Use MongoDB (if running)
DB_TYPE=mongodb
DATABASE_URL=mongodb://localhost:27017/ecommerce_users
```

### 4. Run Services

**Terminal 1 - User Service:**
```bash
cd services/user-service
npm run dev
```

**Terminal 2 - Product Service:**
```bash
cd services/product-service
npm run dev
```

**Terminal 3 - Order Service:**
```bash
cd services/order-service
npm run dev
```

**Terminal 4 - Payment Service:**
```bash
cd services/payment-service
npm run dev
```

**Or run all at once:**
```bash
npm run dev:all
```

---

## 🧪 Test the System

### 1. Register a User

```bash
curl -X POST http://localhost:4001/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { registerUser(input: { username: \"john\", email: \"john@example.com\", password: \"secret123\" }) { success token user { id username } } }"
  }'
```

### 2. Create a Product

```bash
curl -X POST http://localhost:4002/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { createProduct(input: { name: \"Laptop\", sku: \"LAP-001\", price: 999.99, stock: 50, category: \"Electronics\", description: \"High-performance laptop\" }) { id name price } }"
  }'
```

### 3. View Traces

1. Open http://localhost:16686
2. Select "user-service" from dropdown
3. Click "Find Traces"
4. Click on a trace to see the flow

### 4. View Metrics

1. Open http://localhost:9090 (Prometheus)
2. Try queries:
   - `http_requests_total` - Total HTTP requests
   - `graphql_operations_total` - GraphQL operations
   - `service_uptime_seconds` - Service uptime

---

## 📊 Entity-First Workflow

### 1. Modify an Entity

Edit `services/product-service/src/entity/Product.js`:

```javascript
/**
 * @type {string}
 * @maxLength 100
 */
brand  // 👈 Add new field
```

### 2. Sync Entity

```bash
cd services/product-service
npm run sync:entity Product
```

This auto-generates:
- ✅ Updated GraphQL schema
- ✅ Database migration
- ✅ Type definitions

### 3. Run Migration

```bash
npm run migrate:up
```

### 4. Test New Field

```graphql
mutation {
  createProduct(input: {
    name: "Laptop"
    brand: "Dell"  # 👈 New field
    price: 999.99
    # ...
  }) {
    id
    brand
  }
}
```

---

## 🔍 Debugging with Traces

### Example: Order Creation Flow

When creating an order, traces show:

```
1. order-service receives GraphQL request
   └─ Span: GraphQL:createOrder (150ms)
       ├─ Span: OrderService.validateOrder (5ms)
       ├─ Span: Database.insert (10ms)
       └─ Span: EventBus.publish(order.created) (2ms)

2. payment-service handles event
   └─ Span: PaymentService.processPayment (80ms)
       ├─ Span: Stripe.createCharge (60ms)
       ├─ Span: Database.insert (5ms)
       └─ Span: EventBus.publish(payment.completed) (2ms)

3. product-service handles event
   └─ Span: ProductService.updateInventory (20ms)
       ├─ Span: Database.updateOne (15ms)
       └─ Span: EventBus.publish(inventory.updated) (2ms)

Total trace time: 150ms across 3 services
```

View in Jaeger UI to see the complete flow!

---

## 🎯 Next Steps

1. **Explore GraphQL Playgrounds**: Visit each service's `/graphql` endpoint
2. **View Traces**: Open Jaeger UI and explore request flows
3. **Check Metrics**: Open Prometheus and run queries
4. **Modify Entities**: Update entity files and run sync command
5. **Add Business Logic**: Implement custom methods in entities
6. **Deploy**: Use `docker-compose` or Kubernetes for production

---

## 📚 Learn More

- [Full README](./README-NEW.md) - Complete documentation
- [Entity-First Development](../../docs/ENTITY_FIRST.md)
- [Distributed Tracing](../../docs/TRACING.md)
- [Microservices Architecture](../../docs/ARCHITECTURE.md)

---

**Built with ❤️ using @dualitysol/boilerplate**
