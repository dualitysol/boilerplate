# GraphQL Schema-Based Validation

Автоматическая валидация на основе GraphQL схемы - **NO DUPLICATION!**

## Концепция

Определите правила валидации **ОДИН РАЗ** в GraphQL схеме, используйте их **ВЕЗДЕ**:
- GraphQL resolvers
- REST API handlers
- Event handlers
- Queue processors
- Inter-service calls

## Быстрый старт

### 1. Определите схему с @constraint директивой

```graphql
# services/UserService/typeDefinitions/index.gql

directive @constraint(
  # String constraints
  minLength: Int
  maxLength: Int
  pattern: String
  format: String
  
  # Number constraints
  min: Float
  max: Float
  exclusiveMin: Float
  exclusiveMax: Float
  
  # Array constraints
  minItems: Int
  maxItems: Int
  uniqueItems: Boolean
) on INPUT_FIELD_DEFINITION | FIELD_DEFINITION

# Custom scalars with built-in validation
scalar Email
scalar URL
scalar DateTime
scalar UUID
scalar PhoneNumber

input CreateUserInput {
  # Required field (!) + email validation
  email: Email!
  
  # String with length constraints
  name: String! @constraint(minLength: 2, maxLength: 100)
  
  # String with pattern matching
  username: String! @constraint(
    minLength: 3, 
    maxLength: 20,
    pattern: "^[a-zA-Z0-9_]+$"
  )
  
  # Number with range
  age: Int @constraint(min: 0, max: 150)
  
  # Optional URL
  website: URL
  
  # Array with size constraints
  tags: [String!] @constraint(minItems: 1, maxItems: 10)
  
  # Password with format
  password: String! @constraint(
    minLength: 8,
    maxLength: 128,
    pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$"
  )
}

input UpdateUserInput {
  name: String @constraint(minLength: 2, maxLength: 100)
  age: Int @constraint(min: 0, max: 150)
  website: URL
}

type Mutation {
  createUser(input: CreateUserInput!): UserResponse!
  updateUser(id: ID!, input: UpdateUserInput!): UserResponse!
}
```

### 2. Регистрируйте схему в сервисе

```javascript
// services/UserService/service/UserService.js

import { Microservice } from '@dualitysol/boilerplate';
import { ValidateInput, registerSchema } from '@dualitysol/boilerplate/validation';
import typeDefs from '../typeDefinitions/index.gql';

export class UserService extends Microservice {
  async initialize() {
    // Register schema for automatic validation
    registerSchema('UserService', typeDefs);
    
    this.info('UserService initialized with schema validation');
  }

  /**
   * Create user - automatically validated against CreateUserInput
   * @param {Object} input - User data
   */
  @ValidateInput('CreateUserInput')
  async createUser(input) {
    // ✅ input is already validated!
    // - email is valid email format
    // - name is 2-100 characters
    // - username matches pattern
    // - age is 0-150 (if provided)
    // - password meets complexity requirements
    
    return await this.createOne(input);
  }

  /**
   * Update user
   */
  @ValidateInput('UpdateUserInput')
  async updateUser(id, input) {
    // ✅ Validated against UpdateUserInput
    return await this.updateOne({ _id: id }, input);
  }
}
```

### 3. Используйте везде без дублирования

```javascript
// ✅ GraphQL Resolver - просто делегирует
export const resolvers = {
  Mutation: {
    createUser: async (_parent, { input }, { services }) => {
      // Валидация уже в сервисе!
      return services.UserService.createUser(input);
    }
  }
};

// ✅ REST API - просто делегирует
app.post('/users', async (req, res) => {
  try {
    const user = await services.UserService.createUser(req.body);
    res.json(user);
  } catch (error) {
    if (error.name === 'ValidationError') {
      res.status(400).json(error.toJSON());
    }
  }
});

// ✅ Event Handler - просто делегирует
eventBus.on('user.import', async (data) => {
  try {
    await services.UserService.createUser(data);
  } catch (error) {
    logger.error('Import validation failed:', error.errors);
  }
});

// ✅ Queue Handler - просто делегирует
queueManager.process('user-registration', async (job) => {
  return await services.UserService.createUser(job.data);
});
```

