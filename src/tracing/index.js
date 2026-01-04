/**
 * Tracing Factory
 * Creates appropriate tracing instance based on configuration
 */

const { NativeTracing } = require('./native');
const { OpenTelemetryTracing } = require('./opentelemetry');

class TracingFactory {
  static create(config) {
    if (!config || !config.enabled) {
      return new NoOpTracing();
    }

    switch (config.provider) {
      case 'native':
        return new NativeTracing(config.config);
      
      case 'opentelemetry':
        return new OpenTelemetryTracing(config.config);
      
      case 'none':
      default:
        return new NoOpTracing();
    }
  }
}

/**
 * No-op tracing implementation
 */
class NoOpTracing {
  async enable() {}
  async disable() {}
  createSpan() {
    return {
      end: () => {},
      setAttribute: () => {}
    };
  }
  async startActiveSpan(name, fn) {
    return fn({ end: () => {}, setAttribute: () => {} });
  }
  getTracer() {
    return null;
  }
}

module.exports = { TracingFactory, NoOpTracing };
