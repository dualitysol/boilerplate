/**
 * Health Check System - Main exports
 */

export { HealthCheck, HealthStatus, HealthCheckBuilder } from './HealthCheck.js';
export { createHealthMiddleware, attachHealthEndpoints } from './middleware.js';

export default {
  HealthCheck,
  HealthStatus,
  HealthCheckBuilder,
  createHealthMiddleware,
  attachHealthEndpoints
};
