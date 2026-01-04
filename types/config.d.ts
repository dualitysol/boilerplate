/**
 * Configuration Types for Boilerplate Framework
 */

export interface BoilerplateConfig {
  project: ProjectConfig;
  services: ServicesConfig;
  transport: TransportConfig;
  eventBus: EventBusConfig;
  queue: QueueConfig;
  databases: DatabasesConfig;
  graphql?: GraphQLConfig;
  runtime: RuntimeConfig;
  build?: BuildConfig;
  features?: FeaturesConfig;
  logging?: LoggingConfig;
}

export interface ProjectConfig {
  name: string;
  version: string;
  description: string;
  type: 'monolith' | 'microservices' | 'serverless';
}

export interface ServicesConfig {
  autoDiscover: boolean;
  path: string;
  list?: string[];
}

export interface TransportConfig {
  type: 'http' | 'websocket' | 'nats' | 'grpc' | 'lambda';
  config: HttpConfig | WebSocketConfig | NATSConfig | GRPCConfig | LambdaConfig;
}

export interface HttpConfig {
  port: number;
  host?: string;
  cors?: CORSConfig;
  graphql?: GraphQLTransportConfig;
}

export interface CORSConfig {
  enabled: boolean;
  origin: string | string[];
  credentials?: boolean;
  methods?: string[];
}

export interface GraphQLTransportConfig {
  path: string;
  playground: boolean;
}

export interface WebSocketConfig extends HttpConfig {
  wsPath?: string;
}

export interface NATSConfig {
  servers: string[];
  user?: string;
  pass?: string;
  token?: string;
}

export interface GRPCConfig {
  port: number;
  protoPath: string;
}

export interface LambdaConfig {
  runtime: string;
  handler: string;
  timeout?: number;
  memory?: number;
}

export interface EventBusConfig {
  type: 'local' | 'nats' | 'redis' | 'kafka' | 'rabbitmq';
  config?: NATSEventBusConfig | RedisEventBusConfig | KafkaConfig | RabbitMQConfig;
}

export interface NATSEventBusConfig {
  servers: string[];
  user?: string;
  pass?: string;
}

export interface RedisEventBusConfig {
  url: string;
  password?: string;
}

export interface KafkaConfig {
  brokers: string[];
  clientId?: string;
  groupId?: string;
}

export interface RabbitMQConfig {
  url: string;
  exchange?: string;
}

export interface QueueConfig {
  type: 'local' | 'redis' | 'rabbitmq' | 'sqs';
  config?: RedisQueueConfig | RabbitMQQueueConfig | SQSConfig;
}

export interface RedisQueueConfig {
  url: string;
}

export interface RabbitMQQueueConfig {
  url: string;
  prefetch?: number;
}

export interface SQSConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  queueUrlPrefix?: string;
}

export interface DatabasesConfig {
  primary: DatabaseConfig;
  cache?: CacheConfig;
}

export interface DatabaseConfig {
  type: 'postgres' | 'mongodb' | 'mysql' | 'dynamodb' | 'memory';
  config?: PostgresConfig | MongoDBConfig | MySQLConfig | DynamoDBConfig;
}

export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export interface MongoDBConfig {
  url: string;
  database: string;
  options?: {
    maxPoolSize?: number;
    minPoolSize?: number;
    serverSelectionTimeoutMS?: number;
  };
}

export interface MySQLConfig extends PostgresConfig {}

export interface DynamoDBConfig {
  region: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  tablePrefix?: string;
}

export interface CacheConfig {
  enabled: boolean;
  type: 'redis' | 'memcached' | 'memory';
  config?: RedisConfig | MemcachedConfig;
}

export interface RedisConfig {
  url: string;
  password?: string;
  db?: number;
  keyPrefix?: string;
}

export interface MemcachedConfig {
  servers: string[];
  options?: {
    maxExpiration?: number;
    namespace?: string;
  };
}

export interface GraphQLConfig {
  mode: 'monolith' | 'federated';
  config?: {
    introspection?: boolean;
    playground?: boolean;
    tracing?: boolean;
    cacheControl?: boolean;
    uploads?: boolean;
    maxFileSize?: number;
  };
}

export interface RuntimeConfig {
  type: 'local' | 'docker' | 'kubernetes' | 'lambda';
  config?: LocalRuntimeConfig | DockerRuntimeConfig | KubernetesRuntimeConfig | LambdaRuntimeConfig;
}

export interface LocalRuntimeConfig {
  env?: 'development' | 'production' | 'test';
  watch?: boolean;
}

export interface DockerRuntimeConfig {
  image?: string;
  network?: string;
  volumes?: string[];
}

export interface KubernetesRuntimeConfig {
  namespace?: string;
  context?: string;
  replicas?: number;
}

export interface LambdaRuntimeConfig {
  region?: string;
  role?: string;
  layers?: string[];
}

export interface BuildConfig {
  target: 'monolith' | 'microservices' | 'serverless';
  outputDir: string;
  sourceMap?: boolean;
  minify?: boolean;
  target?: 'es2020' | 'es2021' | 'es2022';
}

export interface FeaturesConfig {
  authentication?: boolean
  authorization?: boolean
  logging?: boolean
  metrics?: MetricsConfig
  tracing?: TracingConfig
  caching?: boolean
  rateLimiting?: boolean
  cors?: boolean
  compression?: boolean
}

import { TracingConfig, MetricsConfig } from './tracing'

export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug' | 'trace';
  format: 'pretty' | 'json';
  transports: LogTransport[];
  context?: boolean;
  timestamp?: boolean;
}

export type LogTransport = 'console' | 'file' | 'cloudwatch' | 'elasticsearch';

/**
 * Helper type for partial config
 */
export type PartialConfig = DeepPartial<BoilerplateConfig>;

/**
 * Deep partial type
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
