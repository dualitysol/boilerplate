/**
 * Testing Utilities - Main Export
 * 
 * Comprehensive testing toolkit for microservices
 */

// Testing Utilities
export {
  GraphQLTester,
  QueryAssertion,
  MockService,
  createMockService,
  FixtureManager,
  DataGenerator,
  DatabaseTestHelper,
  IntegrationTestHelper,
  createTestContext,
  waitFor,
  sleep
} from './TestingUtilities.js';

// Factories
export {
  Factory,
  UserFactory,
  ProductFactory,
  OrderFactory,
  PostFactory,
  CommentFactory,
  CategoryFactory,
  NotificationFactory,
  MessageFactory,
  FileFactory,
  SessionFactory,
  userFactory,
  productFactory,
  orderFactory,
  postFactory,
  commentFactory,
  categoryFactory,
  notificationFactory,
  messageFactory,
  fileFactory,
  sessionFactory
} from './factories.js';

// Mocks
export {
  MockDatabase,
  MockCollection,
  MockTransaction,
  MockHTTPClient,
  MockWebSocket,
  MockRedisClient,
  createStub,
  createSpy
} from './mocks.js';

export default {
  // Testing Utilities
  GraphQLTester,
  QueryAssertion,
  MockService,
  createMockService,
  FixtureManager,
  DataGenerator,
  DatabaseTestHelper,
  IntegrationTestHelper,
  createTestContext,
  waitFor,
  sleep,
  
  // Factories
  Factory,
  UserFactory,
  ProductFactory,
  OrderFactory,
  PostFactory,
  CommentFactory,
  CategoryFactory,
  NotificationFactory,
  MessageFactory,
  FileFactory,
  SessionFactory,
  userFactory,
  productFactory,
  orderFactory,
  postFactory,
  commentFactory,
  categoryFactory,
  notificationFactory,
  messageFactory,
  fileFactory,
  sessionFactory,
  
  // Mocks
  MockDatabase,
  MockCollection,
  MockTransaction,
  MockHTTPClient,
  MockWebSocket,
  MockRedisClient,
  createStub,
  createSpy
};
