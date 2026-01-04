import { HTTPTransport } from '../../src/transport/http';
import EventBus from '../../src/events/EventBus';

describe('HTTPTransport', () => {
  let transport;
  let eventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    transport = new HTTPTransport({ eventBus });
  });

  afterEach(async () => {
    if (transport && transport.client) {
      await transport.disconnect();
    }
    if (eventBus) {
      await eventBus.close();
    }
  });

  describe('Initialization', () => {
    test('should create HTTP transport', () => {
      expect(transport).toBeDefined();
      expect(transport.config).toBeDefined();
    });

    test('should have axios client after connection', async () => {
      await transport.connect();
      expect(transport.client).toBeDefined();
    });
  });

  describe('Configuration', () => {
    test('should accept custom config', () => {
      const customTransport = new HTTPTransport({
        eventBus,
        baseURL: 'http://api.example.com',
        timeout: 5000
      });

      expect(customTransport.config.baseURL).toBe('http://api.example.com');
      expect(customTransport.config.timeout).toBe(5000);
    });
  });

  describe('Connection Lifecycle', () => {
    test('should connect and disconnect', async () => {
      await expect(transport.connect()).resolves.not.toThrow();
      await expect(transport.disconnect()).resolves.not.toThrow();
    });
  });
});
