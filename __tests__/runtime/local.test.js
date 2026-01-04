import { LocalRuntime } from '../../src/runtime/local';
import EventBus from '../../src/events/EventBus';

describe('LocalRuntime', () => {
  let runtime;
  let eventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    runtime = new LocalRuntime({ eventBus });
  });

  afterEach(async () => {
    if (eventBus) {
      await eventBus.close();
    }
  });

  describe('Initialization', () => {
    test('should create local runtime', () => {
      expect(runtime).toBeDefined();
      expect(runtime.type).toBe('local');
    });

    test('should accept custom config', () => {
      const customRuntime = new LocalRuntime({
        eventBus,
        env: 'production',
        port: 5000
      });

      expect(customRuntime.config.env).toBe('production');
      expect(customRuntime.config.port).toBe(5000);
    });
  });

  describe('Environment', () => {
    test('should have runtime type', () => {
      expect(runtime.type).toBe('local');
    });

    test('should have config object', () => {
      expect(runtime.config).toBeDefined();
      expect(typeof runtime.config).toBe('object');
    });
  });
});
