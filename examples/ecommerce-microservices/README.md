# E-commerce Microservices Example

A complete e-commerce platform built with microservices architecture using the @dualitysol/boilerplate framework.

## Architecture

This example demonstrates a **microservices** architecture where each service runs independently:

- **User Service** (Port 4001) - User authentication and profiles
- **Product Service** (Port 4002) - Product catalog and inventory
- **Order Service** (Port 4003) - Order management and processing
- **Payment Service** (Port 4004) - Payment processing and transactions

## Features

- ✅ Independent deployable services
- ✅ Event-driven communication between services
- ✅ Each service has its own GraphQL API
- ✅ Shared event bus for inter-service communication
- ✅ Message queue for async processing
- ✅ Service discovery and health checks

## Quick Start

### Option 1: Run All Services

```bash
# Install dependencies for all services
npm run install:all

# Run all services concurrently
npm run dev:all
```

### Option 2: Run Services Individually

```bash
# Terminal 1 - User Service
cd services/user-service
npm install
npm run dev

# Terminal 2 - Product Service
cd services/product-service
npm install
npm run dev

# Terminal 3 - Order Service
cd services/order-service
npm install
npm run dev

# Terminal 4 - Payment Service
cd services/payment-service
npm install
npm run dev
```

## Service Endpoints

- **User Service**: http://localhost:4001/graphql
- **Product Service**: http://localhost:4002/graphql
- **Order Service**: http://localhost:4003/graphql
- **Payment Service**: http://localhost:4004/graphql

## Architecture Diagram

```
┌─────────────────┐
│   API Gateway   │ (Optional)
└────────┬────────┘
         │
    ┌────┴────┬──────────┬──────────┐
    │         │          │          │
┌───▼──┐  ┌──▼───┐  ┌──▼───┐  ┌───▼────┐
│ User │  │Product│ │Order │  │Payment │
│Service│ │Service│ │Service│ │Service │
└───┬──┘  └──┬───┘  └──┬───┘  └───┬────┘
    │        │         │          │
    └────────┴─────────┴──────────┘
              │
        ┌─────▼─────┐
        │ Event Bus │
        └───────────┘
```

## Event Flow Example

### Creating an Order:

1. **Client** → Order Service: `createOrder` mutation
2. **Order Service** → Event Bus: Publishes `order.created` event
3. **Payment Service** → Listens to `order.created` → Processes payment
4. **Payment Service** → Event Bus: Publishes `payment.completed` event
5. **Order Service** → Listens to `payment.completed` → Updates order status
6. **Product Service** → Listens to `payment.completed` → Updates inventory

## Sample Queries

### User Service

```graphql
mutation Register {
  registerUser(input: {
    username: "alice"
    email: "alice@example.com"
    password: "secret123"
  }) {
    success
    user { id username }
    token
  }
}
```

### Product Service

```graphql
query GetProducts {
  products {
    id
    name
    price
    stock
  }
}

mutation CreateProduct {
  createProduct(input: {
    name: "Laptop"
    description: "Gaming laptop"
    price: 1299.99
    stock: 10
    category: "electronics"
  }) {
    success
    product { id name price }
  }
}
```

### Order Service

```graphql
mutation CreateOrder {
  createOrder(input: {
    items: [
      { productId: "1", quantity: 2 }
    ]
  }) {
    success
    order {
      id
      totalAmount
      status
      items {
        productId
        quantity
        price
      }
    }
  }
}

query MyOrders {
  myOrders {
    id
    totalAmount
    status
    createdAt
  }
}
```

### Payment Service

```graphql
query GetPayment {
  payment(orderId: "order-123") {
    id
    orderId
    amount
    status
    method
  }
}
```

## Inter-Service Communication

Services communicate via:

1. **Synchronous**: HTTP/GraphQL (for direct queries)
2. **Asynchronous**: Event Bus (for decoupled operations)
3. **Queue**: Message Queue (for background jobs)

Example event flow:

```javascript
// Order Service publishes event
eventBus.publish('order.created', {
  orderId: '123',
  userId: 'user-1',
  items: [...],
  totalAmount: 299.99
});

// Payment Service listens and processes
eventBus.subscribe('order.created', async (order) => {
  const payment = await processPayment(order);
  eventBus.publish('payment.completed', { orderId, payment });
});

// Product Service updates inventory
eventBus.subscribe('payment.completed', async ({ orderId }) => {
  await updateInventory(orderId);
});
```

## Deployment

Each service can be deployed independently:

### Docker

```bash
# Build all services
docker-compose build

# Run all services
docker-compose up
```

### Kubernetes

```bash
# Deploy all services
kubectl apply -f k8s/

# Check status
kubectl get pods
```

### AWS Lambda

Each service can be deployed as a separate Lambda function. See individual service README files.

## Configuration

Each service has its own `.env` file:

```bash
# services/user-service/.env
PORT=4001
SERVICE_NAME=user-service
EVENT_BUS_URL=nats://localhost:4222
DB_URL=postgresql://localhost/users

# services/product-service/.env
PORT=4002
SERVICE_NAME=product-service
EVENT_BUS_URL=nats://localhost:4222
DB_URL=postgresql://localhost/products

# ... etc
```

## Testing

```bash
# Test all services
npm run test:all

# Test individual service
cd services/user-service
npm test
```

## Monitoring

Health check endpoints:

- User Service: http://localhost:4001/health
- Product Service: http://localhost:4002/health
- Order Service: http://localhost:4003/health
- Payment Service: http://localhost:4004/health

## Learn More

- [Microservices Patterns](https://microservices.io/patterns/index.html)
- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)
- [Service Mesh](https://istio.io/latest/docs/concepts/what-is-istio/)

## Project Structure

```
ecommerce-microservices/
├── services/
│   ├── user-service/
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   ├── schema.graphql
│   │   │   └── resolvers.js
│   │   ├── package.json
│   │   └── .env.example
│   ├── product-service/
│   ├── order-service/
│   └── payment-service/
├── docker-compose.yml
├── k8s/
│   ├── user-service.yaml
│   ├── product-service.yaml
│   ├── order-service.yaml
│   └── payment-service.yaml
├── package.json
└── README.md
```
