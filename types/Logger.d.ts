/**
 * Logger type definitions
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LoggerOptions {
  level?: LogLevel
  service?: string
  outputs?: Array<'console' | 'file' | 'cloudwatch' | 'datadog'>
  format?: 'json' | 'text'
}

export interface LogMetadata {
  [key: string]: unknown
}

export declare class Logger {
  constructor(options?: LoggerOptions)
  
  /**
   * Log debug message
   */
  debug(message: string, meta?: LogMetadata): void
  
  /**
   * Log info message
   */
  info(message: string, meta?: LogMetadata): void
  
  /**
   * Log warning message
   */
  warn(message: string, meta?: LogMetadata): void
  
  /**
   * Log error message
   */
  error(message: string, error?: Error, meta?: LogMetadata): void
  
  /**
   * Create child logger with additional context
   */
  child(meta: LogMetadata): Logger
}

export default Logger
