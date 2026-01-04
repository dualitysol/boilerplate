/**
 * Health Check System
 * 
 * Provides comprehensive health monitoring endpoints:
 * - /health - Basic health status
 * - /health/live - Liveness probe (Kubernetes)
 * - /health/ready - Readiness probe (Kubernetes)
 * - /health/detailed - Detailed component health
 */

/**
 * Health status constants
 */
export const HealthStatus = {
  UP: 'UP',
  DOWN: 'DOWN',
  DEGRADED: 'DEGRADED',
  UNKNOWN: 'UNKNOWN'
};

/**
 * Health Check
 */
export class HealthCheck {
  /**
   * @param {Object} options
   * @param {string} options.serviceName - Service name
   * @param {Object} options.checks - Health check functions
   * @param {number} options.timeout - Check timeout in ms
   */
  constructor(options = {}) {
    this.serviceName = options.serviceName || 'microservice';
    this.checks = new Map();
    this.timeout = options.timeout || 5000;
    this.startTime = Date.now();
    this.logger = options.logger || console;
    
    // Register default checks
    this.registerDefaultChecks();
  }

  /**
   * Register default health checks
   */
  registerDefaultChecks() {
    // Always-passing liveness check
    this.register('liveness', async () => ({
      status: HealthStatus.UP,
      message: 'Service is alive'
    }));
    
    // System uptime check
    this.register('uptime', async () => ({
      status: HealthStatus.UP,
      uptime: Date.now() - this.startTime,
      uptimeHuman: this.formatUptime(Date.now() - this.startTime)
    }));
    
    // Memory check
    this.register('memory', async () => {
      const usage = process.memoryUsage();
      const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100;
      
      return {
        status: heapUsedPercent > 90 ? HealthStatus.DEGRADED : HealthStatus.UP,
        heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
        heapPercent: `${heapUsedPercent.toFixed(2)}%`,
        rss: `${Math.round(usage.rss / 1024 / 1024)}MB`
      };
    });
  }

  /**
   * Register a health check
   * @param {string} name - Check name
   * @param {Function} checkFn - Async function that returns health status
   * @param {Object} options - Check options
   */
  register(name, checkFn, options = {}) {
    this.checks.set(name, {
      name,
      fn: checkFn,
      critical: options.critical !== false, // Critical by default
      timeout: options.timeout || this.timeout
    });
    
    this.logger.debug(`Health check registered: ${name}`);
  }

  /**
   * Unregister a health check
   * @param {string} name - Check name
   */
  unregister(name) {
    this.checks.delete(name);
  }

  /**
   * Run single health check with timeout
   * @param {string} name - Check name
   * @param {Object} check - Check configuration
   * @returns {Promise<Object>}
   */
  async runCheck(name, check) {
    const start = Date.now();
    
    try {
      const result = await this.withTimeout(check.fn(), check.timeout);
      const duration = Date.now() - start;
      
      return {
        name,
        status: result.status || HealthStatus.UP,
        duration: `${duration}ms`,
        critical: check.critical,
        ...result
      };
    } catch (error) {
      const duration = Date.now() - start;
      
      return {
        name,
        status: HealthStatus.DOWN,
        duration: `${duration}ms`,
        critical: check.critical,
        error: error.message,
        errorType: error.constructor.name
      };
    }
  }

