import { WebSocketTransport } from '../../src/transport/websocket';
import EventBus from '../../src/events/EventBus';

describe('WebSocketTransport', () => {
  let transport;
  let eventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    transport = new WebSocketTransport({ eventBus });
  });

  afterEach(async () => {
    if (transport && transport.ws) {
      await transport.disconnect();
    }
    if (eventBus) {
      await eventBus.close();
    }
  });

  describe('Initialization', () => {
    test('should create WebSocket transport', () => {
      expect(transport).toBeDefined();
      expect(transport.config).toBeDefined();
    });

    test('should accept custom config', () => {
      const customTransport = new WebSocketTransport({
        eventBus,
        url: 'ws://localhost:8080',
        reconnect: false
      });

      expect(customTransport.config.url).toBe('ws://localhost:8080');
      expect(customTransport.config.reconnect).toBe(false);
    });
  });

  describe('Connection', () => {
    test('should have connect and disconnect methods', () => {
      expect(typeof transport.connect).toBe('function');
      expect(typeof transport.disconnect).toBe('function');
    });
  });
});
