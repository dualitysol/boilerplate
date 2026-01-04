/**
 * Metrics Middleware
 * 
 * Automatically tracks HTTP metrics:
 * - Request count
 * - Request duration
 * - Response status codes
 * - Active requests
 */

import { MetricsCollector } from './MetricsCollector.js';

/**
 * Create metrics middleware for HTTP server
 */
export function createMetricsMiddleware(metricsCollector, options = {}) {
  const {
    metricsPath = '/metrics',
    includeMethod = true,
    includePath = true,
    includeStatusCode = true,
    normalizePath = true
  } = options;
  
  // Register HTTP metrics
  if (!metricsCollector.getMetric('http_requests_total')) {
    metricsCollector.registerCounter(
      'http_requests_total',
      'Total number of HTTP requests',
      ['method', 'path', 'status']
    );
  }
  
  if (!metricsCollector.getMetric('http_request_duration_seconds')) {
    metricsCollector.registerHistogram(
      'http_request_duration_seconds',
      'HTTP request duration in seconds',
      ['method', 'path', 'status']
    );
  }
  
  if (!metricsCollector.getMetric('http_requests_in_progress')) {
    metricsCollector.registerGauge(
      'http_requests_in_progress',
      'Current number of HTTP requests in progress',
      ['method', 'path']
    );
  }
  
  return async (req, res, next) => {
    const url = req.url || req.path || '/';
    
    // Serve metrics endpoint
    if (url === metricsPath) {
      res.setHeader?.('Content-Type', 'text/plain; version=0.0.4');
      res.statusCode = 200;
      
      const metrics = metricsCollector.toPrometheus();
      
      if (res.send) {
        res.send(metrics);
      } else {
        res.end(metrics);
      }
      return;
    }
    
    // Track request
    const start = Date.now();
    const method = req.method || 'GET';
    const path = normalizePath ? normalizePath(url) : url;
    
    // Increment in-progress requests
    metricsCollector.incrementGauge('http_requests_in_progress', 1, {
      method: includeMethod ? method : undefined,
      path: includePath ? path : undefined
    });
    
    // Track response
    const originalEnd = res.end;
    res.end = function (...args) {
      const duration = (Date.now() - start) / 1000; // Convert to seconds
      const status = res.statusCode || 200;
      
      const labels = {
        method: includeMethod ? method : undefined,
        path: includePath ? path : undefined,
        status: includeStatusCode ? status : undefined
      };
      
      // Record metrics
      metricsCollector.incrementCounter('http_requests_total', labels);
      metricsCollector.observe('http_request_duration_seconds', duration, labels);
      metricsCollector.decrementGauge('http_requests_in_progress', 1, {
        method: includeMethod ? method : undefined,
        path: includePath ? path : undefined
      });
      
      return originalEnd.apply(res, args);
    };
    
    next?.();
  };
}

/**
 * Path normalizer - removes IDs and query params
 */
export function normalizeHttpPath(path) {
  return path
    // Remove query params
    .split('?')[0]
    // Replace UUIDs with :id
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    // Replace numeric IDs with :id
    .replace(/\/\d+/g, '/:id')
    // Replace MongoDB ObjectIds with :id
    .replace(/\/[0-9a-f]{24}/g, '/:id');
}

/**
 * Business metrics decorator
 */
export function RecordMetric(metricName, options = {}) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args) {
      const start = Date.now();
      const metricsCollector = this.metrics || global.metricsCollector;
      
      if (!metricsCollector) {
        return originalMethod.apply(this, args);
      }
      
      try {
        const result = await originalMethod.apply(this, args);
        const duration = (Date.now() - start) / 1000;
        
        // Record success
        if (options.counter) {
          metricsCollector.incrementCounter(metricName, { status: 'success' });
        }
        
        if (options.histogram) {
          metricsCollector.observe(metricName + '_duration_seconds', duration, { status: 'success' });
        }
        
        return result;
      } catch (error) {
        const duration = (Date.now() - start) / 1000;
        
        // Record error
        if (options.counter) {
          metricsCollector.incrementCounter(metricName, { status: 'error' });
        }
        
        if (options.histogram) {
          metricsCollector.observe(metricName + '_duration_seconds', duration, { status: 'error' });
        }
        
        throw error;
      }
    };
    
    return descriptor;
  };
}

export default createMetricsMiddleware;
