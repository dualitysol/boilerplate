/**
 * Metrics System - Main exports
 */

export { MetricsCollector, MetricType } from './MetricsCollector.js';
export { createMetricsMiddleware, normalizeHttpPath, RecordMetric } from './middleware.js';

export default {
  MetricsCollector,
  createMetricsMiddleware,
  normalizeHttpPath,
  RecordMetric
};
