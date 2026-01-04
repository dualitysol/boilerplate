/**
 * Health Check Middleware
 * 
 * Adds health check endpoints to HTTP/Express server
 */

import { HealthCheck, HealthStatus } from './HealthCheck.js';

/**
 * Create health check middleware
 * @param {HealthCheck} healthCheck - HealthCheck instance
 * @param {Object} options - Middleware options
 * @returns {Function}
 */
export function createHealthMiddleware(healthCheck, options = {}) {
  const {
    healthPath = '/health',
    livePath = '/health/live',
    readyPath = '/health/ready',
    detailedPath = '/health/detailed'
  } = options;
  
  return async (req, res, next) => {
    const url = req.url || req.path;
    
    try {
      // Basic health endpoint
      if (url === healthPath) {
        const health = await healthCheck.checkHealth({ detailed: false });
        const statusCode = health.status === HealthStatus.UP ? 200 : 503;
        
        res.status?.(statusCode) || (res.statusCode = statusCode);
        res.json?.(health) || res.end(JSON.stringify(health, null, 2));
        return;
      }
      
      // Liveness probe
      if (url === livePath) {
        const liveness = await healthCheck.liveness();
        const statusCode = liveness.status === HealthStatus.UP ? 200 : 503;
        
        res.status?.(statusCode) || (res.statusCode = statusCode);
        res.json?.(liveness) || res.end(JSON.stringify(liveness, null, 2));
        return;
      }
      
      // Readiness probe
      if (url === readyPath) {
        const readiness = await healthCheck.readiness();
        const statusCode = readiness.status === HealthStatus.UP ? 200 : 503;
        
        res.status?.(statusCode) || (res.statusCode = statusCode);
        res.json?.(readiness) || res.end(JSON.stringify(readiness, null, 2));
        return;
      }
      
      // Detailed health
      if (url === detailedPath) {
        const health = await healthCheck.checkHealth({ detailed: true });
        const statusCode = health.status === HealthStatus.UP ? 200 : 503;
        
        res.status?.(statusCode) || (res.statusCode = statusCode);
        res.json?.(health) || res.end(JSON.stringify(health, null, 2));
        return;
      }
      
      // Not a health endpoint, continue
      next?.();
      
    } catch (error) {
      const statusCode = 503;
      const errorResponse = {
        status: HealthStatus.DOWN,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      res.status?.(statusCode) || (res.statusCode = statusCode);
      res.json?.(errorResponse) || res.end(JSON.stringify(errorResponse, null, 2));
    }
  };
}

/**
 * Attach health endpoints to HTTP server (Node.js http module)
 * @param {http.Server} server - HTTP server
 * @param {HealthCheck} healthCheck - HealthCheck instance
 */
export function attachHealthEndpoints(server, healthCheck, options = {}) {
  const middleware = createHealthMiddleware(healthCheck, options);
  
  // Wrap the server's request listener
  const originalListener = server.listeners('request')[0];
  
  server.removeAllListeners('request');
  server.on('request', async (req, res) => {
    // Check if it's a health endpoint
    const isHealthEndpoint = [
      options.healthPath || '/health',
      options.livePath || '/health/live',
      options.readyPath || '/health/ready',
      options.detailedPath || '/health/detailed'
    ].some(path => req.url?.startsWith(path));
    
    if (isHealthEndpoint) {
      await middleware(req, res);
    } else {
      originalListener(req, res);
    }
  });
}

export default createHealthMiddleware;
