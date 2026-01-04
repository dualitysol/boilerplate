/**
 * Storage type definitions
 */

/**
 * MongoDB Collection wrapper
 */
export interface Collection {
  /**
   * Find a single document
   */
  findOne(filter: Record<string, unknown>): Promise<any>
  
  /**
   * Find multiple documents
   */
  find(filter: Record<string, unknown>): {
    limit(n: number): this
    skip(n: number): this
    sort(spec: Record<string, 1 | -1>): this
    toArray(): Promise<any[]>
  }
  
  /**
   * Insert a single document
   */
  insert(doc: Record<string, unknown>): Promise<any>
  
  /**
   * Insert multiple documents
   */
  insertMany(docs: Record<string, unknown>[]): Promise<any>
  
  /**
   * Update a single document
   */
  updateOne(filter: Record<string, unknown>, update: Record<string, unknown>): Promise<any>
  
  /**
   * Update multiple documents
   */
  updateMany(filter: Record<string, unknown>, update: Record<string, unknown>): Promise<any>
  
  /**
   * Delete a single document
   */
  deleteOne(filter: Record<string, unknown>): Promise<{ deletedCount: number }>
  
  /**
   * Delete multiple documents
   */
  deleteMany(filter: Record<string, unknown>): Promise<{ deletedCount: number }>
  
  /**
   * Count documents
   */
  countDocuments(filter?: Record<string, unknown>): Promise<number>
  
  /**
   * Aggregate pipeline
   */
  aggregate(pipeline: any[]): Promise<any[]>
}

/**
 * Storage interface
 */
export interface Storage {
  /**
   * Connect to storage
   */
  connect(): Promise<void>
  
  /**
   * Disconnect from storage
   */
  disconnect(): Promise<void>
  
  /**
   * Get a collection
   */
  getCollection(name: string): Collection
  
  /**
   * Check if connected
   */
  isConnected(): boolean
}

export declare class Storage implements Storage {
  constructor(config: {
    type: 'mongodb' | 'postgres' | 'redis'
    uri: string
    options?: Record<string, unknown>
  })
}

export { Collection }
