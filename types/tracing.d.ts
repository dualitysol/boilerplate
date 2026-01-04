/**
 * Tracing and Telemetry configuration types
 */

export interface TracingConfig {
  enabled: boolean
  provider: 'native' | 'opentelemetry' | 'none'
  config?: NativeTracingConfig | OpenTelemetryConfig
}

export interface NativeTracingConfig {
  /**
   * Export traces to file, console, or HTTP endpoint
   */
  exporter: 'file' | 'console' | 'http' | 'jaeger'
  
  /**
   * File path for file exporter
   */
  filePath?: string
  
  /**
   * HTTP endpoint for traces
   */
  endpoint?: string
  
  /**
   * Service name for tracing
   */
  serviceName: string
  
  /**
   * Sample rate (0-1)
   */
  sampleRate?: number
}

export interface OpenTelemetryConfig {
  /**
   * OTLP endpoint
   */
  endpoint: string
  
  /**
   * Service name
   */
  serviceName: string
  
  /**
   * Service version
   */
  serviceVersion?: string
  
  /**
   * Environment (dev/staging/prod)
   */
  environment?: string
  
  /**
   * Headers for OTLP exporter
   */
  headers?: Record<string, string>
  
  /**
   * Sample rate (0-1)
   */
  sampleRate?: number
  
  /**
   * Enable specific instrumentations
   */
  instrumentations?: {
    http?: boolean
    grpc?: boolean
    graphql?: boolean
    database?: boolean
    redis?: boolean
  }
}

/**
 * Metrics configuration
 */
export interface MetricsConfig {
  enabled: boolean
  provider: 'native' | 'prometheus' | 'opentelemetry' | 'none'
  config?: PrometheusConfig | OpenTelemetryConfig
}

export interface PrometheusConfig {
  /**
   * Port for metrics endpoint
   */
  port: number
  
  /**
   * Path for metrics endpoint
   */
  path?: string
  
  /**
   * Prefix for metric names
   */
  prefix?: string
}
