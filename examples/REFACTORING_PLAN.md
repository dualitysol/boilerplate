# Complete Examples Refactoring Plan

## Goal
Refactor all examples to follow proper architecture with generic typing:
**Query/Mutation → Resolver → Service → Model → Entity**

## Progress Tracking

### Todo App Monolith Example

#### TodoService
- ✅ Entity (Todo.js) - Added validate(), beforeInsert() methods
- ✅ Service (TodoService.js) - Complete business logic layer with generics
- ✅ Resolvers (index.js) - Thin delegation layer
- ✅ GraphQL Schema (index.gql) - Updated with descriptions, interface, new queries
- ⏳ Model (index.js) - Needs update to remove business logic
- ⏳ Integration - Wire service into bootstrap

#### UserService  
- ✅ Entity (User.js) - Already has validation methods
- ✅ Service (UserService.js) - Complete business logic with generics
- ⏳ Resolvers (index.js) - Need to update to delegate to service
- ⏳ GraphQL Schema (index.gql) - Need to add descriptions and generics
- ⏳ Model (index.js) - Needs update
- ⏳ Integration

#### NotificationService
- ✅ Entity (Notification.js) - Already created
- ⏳ Service (NotificationService.js) - Need to create
- ⏳ Resolvers (index.js) - Need to update
- ⏳ GraphQL Schema (index.gql) - Need to update
- ⏳ Model (index.js) - Need to update
- ⏳ Integration

#### Bootstrap Integration
- ⏳ Update index.js to wire services
- ⏳ Update context creation
- ⏳ Add service registry

---

### E-commerce Microservices Example

#### User Service
- ✅ Entity (User.js) - Complete with all methods
- ✅ Config (boilerplate.config.js) - Complete with tracing
- ⏳ Service class - Need to create
- ⏳ Resolvers - Need to create
- ⏳ GraphQL Schema - Need to create
- ⏳ Model - Need to create
- ⏳ Bootstrap - Need to create

#### Product Service
- ✅ Entity (Product.js) - Complete with inventory management
- ✅ Config (boilerplate.config.js) - Complete
- ⏳ Service class - Need to create
- ⏳ Resolvers - Need to create
- ⏳ GraphQL Schema - Need to create
- ⏳ Model - Need to create
- ⏳ Bootstrap - Need to create

#### Order Service
- ✅ Entity (Order.js) - Complete with order workflow
- ✅ Config (boilerplate.config.js) - Complete
- ⏳ Service class - Need to create
- ⏳ Resolvers - Need to create
- ⏳ GraphQL Schema - Need to create
- ⏳ Model - Need to create
- ⏳ Bootstrap - Need to create

#### Payment Service
- ✅ Entity (Payment.js) - Complete with refund logic
- ✅ Config (boilerplate.config.js) - Complete
- ⏳ Service class - Need to create
- ⏳ Resolvers - Need to create
- ⏳ GraphQL Schema - Need to create
- ⏳ Model - Need to create
- ⏳ Bootstrap - Need to create

---

### Other Examples

#### Quickstart
- ⏳ Update to follow proper architecture
- ⏳ Add entity-first approach
- ⏳ Add service layer

#### TypeScript Example
- ⏳ Create complete TypeScript example
- ⏳ Full generic typing
- ⏳ Decorators with TypeScript
- ⏳ Type-safe service registry

#### Kubernetes Example
- ⏳ Update with proper architecture
- ⏳ Add health checks
- ⏳ Add tracing configuration

#### AWS Lambda Example
- ⏳ Update with service layer
- ⏳ Serverless configuration
- ⏳ Lambda handlers with proper delegation

---

## Architecture Pattern (MUST FOLLOW)

### Layer Responsibilities

1. **Entity Layer** (`entity/`)
   - Data model definition with JSDoc
   - Validation logic
   - Business domain methods
   - Lifecycle hooks
   - NO database access
   - NO external service calls

2. **Model Layer** (`model/`)
   - CRUD operations via storage
   - Database queries
   - Data transformation
   - NO business logic
   - NO authorization checks

3. **Service Layer** (`service/`)
   - Business logic
   - Authorization checks
   - Entity validation
   - Service-to-service calls
   - Event publishing
   - Uses Model for data access
   - Uses Entity for domain logic

4. **Resolver Layer** (`resolvers/`)
   - GraphQL field resolution
   - Authentication checks
   - Response formatting
   - Delegates to Service
   - NO business logic
   - NO direct model access

5. **Query/Mutation Layer** (`queryMutation/`)
   - GraphQL query helpers
   - Example queries
   - Documentation

### Generic Typing Pattern

```javascript
/**
 * @template T
 * @param {string} id
 * @returns {Promise<T extends Entity>}
 */
async getById(id) {
  const data = await this.model.findById(id);
  return new Entity(data);
}
```

### Resolver Pattern

```javascript
Query: {
  item: async (_, { id }, { service }) => {
    return await service.getById(id);
  }
}
```

### Service Pattern

```javascript
async create(input, userId) {
  // 1. Validate input
  this.validateInput(input);
  
  // 2. Create entity
  const entity = new Entity({ ...input, userId });
  
  // 3. Validate entity
  const errors = entity.validate();
  if (errors.length > 0) throw new Error(errors.join(', '));
  
  // 4. Lifecycle hook
  if (entity.beforeInsert) entity.beforeInsert();
  
  // 5. Save via model
  const saved = await this.model.create(entity);
  
  // 6. Publish event
  await this.eventBus.publish('entity.created', { id: saved.id });
  
  // 7. Return entity
  return new Entity(saved);
}
```

---

## Next Steps

1. ✅ Complete TodoService refactoring
2. ⏳ Complete UserService refactoring
3. ⏳ Complete NotificationService refactoring
4. ⏳ Update todo-app-monolith bootstrap
5. ⏳ Test todo-app-monolith end-to-end
6. ⏳ Create complete e-commerce microservices
7. ⏳ Update other examples

---

## Completion Criteria

- [ ] All services follow Service → Model → Entity pattern
- [ ] No business logic in resolvers
- [ ] All resolvers are thin delegation layers
- [ ] All services have generic typing
- [ ] All entities have validate() method
- [ ] All GraphQL schemas have descriptions
- [ ] Bootstrap properly wires services
- [ ] All examples are fully functional
- [ ] Documentation is complete

---

Last Updated: December 4, 2025
