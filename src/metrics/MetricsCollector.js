/**
 * Metrics Collector - Prometheus-compatible metrics
 * 
 * Collects and exposes metrics in Prometheus format:
 * - Counters (monotonically increasing)
 * - Gauges (can increase/decrease)
 * - Histograms (distributions, percentiles)
 * - Summaries (similar to histograms)
 * 
 * Endpoint: GET /metrics
 */

/**
 * Metric types
 */
export const MetricType = {
  COUNTER: 'counter',
  GAUGE: 'gauge',
  HISTOGRAM: 'histogram',
  SUMMARY: 'summary'
};

/**
 * Metric class
 */
class Metric {
  constructor(name, type, help, labels = []) {
    this.name = name;
    this.type = type;
    this.help = help;
    this.labels = labels;
    this.values = new Map(); // labelKey -> value
  }

  /**
   * Get label key from label object
   */
  getLabelKey(labels = {}) {
    if (this.labels.length === 0) return '__default__';
    
    const sortedLabels = this.labels.sort();
    return sortedLabels.map(label => `${label}="${labels[label] || ''}"`).join(',');
  }

  /**
   * Set value
   */
  set(value, labels = {}) {
    const key = this.getLabelKey(labels);
    this.values.set(key, value);
  }

  /**
   * Increment counter
   */
  inc(value = 1, labels = {}) {
    const key = this.getLabelKey(labels);
    const current = this.values.get(key) || 0;
    this.values.set(key, current + value);
  }

  /**
   * Decrement gauge
   */
  dec(value = 1, labels = {}) {
    const key = this.getLabelKey(labels);
    const current = this.values.get(key) || 0;
    this.values.set(key, current - value);
  }

  /**
   * Observe value (for histogram/summary)
   */
  observe(value, labels = {}) {
    const key = this.getLabelKey(labels);
    
    if (!this.values.has(key)) {
      this.values.set(key, {
        count: 0,
        sum: 0,
        buckets: new Map(),
        values: []
      });
    }
    
    const data = this.values.get(key);
    data.count++;
    data.sum += value;
    data.values.push(value);
    
    // Update buckets for histogram
    if (this.type === MetricType.HISTOGRAM) {
      const buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
      
      for (const bucket of buckets) {
        if (value <= bucket) {
          data.buckets.set(bucket, (data.buckets.get(bucket) || 0) + 1);
        }
      }
    }
  }

  /**
   * Export to Prometheus format
   */
  toPrometheus() {
    let output = '';
    
    // HELP
    output += `# HELP ${this.name} ${this.help}\n`;
    
    // TYPE
    output += `# TYPE ${this.name} ${this.type}\n`;
    
    // Values
    for (const [labelKey, value] of this.values) {
      const labelStr = labelKey === '__default__' ? '' : `{${labelKey}}`;
      
      if (this.type === MetricType.HISTOGRAM || this.type === MetricType.SUMMARY) {
        // Histogram/Summary format
        const data = value;
        
        if (this.type === MetricType.HISTOGRAM) {
          // Buckets
          for (const [bucket, count] of data.buckets) {
            output += `${this.name}_bucket{${labelKey},le="${bucket}"} ${count}\n`;
          }
          output += `${this.name}_bucket{${labelKey},le="+Inf"} ${data.count}\n`;
        }
        
        // Sum and count
        output += `${this.name}_sum${labelStr} ${data.sum}\n`;
        output += `${this.name}_count${labelStr} ${data.count}\n`;
      } else {
        // Counter/Gauge format
        output += `${this.name}${labelStr} ${value}\n`;
      }
    }
    
    return output;
  }
}

/**
 * Metrics Collector
 */
export class MetricsCollector {
  constructor(options = {}) {
    this.prefix = options.prefix || '';
    this.defaultLabels = options.defaultLabels || {};
    this.metrics = new Map();
    
    // Register default metrics
    if (options.collectDefaultMetrics !== false) {
      this.registerDefaultMetrics();
    }
  }

  /**
   * Register default Node.js metrics
   */
  registerDefaultMetrics() {
    // Process metrics
    this.registerGauge(
      'process_cpu_user_seconds_total',
      'Total user CPU time spent in seconds'
    );
    
    this.registerGauge(
      'process_cpu_system_seconds_total',
      'Total system CPU time spent in seconds'
    );
    
    this.registerGauge(
      'process_resident_memory_bytes',
      'Resident memory size in bytes'
    );
    
    this.registerGauge(
      'process_heap_bytes',
      'Process heap size in bytes'
    );
    
    this.registerGauge(
      'nodejs_eventloop_lag_seconds',
      'Event loop lag in seconds'
    );
    
    this.registerGauge(
      'nodejs_active_handles',
      'Number of active handles'
    );
    
    this.registerGauge(
      'nodejs_active_requests',
      'Number of active requests'
    );
    
    // Start collecting
    this.startDefaultMetricsCollection();
  }

