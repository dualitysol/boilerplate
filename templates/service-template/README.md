# {{ServiceName}} Service

{{ServiceName}} service description

## Structure

```
{{ServiceName}}/
├── model/              # Business logic and data models
│   └── index.ts
├── resolvers/          # GraphQL resolvers
│   └── index.ts
├── queryMutation/      # GraphQL operations (queries/mutations)
│   └── index.ts
├── typeDefinitions/    # GraphQL schema
│   └── index.gql
├── tests/              # Unit tests
│   └── service.test.ts
└── README.md           # Service documentation
```

## Usage

### Model (Business Logic)

```typescript
import { {{ServiceName}}Model } from './model';

const model = new {{ServiceName}}Model({
  storage,
  eventBus,
  queueManager
});

await model.initialize();

// CRUD operations
const item = await model.create({ name: 'Example' });
const found = await model.findById(item.id);
const all = await model.findAll({ filter: 'value' });
await model.update(item.id, { name: 'Updated' });
await model.delete(item.id);
```

### GraphQL Resolvers

Resolvers are automatically integrated into the GraphQL schema via Bootstrap.

### Events

Service publishes the following events:
- `{{serviceName}}.created` - when a record is created
- `{{serviceName}}.updated` - when a record is updated
- `{{serviceName}}.deleted` - when a record is deleted

## Testing

```bash
npm test
```

## Dependencies

Service requires:
- `storage` - database (PostgreSQL, MongoDB, Memory)
- `eventBus` - event bus (Local, NATS, Redis, Kafka)
- `queueManager` - queue manager (Local, Redis, RabbitMQ, SQS)

Dependencies are automatically initialized via `boilerplate.config.js`.