## Автоматическая валидация с @AutoValidate

Для стандартных имен методов используйте `@AutoValidate()`:

```javascript
export class UserService extends Microservice {
  /**
   * Auto-detects CreateUserInput from method name
   */
  @AutoValidate()
  async createUser(input) {
    return await this.createOne(input);
  }

  /**
   * Auto-detects UpdateUserInput
   */
  @AutoValidate()
  async updateUser(id, input) {
    return await this.updateOne({ _id: id }, input);
  }
}
```

## Поддерживаемые ограничения

### String

```graphql
input Example {
  # Length
  field: String @constraint(minLength: 2, maxLength: 100)
  
  # Pattern (regex)
  field: String @constraint(pattern: "^[A-Z][a-z]+$")
  
  # Format
  field: String @constraint(format: "email")
  field: String @constraint(format: "url")
  field: String @constraint(format: "uuid")
  field: String @constraint(format: "ipv4")
}
```

### Number (Int/Float)

```graphql
input Example {
  # Range (inclusive)
  age: Int @constraint(min: 0, max: 150)
  
  # Range (exclusive)
  temperature: Float @constraint(
    exclusiveMin: -273.15,  # > -273.15
    exclusiveMax: 1000      # < 1000
  )
}
```

### Array

```graphql
input Example {
  # Size constraints
  tags: [String!] @constraint(minItems: 1, maxItems: 10)
  
  # Unique items
  emails: [Email!] @constraint(uniqueItems: true)
}
```

### Custom Scalars (Built-in Validation)

```graphql
scalar Email        # email format
scalar URL          # valid URL
scalar DateTime     # ISO 8601 datetime
scalar Date         # YYYY-MM-DD
scalar Time         # HH:MM:SS
scalar UUID         # UUID v4
scalar PhoneNumber  # international format
scalar PostalCode   # postal code
scalar JSON         # valid JSON
```

## Примеры использования

### Todo Service с валидацией

**GraphQL Schema:**
```graphql
scalar DateTime

directive @constraint(
  minLength: Int
  maxLength: Int
  min: Int
  max: Int
  minItems: Int
  maxItems: Int
) on INPUT_FIELD_DEFINITION

input CreateTodoInput {
  title: String! @constraint(minLength: 3, maxLength: 200)
  description: String @constraint(maxLength: 1000)
  priority: Int @constraint(min: 1, max: 5)
  tags: [String!] @constraint(minItems: 0, maxItems: 10)
  dueDate: DateTime
}

input UpdateTodoInput {
  title: String @constraint(minLength: 3, maxLength: 200)
  description: String @constraint(maxLength: 1000)
  priority: Int @constraint(min: 1, max: 5)
  completed: Boolean
}

input TodoFilter {
  completed: Boolean
  priority: Int @constraint(min: 1, max: 5)
  tags: [String!]
  limit: Int @constraint(min: 1, max: 100)
  skip: Int @constraint(min: 0)
}
```

**Service with Auto-Validation:**
```javascript
import { registerSchema, AutoValidate } from '@dualitysol/boilerplate/validation';
import typeDefs from '../typeDefinitions/index.gql';

export class TodoService extends Microservice {
  async initialize() {
    registerSchema('TodoService', typeDefs);
  }

  @AutoValidate()
  async createTodo(input) {
    // ✅ Validated:
    // - title: 3-200 chars
    // - description: max 1000 chars
    // - priority: 1-5
    // - tags: 0-10 items
    
    return await this.createOne(input);
  }

  @AutoValidate()
  async updateTodo(id, input) {
    // ✅ Same constraints
    return await this.updateOne({ _id: id }, input);
  }

  @ValidateInput('TodoFilter')
  async getTodos(filter) {
    // ✅ Filter validated:
    // - priority: 1-5
    // - limit: 1-100
    // - skip: >= 0
    
    return await this.findMany(filter);
  }
}
```

