# Changelog

## [0.0.1] - 2024-12-02

### Added
- Initial release
- Core Microservice base class with event/queue/storage support
- Bootstrap system for flexible deployment
- Runtime adapters: Local, Lambda, Server, Container, Google Cloud
- Transport layer: HTTP, WebSocket, NATS, Redis, RabbitMQ, ZeroMQ, gRPC
- EventBus with multiple backends
- QueueManager with multiple backends
- Logger with structured logging
- ServiceRegistry for service discovery
- APIGateway for GraphQL schema aggregation
- MongoDB storage implementation
- In-memory cache implementation
- Comprehensive examples for different deployment scenarios
- Full documentation and architecture guide

### Features
- Write once, deploy anywhere
- Transport-agnostic inter-service communication
- Event-driven architecture
- Type-safe service proxies
- Health checks and metrics (Prometheus)
- Graceful shutdown support
- GraphQL out of the box

### Coming Soon
- TypeScript support and type generation
- CLI tool for scaffolding
- PostgreSQL, DynamoDB, ClickHouse support
- GraphQL Federation
- Distributed tracing
- Deployment scripts (Terraform, Pulumi, Kubernetes)
- CI/CD templates
