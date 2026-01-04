/**
 * Native Node.js Tracing implementation
 * Uses built-in trace_events and diagnostics_channel
 */

const { Session } = require('inspector');
const fs = require('fs');
const path = require('path');

class NativeTracing {
  constructor(config) {
    this.config = config;
    this.session = null;
    this.traces = [];
    this.isEnabled = false;
  }

  async enable() {
    if (this.isEnabled) return;

    this.session = new Session();
    this.session.connect();

    // Enable tracing categories
    this.session.post('NodeTracing.start', {
      traceConfig: {
        includedCategories: [
          'node',
          'node.async_hooks',
          'node.perf',
          'v8'
        ]
      }
    });

    // Collect trace events
    this.session.on('NodeTracing.dataCollected', ({ value }) => {
      this.traces.push(...value);
    });

    // Export on complete
    this.session.on('NodeTracing.tracingComplete', async () => {
      await this.export();
    });

    this.isEnabled = true;
    console.log('✅ Native tracing enabled');
  }

  async disable() {
    if (!this.isEnabled || !this.session) return;

    this.session.post('NodeTracing.stop');
    this.session.disconnect();
    this.isEnabled = false;
    console.log('✅ Native tracing disabled');
  }

  async export() {
    const { exporter, filePath, endpoint, serviceName } = this.config;

    const data = {
      serviceName,
      timestamp: new Date().toISOString(),
      traces: this.traces
    };

    switch (exporter) {
      case 'file':
        await this.exportToFile(data, filePath);
        break;
      case 'console':
        this.exportToConsole(data);
        break;
      case 'http':
        await this.exportToHTTP(data, endpoint);
        break;
      case 'jaeger':
        await this.exportToJaeger(data, endpoint);
        break;
      default:
        console.warn(`Unknown exporter: ${exporter}`);
    }

    // Clear traces after export
    this.traces = [];
  }

  async exportToFile(data, filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.appendFileSync(filePath, JSON.stringify(data) + '\n');
    console.log(`📝 Traces exported to ${filePath}`);
  }

  exportToConsole(data) {
    console.log('📊 Traces:', JSON.stringify(data, null, 2));
  }

  async exportToHTTP(data, endpoint) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`✅ Traces exported to ${endpoint}`);
    } catch (error) {
      console.error(`❌ Failed to export traces to ${endpoint}:`, error.message);
    }
  }

  async exportToJaeger(data, endpoint) {
    // Convert to Jaeger format
    const jaegerData = {
      data: data.traces.map(trace => ({
        traceID: trace.id || generateTraceId(),
        spanID: trace.id || generateSpanId(),
        operationName: trace.name || 'operation',
        startTime: trace.ts || Date.now() * 1000,
        duration: trace.dur || 0,
        tags: trace.args || {},
        logs: []
      }))
    };

    await this.exportToHTTP(jaegerData, endpoint);
  }

  // Create manual span
  createSpan(name, attributes = {}) {
    const span = {
      name,
      id: generateSpanId(),
      ts: Date.now() * 1000,
      args: attributes
    };

    return {
      end: () => {
        span.dur = Date.now() * 1000 - span.ts;
        this.traces.push(span);
      },
      setAttribute: (key, value) => {
        span.args[key] = value;
      }
    };
  }
}

function generateTraceId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function generateSpanId() {
  return Math.random().toString(36).substring(2, 10);
}

module.exports = { NativeTracing };