## Обработка ошибок валидации

### В GraphQL

```javascript
import { ValidationError } from '@dualitysol/boilerplate/validation';

export const resolvers = {
  Mutation: {
    createUser: async (_parent, { input }, { services }) => {
      try {
        return await services.UserService.createUser(input);
      } catch (error) {
        if (error instanceof ValidationError) {
          // GraphQL автоматически обработает
          throw error;
        }
        throw error;
      }
    }
  }
};
```

### В REST API

```javascript
app.post('/users', async (req, res) => {
  try {
    const user = await services.UserService.createUser(req.body);
    res.json(user);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: error.message,
        validationErrors: error.errors
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Пример ответа:**
```json
{
  "error": "Validation failed for CreateUserInput",
  "statusCode": 400,
  "validationErrors": [
    {
      "field": "email",
      "constraint": "email",
      "message": "email must be a valid email address"
    },
    {
      "field": "age",
      "constraint": "max",
      "message": "age must be at most 150"
    },
    {
      "field": "password",
      "constraint": "pattern",
      "message": "password does not match required pattern"
    }
  ]
}
```

## Программная валидация

Без декораторов:

```javascript
import { validate } from '@dualitysol/boilerplate/validation';

// Manual validation
try {
  validate('UserService', 'CreateUserInput', userData);
  // Validation passed
} catch (error) {
  console.error('Validation failed:', error.errors);
}

// Or get validator directly
import { getValidator } from '@dualitysol/boilerplate/validation';

const validator = getValidator('UserService');
const result = validator.validate('CreateUserInput', userData);

if (!result.valid) {
  console.error(result.errors);
}
```

## Расширение кастомными валидаторами

```javascript
import { GraphQLSchemaValidator } from '@dualitysol/boilerplate/validation';

// Extend validator
class CustomValidator extends GraphQLSchemaValidator {
  // Add custom scalar
  validateCreditCard(fieldName, value) {
    // Luhn algorithm
    const isValid = this.luhnCheck(value);
    if (!isValid) {
      return {
        field: fieldName,
        constraint: 'creditCard',
        message: `${fieldName} must be a valid credit card number`
      };
    }
  }
  
  luhnCheck(cardNumber) {
    // Implementation
  }
}

// Register custom validator
registerSchema('PaymentService', typeDefs, CustomValidator);
```

## Преимущества подхода

### ✅ Без дублирования
```graphql
# Определяете ОДИН РАЗ в схеме
input CreateUserInput {
  email: Email!
  age: Int @constraint(min: 0, max: 150)
}
```

### ✅ Работает везде
- GraphQL ✓
- REST API ✓
- Events ✓
- Queues ✓
- Inter-service ✓

### ✅ Единый источник правды
Схема = документация = валидация = типы

### ✅ Декларативно
Правила видны в схеме, не скрыты в коде

### ✅ Обратная совместимость
Работает с существующими GraphQL схемами

### ✅ Расширяемо
Легко добавить кастомные валидаторы

## Миграция

### Было (дублирование)

```graphql
# schema.gql
input CreateUserInput {
  email: String!
  age: Int
}
```

```javascript
// service.js
async createUser(input) {
  // Ручная валидация
  if (!isEmail(input.email)) throw new Error('Invalid email');
  if (input.age < 0 || input.age > 150) throw new Error('Invalid age');
  
  return await this.createOne(input);
}
```

### Стало (без дублирования)

```graphql
# schema.gql
scalar Email

input CreateUserInput {
  email: Email!
  age: Int @constraint(min: 0, max: 150)
}
```

```javascript
// service.js
@AutoValidate()
async createUser(input) {
  // Валидация автоматическая!
  return await this.createOne(input);
}
```

## Итого

🎯 **Одна схема → Валидация везде → Меньше кода → Меньше ошибок**
