# Bootstrap Architecture

## Обзор

Bootstrap - это универсальный механизм инициализации приложений, который позволяет создавать монолиты, микросервисы и serverless функции с одинаковой структурой кода. Вся инфраструктура настраивается через конфигурационный файл `boilerplate.config.js`.

## Ключевые Принципы

### 1. Единая Структура Сервисов

Независимо от типа развертывания (монолит, микросервисы, Lambda), все сервисы имеют одинаковую структуру:

```
ServiceName/
├── model/              # Бизнес-логика
│   └── index.ts
├── resolvers/          # GraphQL резолверы
│   └── index.ts
├── queryMutation/      # GraphQL операции
│   └── index.ts
├── typeDefinitions/    # GraphQL схемы
│   └── index.gql
├── tests/              # Тесты
│   └── service.test.ts
└── README.md           # Документация
```

### 2. Конфигурация через boilerplate.config.js

Все различия в инфраструктуре описываются в конфигурационном файле:

```javascript
export default {
  // Тип проекта
  type: 'monolith', // 'monolith' | 'microservices' | 'serverless'
  
  // Сервисы
  services: {
    autoDiscover: true,
    path: './services'
  },
  
  // Транспорт
  transport: {
    type: 'http',
    config: { port: 4000 }
  },
  
  // Шина событий
  eventBus: {
    type: 'local'
  },
  
  // Базы данных
  databases: {
    primary: {
      type: 'postgres',
      config: { /* ... */ }
    }
  },
  
  // GraphQL
  graphql: {
    mode: 'monolith'
  }
}
```

### 3. Универсальная Точка Входа

Все проекты запускаются через одинаковый `index.js`:

```javascript
import { bootstrap } from '@dualitysol/boilerplate/src/bootstrap';

// Универсальный запуск
bootstrap().catch(error => {
  console.error('Failed to start:', error);
  process.exit(1);
});
```

## Архитектура Bootstrap

### Процесс Инициализации

```
1. loadConfig()           - Загрузка boilerplate.config.js
2. initializeEventBus()   - Инициализация шины событий (local/nats/redis/kafka)
3. initializeQueue()      - Инициализация очередей (local/redis/rabbitmq/sqs)
4. initializeDatabase()   - Подключение к базам данных
5. initializeCache()      - Инициализация кеша
6. discoverServices()     - Автоматическое обнаружение сервисов
7. loadService()          - Загрузка каждого сервиса
8. initializeTransport()  - Инициализация транспорта (http/ws/grpc/nats)
9. setupGraphQL()         - Объединение GraphQL схем и резолверов
10. start()               - Запуск приложения
```

### Dependency Injection

Bootstrap автоматически внедряет зависимости в каждый сервис:

```javascript
const service = new ServiceModel({
  storage,      // База данных
  eventBus,     // Шина событий
  queueManager, // Менеджер очередей
  cache,        // Кеш
  logger,       // Логгер
  config        // Конфигурация
});
```

### Auto-Discovery Сервисов

Bootstrap автоматически находит и загружает сервисы из директории `services/`:

```
services/
├── UserService/
│   ├── model/
│   ├── resolvers/
│   └── ...
├── OrderService/
│   ├── model/
│   ├── resolvers/
│   └── ...
└── PaymentService/
    ├── model/
    ├── resolvers/
    └── ...
```

Каждый сервис автоматически:
- Инициализируется с правильными зависимостями
- Регистрируется в GraphQL схеме
- Получает доступ к другим сервисам через `this.services`

## Типы Развертывания

### Монолит (Monolith)

**boilerplate.config.js:**
```javascript
{
  type: 'monolith',
  transport: { type: 'http', config: { port: 4000 } },
  eventBus: { type: 'local' },
  queue: { type: 'local' },
  databases: { primary: { type: 'postgres' } },
  graphql: { mode: 'monolith' }
}
```

**Запуск:**
```bash
npm start
# Один процесс, все сервисы в памяти
```

### Микросервисы (Microservices)

**boilerplate.config.js:**
```javascript
{
  type: 'microservices',
  transport: { type: 'nats' },
  eventBus: { type: 'nats' },
  queue: { type: 'redis' },
  databases: { primary: { type: 'postgres' } },
  graphql: { mode: 'federated' }
}
```

**Запуск:**
```bash
# Каждый сервис в отдельном процессе
npm run start:user-service
npm run start:order-service
npm run start:payment-service
```

### Serverless (AWS Lambda)

**boilerplate.config.js:**
```javascript
{
  type: 'serverless',
  transport: { type: 'lambda' },
  eventBus: { type: 'sqs' },
  queue: { type: 'sqs' },
  databases: { primary: { type: 'dynamodb' } },
  graphql: { mode: 'federated' }
}
```

**Развертывание:**
```bash
npm run deploy:lambda
# Каждый сервис → отдельная Lambda функция
```

## Преимущества Подхода

### 1. Консистентность

- Разработчики всегда работают с одной и той же структурой
- Легко переключаться между проектами
- Единый подход к тестированию

