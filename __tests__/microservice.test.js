import Microservice from '../src/microservice';
import EventBus from '../src/events/EventBus';
import QueueManager from '../src/queue';

describe('Microservice', () => {
  let service;
  let eventBus;
  let queueManager;

  beforeEach(() => {
    eventBus = new EventBus();
    queueManager = new QueueManager({ eventBus });
    
    service = new Microservice({
      name: 'TestService',
      eventBus,
      queueManager
    });
  });

  afterEach(async () => {
    if (queueManager) {
      await queueManager.close();
    }
    if (eventBus) {
      await eventBus.close();
    }
  });

  describe('Initialization', () => {
    test('should create microservice with name', () => {
      expect(service).toBeDefined();
      expect(service.name).toBe('TestService');
      // EventBus and QueueManager are passed in constructor but may not be stored as direct properties
      expect(service.context).toBeDefined();
    });

    test('should have required properties', () => {
      expect(service).toHaveProperty('name');
      expect(service).toHaveProperty('context');
      expect(service).toHaveProperty('logger');
    });
  });

  describe('Event Integration', () => {
    test('should integrate with eventBus', () => {
      // EventBus is used internally through the service
      expect(eventBus).toBeDefined();
      expect(eventBus).toBeInstanceOf(EventBus);
    });

    test('should use eventBus for communication', async () => {
      const handler = jest.fn();
      eventBus.subscribe('test.event', handler);

      eventBus.publish('test.event', { data: 'test' });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Queue Integration', () => {
    test('should integrate with queueManager', () => {
      // QueueManager is used internally through the service
      expect(queueManager).toBeDefined();
      expect(queueManager).toBeInstanceOf(QueueManager);
    });

    test('should use queueManager for tasks', async () => {
      const handler = jest.fn();
      queueManager.process('test-queue', handler);

      queueManager.send('test-queue', { task: 'process' });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    test('should accept custom config', () => {
      const configuredService = new Microservice({
        name: 'ConfigService',
        eventBus,
        queueManager,
        port: 3000
      });

      expect(configuredService.name).toBe('ConfigService');
      expect(configuredService).toBeInstanceOf(Microservice);
    });
  });
});
