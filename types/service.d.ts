/**
 * Service Types for Boilerplate Framework
 */

import { Storage } from './Storage';
import { EventBus } from './EventBus';
import { QueueManager } from './Queue';
import { Logger } from './Logger';
import { BoilerplateConfig } from './config';

/**
 * Service dependencies injected by Bootstrap
 */
export interface ServiceDependencies {
  storage: Storage;
  cache?: Cache;
  eventBus: EventBus;
  queueManager: QueueManager;
  logger: Logger;
  config?: BoilerplateConfig;
}

/**
 * Base Service Model interface
 */
export interface ServiceModel {
  /**
   * Initialize the service
   * Called during bootstrap after all dependencies are injected
   */
  initialize(): Promise<void>;

  /**
   * Cleanup resources
   * Called during graceful shutdown
   */
  cleanup?(): Promise<void>;
}

/**
 * Cache interface
 */
export interface Cache {
  /**
   * Get value from cache
   */
  get<T = any>(key: string): Promise<T | null>;

  /**
   * Set value in cache with optional TTL
   */
  set(key: string, value: any, ttl?: number): Promise<void>;

  /**
   * Delete value from cache
   */
  del(key: string): Promise<void>;

  /**
   * Check if key exists
   */
  exists?(key: string): Promise<boolean>;

  /**
   * Clear all cache
   */
  clear?(): Promise<void>;

  /**
   * Get multiple keys
   */
  mget?<T = any>(keys: string[]): Promise<(T | null)[]>;

  /**
   * Set multiple keys
   */
  mset?(entries: Record<string, any>, ttl?: number): Promise<void>;
}

/**
 * Service context passed to resolvers
 */
export interface ServiceContext {
  storage: Storage;
  cache?: Cache;
  eventBus: EventBus;
  queueManager: QueueManager;
  logger: Logger;
  services: ServiceRegistry;
  currentUser?: any;
  model?: any;
  request?: any;
  [key: string]: any;
}

/**
 * Service registry containing all loaded services
 */
export interface ServiceRegistry {
  [serviceName: string]: ServiceModel & Record<string, any>;
}

/**
 * Service metadata
 */
export interface ServiceMetadata {
  name: string;
  version?: string;
  description?: string;
  dependencies?: string[];
  tags?: string[];
}

/**
 * Service discovery result
 */
export interface DiscoveredService {
  name: string;
  path: string;
  hasModel: boolean;
  hasResolvers: boolean;
  hasTypeDefs: boolean;
  hasTests: boolean;
  metadata?: ServiceMetadata;
}
