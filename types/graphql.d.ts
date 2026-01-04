/**
 * GraphQL Types for Boilerplate Framework
 */

import { ServiceContext } from './service';

/**
 * GraphQL Resolver function
 */
export type ResolverFn<TResult = any, TParent = any, TArgs = any, TContext = ServiceContext> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: any
) => TResult | Promise<TResult>;

/**
 * GraphQL Resolvers map
 */
export interface Resolvers<TContext = ServiceContext> {
  Query?: Record<string, ResolverFn<any, any, any, TContext>>;
  Mutation?: Record<string, ResolverFn<any, any, any, TContext>>;
  Subscription?: Record<string, ResolverFn<any, any, any, TContext>>;
  [typeName: string]: Record<string, ResolverFn<any, any, any, TContext>> | undefined;
}

/**
 * GraphQL Type Definitions
 */
export type TypeDefs = string | string[];

/**
 * GraphQL Schema configuration
 */
export interface GraphQLSchemaConfig {
  typeDefs: TypeDefs;
  resolvers: Resolvers;
}

/**
 * GraphQL Context builder
 */
export type ContextBuilder<T = ServiceContext> = (request: any) => T | Promise<T>;

/**
 * GraphQL Error formatter
 */
export type ErrorFormatter = (error: any) => any;

/**
 * GraphQL validation rules
 */
export type ValidationRule = any;

/**
 * GraphQL plugin
 */
export interface GraphQLPlugin {
  requestDidStart?(context: any): Promise<void> | void;
  willSendResponse?(context: any): Promise<void> | void;
}

/**
 * Merged GraphQL schema result
 */
export interface MergedSchema {
  typeDefs: string;
  resolvers: Resolvers;
}