  /**
   * Execute function with timeout
   */
  async withTimeout(promise, timeout) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), timeout)
      )
    ]);
  }

  /**
   * Run all health checks
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  async checkHealth(options = {}) {
    const includeDetails = options.detailed !== false;
    const start = Date.now();
    
    // Run all checks in parallel
    const checkPromises = Array.from(this.checks.entries()).map(([name, check]) =>
      this.runCheck(name, check)
    );
    
    const results = await Promise.all(checkPromises);
    const duration = Date.now() - start;
    
    // Determine overall status
    const hasCriticalFailure = results.some(
      r => r.critical && r.status === HealthStatus.DOWN
    );
    const hasDegraded = results.some(r => r.status === HealthStatus.DEGRADED);
    
    let overallStatus;
    if (hasCriticalFailure) {
      overallStatus = HealthStatus.DOWN;
    } else if (hasDegraded) {
      overallStatus = HealthStatus.DEGRADED;
    } else {
      overallStatus = HealthStatus.UP;
    }
    
    // Build response
    const response = {
      service: this.serviceName,
      status: overallStatus,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`
    };
    
    if (includeDetails) {
      response.checks = results;
      response.summary = {
        total: results.length,
        up: results.filter(r => r.status === HealthStatus.UP).length,
        down: results.filter(r => r.status === HealthStatus.DOWN).length,
        degraded: results.filter(r => r.status === HealthStatus.DEGRADED).length
      };
    }
    
    return response;
  }

  /**
   * Liveness probe (Kubernetes-compatible)
   * Simple check that service is running
   */
  async liveness() {
    const check = this.checks.get('liveness');
    if (!check) {
      return {
        status: HealthStatus.UP,
        timestamp: new Date().toISOString()
      };
    }
    
    const result = await this.runCheck('liveness', check);
    
    return {
      status: result.status,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Readiness probe (Kubernetes-compatible)
   * Checks if service is ready to accept traffic
   */
  async readiness() {
    // Run all critical checks
    const criticalChecks = Array.from(this.checks.entries())
      .filter(([, check]) => check.critical);
    
    const checkPromises = criticalChecks.map(([name, check]) =>
      this.runCheck(name, check)
    );
    
    const results = await Promise.all(checkPromises);
    
    const hasFailure = results.some(r => r.status === HealthStatus.DOWN);
    
    return {
      status: hasFailure ? HealthStatus.DOWN : HealthStatus.UP,
      timestamp: new Date().toISOString(),
      checks: results.map(r => ({
        name: r.name,
        status: r.status
      }))
    };
  }

  /**
   * Format uptime duration
   */
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}

/**
 * Health check builder for common components
 */
export class HealthCheckBuilder {
  /**
   * Create database health check
   * @param {Object} storage - Storage instance
   * @returns {Function}
   */
  static database(storage) {
    return async () => {
      if (!storage) {
        return {
          status: HealthStatus.UNKNOWN,
          message: 'No storage configured'
        };
      }
      
      try {
        // Ping database
        const start = Date.now();
        await storage.ping?.() || await storage.client?.db?.().admin?.()?.ping?.();
        const responseTime = Date.now() - start;
        
        return {
          status: HealthStatus.UP,
          type: storage.type || 'unknown',
          responseTime: `${responseTime}ms`
        };
      } catch (error) {
        return {
          status: HealthStatus.DOWN,
          error: error.message
        };
      }
    };
  }

  /**
   * Create event bus health check
   * @param {Object} eventBus - EventBus instance
   * @returns {Function}
   */
  static eventBus(eventBus) {
    return async () => {
      if (!eventBus) {
        return {
          status: HealthStatus.UNKNOWN,
          message: 'No event bus configured'
        };
      }
      
      try {
        const isConnected = eventBus.isConnected?.() || eventBus.connected;
        
        return {
          status: isConnected ? HealthStatus.UP : HealthStatus.DOWN,
          type: eventBus.type || 'unknown',
          connected: isConnected
        };
      } catch (error) {
        return {
          status: HealthStatus.DOWN,
          error: error.message
        };
      }
    };
  }

  /**
   * Create queue health check
   * @param {Object} queue - Queue instance
   * @returns {Function}
   */
  static queue(queue) {
    return async () => {
      if (!queue) {
        return {
          status: HealthStatus.UNKNOWN,
          message: 'No queue configured'
        };
      }
      
      try {
        const isConnected = queue.isConnected?.() || queue.connected;
        
        return {
          status: isConnected ? HealthStatus.UP : HealthStatus.DOWN,
          type: queue.type || 'unknown',
          connected: isConnected
        };
      } catch (error) {
        return {
          status: HealthStatus.DOWN,
          error: error.message
        };
      }
    };
  }

  /**
   * Create dependency health check
   * @param {string} url - Dependency URL
   * @param {Object} options - Fetch options
   * @returns {Function}
   */
  static dependency(url, options = {}) {
    return async () => {
      try {
        const start = Date.now();
        const response = await fetch(url, {
          method: 'GET',
          timeout: options.timeout || 3000,
          ...options
        });
        const responseTime = Date.now() - start;
        
        return {
          status: response.ok ? HealthStatus.UP : HealthStatus.DOWN,
          url,
          statusCode: response.status,
          responseTime: `${responseTime}ms`
        };
      } catch (error) {
        return {
          status: HealthStatus.DOWN,
          url,
          error: error.message
        };
      }
    };
  }

  /**
   * Create disk space health check
   * @param {string} path - Path to check
   * @param {number} threshold - Threshold percentage (0-100)
   * @returns {Function}
   */
  static diskSpace(path = '/', threshold = 90) {
    return async () => {
      try {
        // Note: This requires 'check-disk-space' package
        // Or implement custom disk check
        return {
          status: HealthStatus.UP,
          message: 'Disk space check not implemented'
        };
      } catch (error) {
        return {
          status: HealthStatus.DOWN,
          error: error.message
        };
      }
    };
  }
}

export default HealthCheck;