  /**
   * Start collecting default metrics
   */
  startDefaultMetricsCollection() {
    // Collect every 10 seconds
    this.defaultMetricsInterval = setInterval(() => {
      const usage = process.cpuUsage();
      const memUsage = process.memoryUsage();
      
      this.setGauge('process_cpu_user_seconds_total', usage.user / 1000000);
      this.setGauge('process_cpu_system_seconds_total', usage.system / 1000000);
      this.setGauge('process_resident_memory_bytes', memUsage.rss);
      this.setGauge('process_heap_bytes', memUsage.heapUsed);
      
      // Event loop lag (simplified)
      const start = Date.now();
      setImmediate(() => {
        const lag = (Date.now() - start) / 1000;
        this.setGauge('nodejs_eventloop_lag_seconds', lag);
      });
      
      // Active handles and requests
      if (process._getActiveHandles) {
        this.setGauge('nodejs_active_handles', process._getActiveHandles().length);
      }
      if (process._getActiveRequests) {
        this.setGauge('nodejs_active_requests', process._getActiveRequests().length);
      }
    }, 10000);
  }

  /**
   * Stop collecting default metrics
   */
  stopDefaultMetricsCollection() {
    if (this.defaultMetricsInterval) {
      clearInterval(this.defaultMetricsInterval);
    }
  }

  /**
   * Register a counter
   */
  registerCounter(name, help, labels = []) {
    const fullName = this.prefix + name;
    
    if (this.metrics.has(fullName)) {
      return this.metrics.get(fullName);
    }
    
    const metric = new Metric(fullName, MetricType.COUNTER, help, labels);
    this.metrics.set(fullName, metric);
    return metric;
  }

  /**
   * Register a gauge
   */
  registerGauge(name, help, labels = []) {
    const fullName = this.prefix + name;
    
    if (this.metrics.has(fullName)) {
      return this.metrics.get(fullName);
    }
    
    const metric = new Metric(fullName, MetricType.GAUGE, help, labels);
    this.metrics.set(fullName, metric);
    return metric;
  }

  /**
   * Register a histogram
   */
  registerHistogram(name, help, labels = []) {
    const fullName = this.prefix + name;
    
    if (this.metrics.has(fullName)) {
      return this.metrics.get(fullName);
    }
    
    const metric = new Metric(fullName, MetricType.HISTOGRAM, help, labels);
    this.metrics.set(fullName, metric);
    return metric;
  }

  /**
   * Register a summary
   */
  registerSummary(name, help, labels = []) {
    const fullName = this.prefix + name;
    
    if (this.metrics.has(fullName)) {
      return this.metrics.get(fullName);
    }
    
    const metric = new Metric(fullName, MetricType.SUMMARY, help, labels);
    this.metrics.set(fullName, metric);
    return metric;
  }

  /**
   * Increment counter
   */
  incrementCounter(name, labels = {}, value = 1) {
    const fullName = this.prefix + name;
    const metric = this.metrics.get(fullName);
    
    if (!metric) {
      throw new Error(`Metric not found: ${fullName}`);
    }
    
    metric.inc(value, { ...this.defaultLabels, ...labels });
  }

  /**
   * Set gauge value
   */
  setGauge(name, value, labels = {}) {
    const fullName = this.prefix + name;
    const metric = this.metrics.get(fullName);
    
    if (!metric) {
      throw new Error(`Metric not found: ${fullName}`);
    }
    
    metric.set(value, { ...this.defaultLabels, ...labels });
  }

  /**
   * Increment gauge
   */
  incrementGauge(name, value = 1, labels = {}) {
    const fullName = this.prefix + name;
    const metric = this.metrics.get(fullName);
    
    if (!metric) {
      throw new Error(`Metric not found: ${fullName}`);
    }
    
    metric.inc(value, { ...this.defaultLabels, ...labels });
  }

  /**
   * Decrement gauge
   */
  decrementGauge(name, value = 1, labels = {}) {
    const fullName = this.prefix + name;
    const metric = this.metrics.get(fullName);
    
    if (!metric) {
      throw new Error(`Metric not found: ${fullName}`);
    }
    
    metric.dec(value, { ...this.defaultLabels, ...labels });
  }

  /**
   * Observe histogram/summary value
   */
  observe(name, value, labels = {}) {
    const fullName = this.prefix + name;
    const metric = this.metrics.get(fullName);
    
    if (!metric) {
      throw new Error(`Metric not found: ${fullName}`);
    }
    
    metric.observe(value, { ...this.defaultLabels, ...labels });
  }

  /**
   * Get metric
   */
  getMetric(name) {
    const fullName = this.prefix + name;
    return this.metrics.get(fullName);
  }

  /**
   * Export all metrics to Prometheus format
   */
  toPrometheus() {
    let output = '';
    
    for (const metric of this.metrics.values()) {
      output += metric.toPrometheus();
      output += '\n';
    }
    
    return output;
  }

  /**
   * Get metrics as JSON
   */
  toJSON() {
    const result = {};
    
    for (const [name, metric] of this.metrics) {
      result[name] = {
        type: metric.type,
        help: metric.help,
        values: Array.from(metric.values.entries()).map(([labels, value]) => ({
          labels: labels === '__default__' ? {} : Object.fromEntries(
            labels.split(',').map(pair => {
              const [key, val] = pair.split('=');
              return [key, val.replace(/"/g, '')];
            })
          ),
          value
        }))
      };
    }
    
    return result;
  }

  /**
   * Reset all metrics
   */
  reset() {
    for (const metric of this.metrics.values()) {
      metric.values.clear();
    }
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.stopDefaultMetricsCollection();
    this.metrics.clear();
  }
}

export default MetricsCollector;
