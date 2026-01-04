/**
 * OpenTelemetry Tracing implementation
 */

const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { GraphQLInstrumentation } = require('@opentelemetry/instrumentation-graphql');

class OpenTelemetryTracing {
  constructor(config) {
    this.config = config;
    this.provider = null;
    this.tracer = null;
  }

  async enable() {
    const {
      endpoint,
      serviceName,
      serviceVersion,
      environment,
      headers,
      sampleRate = 1.0,
      instrumentations = {}
    } = this.config;

    // Create resource
    const resource = Resource.default().merge(
      new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion || '1.0.0',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment || 'development'
      })
    );

    // Create provider
    this.provider = new NodeTracerProvider({
      resource,
      sampler: {
        shouldSample: () => {
          return Math.random() < sampleRate
            ? { decision: 1 } // RECORD_AND_SAMPLE
            : { decision: 0 }; // NOT_RECORD
        }
      }
    });

    // Create exporter
    const exporter = new OTLPTraceExporter({
      url: endpoint,
      headers: headers || {}
    });

    // Add span processor
    this.provider.addSpanProcessor(new BatchSpanProcessor(exporter));

    // Register provider
    this.provider.register();

    // Get tracer
    this.tracer = this.provider.getTracer(serviceName);

    // Register instrumentations
    const instrumentationList = [];

    if (instrumentations.http !== false) {
      instrumentationList.push(new HttpInstrumentation());
    }

    if (instrumentations.graphql) {
      try {
        instrumentationList.push(new GraphQLInstrumentation());
      } catch (error) {
        console.warn('GraphQL instrumentation not available:', error.message);
      }
    }

    if (instrumentationList.length > 0) {
      registerInstrumentations({
        instrumentations: instrumentationList
      });
    }

    console.log(`✅ OpenTelemetry tracing enabled (${endpoint})`);
  }

  async disable() {
    if (this.provider) {
      await this.provider.shutdown();
      console.log('✅ OpenTelemetry tracing disabled');
    }
  }

  // Create manual span
  createSpan(name, attributes = {}) {
    if (!this.tracer) {
      return {
        end: () => {},
        setAttribute: () => {}
      };
    }

    const span = this.tracer.startSpan(name);

    // Set attributes
    for (const [key, value] of Object.entries(attributes)) {
      span.setAttribute(key, value);
    }

    return span;
  }

  // Start active span with context
  async startActiveSpan(name, fn) {
    if (!this.tracer) {
      return fn({ end: () => {}, setAttribute: () => {} });
    }

    return this.tracer.startActiveSpan(name, async (span) => {
      try {
        const result = await fn(span);
        span.setStatus({ code: 1 }); // OK
        return result;
      } catch (error) {
        span.setStatus({
          code: 2, // ERROR
          message: error.message
        });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  getTracer() {
    return this.tracer;
  }
}

module.exports = { OpenTelemetryTracing };