### 2. Гибкость

- Начните с монолита
- Мигрируйте в микросервисы по мере роста
- Развертывайте в serverless при необходимости
- Изменяется только `boilerplate.config.js`

### 3. Переиспользование Кода

- Один и тот же код работает везде
- Сервисы не зависят от инфраструктуры
- Легко тестировать локально

### 4. Автоматизация

- Auto-discovery сервисов
- Автоматическое внедрение зависимостей
- Автоматическая агрегация GraphQL схем

## Примеры Использования

### Создание Нового Сервиса

```bash
npx @dualitysol/boilerplate-cli generate service ProductService
```

Создаст структуру:
```
services/ProductService/
├── model/index.ts              # Бизнес-логика
├── resolvers/index.ts          # GraphQL резолверы
├── queryMutation/index.ts      # Операции
├── typeDefinitions/index.gql   # Схема
└── tests/service.test.ts       # Тесты
```

### Бизнес-Логика (model/index.ts)

```typescript
export class ProductModel {
  constructor({ storage, eventBus, queueManager }) {
    this.storage = storage;
    this.eventBus = eventBus;
    this.queueManager = queueManager;
  }

  async initialize() {
    // Подписка на события
    await this.eventBus.subscribe('order.created', async (data) => {
      await this.handleOrderCreated(data);
    });
  }

  async create(data) {
    const product = await this.storage.insertOne('products', data);
    await this.eventBus.publish('product.created', product);
    return product;
  }
}
```

### GraphQL Резолверы (resolvers/index.ts)

```typescript
export const resolvers = {
  Query: {
    product: async (_, { id }, { model }) => {
      return await model.findById(id);
    }
  },
  
  Mutation: {
    createProduct: async (_, { input }, { model }) => {
      return await model.create(input);
    }
  }
};
```

### GraphQL Схема (typeDefinitions/index.gql)

```graphql
type Product {
  id: ID!
  name: String!
  price: Float!
  createdAt: String!
}

input ProductInput {
  name: String!
  price: Float!
}

type Query {
  product(id: ID!): Product
  products: [Product!]!
}

type Mutation {
  createProduct(input: ProductInput!): Product!
}
```

## Миграция Существующих Проектов

### Автоматическая Миграция

```bash
node bin/migrate-to-unified.js ./services/OldService
```

### Ручная Миграция

1. Создайте новую структуру папок
2. Переместите бизнес-логику → `model/`
3. Переместите резолверы → `resolvers/`
4. Переместите схемы → `typeDefinitions/`
5. Создайте `boilerplate.config.js`

## Лучшие Практики

### 1. Разделение Ответственности

- **model/** - только бизнес-логика
- **resolvers/** - только GraphQL маппинг
- **typeDefinitions/** - только схемы

### 2. Dependency Injection

Всегда используйте DI, никогда не импортируйте зависимости напрямую:

```typescript
// ✅ Правильно
class ProductModel {
  constructor({ storage, eventBus }) {
    this.storage = storage;
    this.eventBus = eventBus;
  }
}

// ❌ Неправильно
import { storage } from '../infrastructure/storage';
```

### 3. Конфигурация

Держите всю инфраструктуру в `boilerplate.config.js`:

```javascript
// ✅ Правильно - в конфиге
{
  transport: { type: 'nats' }
}

// ❌ Неправильно - хардкод в коде
const nats = connect('nats://localhost:4222');
```

### 4. Тестирование

Тестируйте бизнес-логику независимо от инфраструктуры:

```typescript
test('should create product', async () => {
  const mockStorage = { insertOne: jest.fn() };
  const model = new ProductModel({ storage: mockStorage });
  
  await model.create({ name: 'Test' });
  
  expect(mockStorage.insertOne).toHaveBeenCalled();
});
```

## Конфигурационный Файл

### Полный Пример

См. `boilerplate.config.js` для полного примера всех опций.

### Секции Конфигурации

1. **project** - метаданные проекта
2. **services** - настройки сервисов
3. **transport** - тип транспорта
4. **eventBus** - шина событий
5. **queue** - очереди
6. **databases** - базы данных
7. **graphql** - настройки GraphQL
8. **runtime** - среда выполнения
9. **build** - настройки сборки
10. **features** - функциональные флаги

## Troubleshooting

### Сервис не Обнаруживается

Убедитесь что:
- Папка находится в `services/`
- Есть `model/index.ts` или `model/index.js`
- Экспорт - дефолтный класс

### Зависимости Undefined

Проверьте:
- `boilerplate.config.js` правильно настроен
- Bootstrap успешно инициализировал инфраструктуру
- Конструктор принимает зависимости

### GraphQL Схема Не Объединяется

Убедитесь:
- `typeDefinitions/index.gql` существует
- Файл содержит валидный GraphQL
- Нет конфликтов типов между сервисами

## Дополнительно

- [Примеры проектов](../examples/README.md)
- [API Reference](./API.md)
- [Migration Guide](./MIGRATION.md)
