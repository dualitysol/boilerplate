import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { GraphQLContext } from '../src/graphql/context';
export type Maybe<T> = T | null | undefined;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export interface Scalars {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** ISO-8601 DateTime scalar type */
  DateTime: { input: Date; output: Date; }
  /** JSON scalar type for arbitrary JSON data */
  JSON: { input: any; output: any; }
  /** File upload scalar type */
  Upload: { input: File; output: File; }
}

export interface CreateUserInput {
  readonly email: Scalars['String']['input'];
  readonly firstName?: InputMaybe<Scalars['String']['input']>;
  readonly lastName?: InputMaybe<Scalars['String']['input']>;
  readonly password: Scalars['String']['input'];
  readonly role?: InputMaybe<UserRole>;
  readonly username: Scalars['String']['input'];
}

export interface CreateUserResponse extends MutationResponse {
  readonly __typename?: 'CreateUserResponse';
  readonly errors?: Maybe<ReadonlyArray<Error>>;
  readonly message?: Maybe<Scalars['String']['output']>;
  readonly success: Scalars['Boolean']['output'];
  readonly user?: Maybe<User>;
}

export interface DeleteUserResponse extends MutationResponse {
  readonly __typename?: 'DeleteUserResponse';
  readonly errors?: Maybe<ReadonlyArray<Error>>;
  readonly message?: Maybe<Scalars['String']['output']>;
  readonly success: Scalars['Boolean']['output'];
}

/** Generic error type */
export interface Error {
  readonly __typename?: 'Error';
  /** Error code */
  readonly code: Scalars['String']['output'];
  /** Additional error details */
  readonly details?: Maybe<Scalars['JSON']['output']>;
  /** Error field (for validation errors) */
  readonly field?: Maybe<Scalars['String']['output']>;
  /** Error message */
  readonly message: Scalars['String']['output'];
}

/** Filter operators */
export type FilterOperator =
  | 'CONTAINS'
  | 'ENDS_WITH'
  | 'EQUALS'
  | 'GREATER_THAN'
  | 'GREATER_THAN_OR_EQUAL'
  | 'IN'
  | 'LESS_THAN'
  | 'LESS_THAN_OR_EQUAL'
  | 'NOT_EQUALS'
  | 'NOT_IN'
  | 'STARTS_WITH';

export interface Mutation {
  readonly __typename?: 'Mutation';
  /** Placeholder mutation */
  readonly _empty?: Maybe<Scalars['String']['output']>;
  /** Create a new user */
  readonly createUser: CreateUserResponse;
  /** Delete a user */
  readonly deleteUser: DeleteUserResponse;
  /** Update an existing user */
  readonly updateUser: UpdateUserResponse;
}


export interface MutationCreateUserArgs {
  input: CreateUserInput;
}


export interface MutationDeleteUserArgs {
  id: Scalars['ID']['input'];
}


export interface MutationUpdateUserArgs {
  id: Scalars['ID']['input'];
  input: UpdateUserInput;
}

/** Generic mutation response */
export interface MutationResponse {
  /** Errors if any */
  readonly errors?: Maybe<ReadonlyArray<Error>>;
  /** Response message */
  readonly message?: Maybe<Scalars['String']['output']>;
  /** Success indicator */
  readonly success: Scalars['Boolean']['output'];
}

/** Generic node interface (for relay-style pagination) */
export interface Node {
  /** Unique ID */
  readonly id: Scalars['ID']['output'];
}

/** Generic pagination info */
export interface PageInfo {
  readonly __typename?: 'PageInfo';
  /** End cursor */
  readonly endCursor?: Maybe<Scalars['String']['output']>;
  /** Has next page */
  readonly hasNextPage: Scalars['Boolean']['output'];
  /** Has previous page */
  readonly hasPreviousPage: Scalars['Boolean']['output'];
  /** Start cursor */
  readonly startCursor?: Maybe<Scalars['String']['output']>;
  /** Total count */
  readonly totalCount?: Maybe<Scalars['Int']['output']>;
}

/** Input for pagination */
export interface PaginationInput {
  /** Cursor for cursor-based pagination */
  readonly cursor?: InputMaybe<Scalars['String']['input']>;
  /** Items per page */
  readonly limit?: InputMaybe<Scalars['Int']['input']>;
  /** Page number (1-indexed) */
  readonly page?: InputMaybe<Scalars['Int']['input']>;
}

export interface Query {
  readonly __typename?: 'Query';
  /** Health check endpoint */
  readonly health: Scalars['String']['output'];
  /** Get current authenticated user */
  readonly me?: Maybe<User>;
  /** Get user by ID */
  readonly user?: Maybe<User>;
  /** List users with pagination and filtering */
  readonly users: UserConnection;
  /** Get API version */
  readonly version: Scalars['String']['output'];
}


export interface QueryUserArgs {
  id: Scalars['ID']['input'];
}


export interface QueryUsersArgs {
  filter?: InputMaybe<UserFilterInput>;
  pagination?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<SortInput>;
}

/** Sort direction enum */
export type SortDirection =
  | 'ASC'
  | 'DESC';

/** Input for sorting */
export interface SortInput {
  /** Sort direction */
  readonly direction?: InputMaybe<SortDirection>;
  /** Field to sort by */
  readonly field: Scalars['String']['input'];
}

export interface Subscription {
  readonly __typename?: 'Subscription';
  /** Placeholder subscription */
  readonly _empty?: Maybe<Scalars['String']['output']>;
  /** Subscribe to new users */
  readonly userCreated: User;
  /** Subscribe to user updates */
  readonly userUpdated: User;
}


export interface SubscriptionUserUpdatedArgs {
  userId?: InputMaybe<Scalars['ID']['input']>;
}

export interface UpdateUserInput {
  readonly avatar?: InputMaybe<Scalars['String']['input']>;
  readonly email?: InputMaybe<Scalars['String']['input']>;
  readonly firstName?: InputMaybe<Scalars['String']['input']>;
  readonly lastName?: InputMaybe<Scalars['String']['input']>;
  readonly username?: InputMaybe<Scalars['String']['input']>;
}

export interface UpdateUserResponse extends MutationResponse {
  readonly __typename?: 'UpdateUserResponse';
  readonly errors?: Maybe<ReadonlyArray<Error>>;
  readonly message?: Maybe<Scalars['String']['output']>;
  readonly success: Scalars['Boolean']['output'];
  readonly user?: Maybe<User>;
}

export interface User extends Node {
  readonly __typename?: 'User';
  readonly avatar?: Maybe<Scalars['String']['output']>;
  readonly createdAt: Scalars['DateTime']['output'];
  readonly email: Scalars['String']['output'];
  readonly firstName?: Maybe<Scalars['String']['output']>;
  readonly id: Scalars['ID']['output'];
  readonly lastLoginAt?: Maybe<Scalars['DateTime']['output']>;
  readonly lastName?: Maybe<Scalars['String']['output']>;
  readonly role: UserRole;
  readonly status: UserStatus;
  readonly updatedAt: Scalars['DateTime']['output'];
  readonly username: Scalars['String']['output'];
}

export interface UserConnection {
  readonly __typename?: 'UserConnection';
  readonly edges: ReadonlyArray<UserEdge>;
  readonly pageInfo: PageInfo;
}

export interface UserEdge {
  readonly __typename?: 'UserEdge';
  readonly cursor: Scalars['String']['output'];
  readonly node: User;
}

export interface UserFilterInput {
  readonly email?: InputMaybe<Scalars['String']['input']>;
  readonly role?: InputMaybe<UserRole>;
  readonly search?: InputMaybe<Scalars['String']['input']>;
  readonly status?: InputMaybe<UserStatus>;
  readonly username?: InputMaybe<Scalars['String']['input']>;
}

export type UserRole =
  | 'ADMIN'
  | 'GUEST'
  | 'USER';

export type UserStatus =
  | 'ACTIVE'
  | 'DELETED'
  | 'INACTIVE'
  | 'SUSPENDED';



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;


/** Mapping of interface types */
export type ResolversInterfaceTypes<_RefType extends Record<string, unknown>> = {
  MutationResponse: ( CreateUserResponse ) | ( DeleteUserResponse ) | ( UpdateUserResponse );
  Node: ( User );
};

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CreateUserInput: CreateUserInput;
  CreateUserResponse: ResolverTypeWrapper<CreateUserResponse>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DeleteUserResponse: ResolverTypeWrapper<DeleteUserResponse>;
  Error: ResolverTypeWrapper<Error>;
  FilterOperator: FilterOperator;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  Mutation: ResolverTypeWrapper<{}>;
  MutationResponse: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['MutationResponse']>;
  Node: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['Node']>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  PaginationInput: PaginationInput;
  Query: ResolverTypeWrapper<{}>;
  SortDirection: SortDirection;
  SortInput: SortInput;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Subscription: ResolverTypeWrapper<{}>;
  UpdateUserInput: UpdateUserInput;
  UpdateUserResponse: ResolverTypeWrapper<UpdateUserResponse>;
  Upload: ResolverTypeWrapper<Scalars['Upload']['output']>;
  User: ResolverTypeWrapper<User>;
  UserConnection: ResolverTypeWrapper<UserConnection>;
  UserEdge: ResolverTypeWrapper<UserEdge>;
  UserFilterInput: UserFilterInput;
  UserRole: UserRole;
  UserStatus: UserStatus;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Boolean: Scalars['Boolean']['output'];
  CreateUserInput: CreateUserInput;
  CreateUserResponse: CreateUserResponse;
  DateTime: Scalars['DateTime']['output'];
  DeleteUserResponse: DeleteUserResponse;
  Error: Error;
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  JSON: Scalars['JSON']['output'];
  Mutation: {};
  MutationResponse: ResolversInterfaceTypes<ResolversParentTypes>['MutationResponse'];
  Node: ResolversInterfaceTypes<ResolversParentTypes>['Node'];
  PageInfo: PageInfo;
  PaginationInput: PaginationInput;
  Query: {};
  SortInput: SortInput;
  String: Scalars['String']['output'];
  Subscription: {};
  UpdateUserInput: UpdateUserInput;
  UpdateUserResponse: UpdateUserResponse;
  Upload: Scalars['Upload']['output'];
  User: User;
  UserConnection: UserConnection;
  UserEdge: UserEdge;
  UserFilterInput: UserFilterInput;
};

export type CreateUserResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['CreateUserResponse'] = ResolversParentTypes['CreateUserResponse']> = {
  errors?: Resolver<Maybe<ReadonlyArray<ResolversTypes['Error']>>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type DeleteUserResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DeleteUserResponse'] = ResolversParentTypes['DeleteUserResponse']> = {
  errors?: Resolver<Maybe<ReadonlyArray<ResolversTypes['Error']>>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ErrorResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Error'] = ResolversParentTypes['Error']> = {
  code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  details?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  field?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  message?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  _empty?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createUser?: Resolver<ResolversTypes['CreateUserResponse'], ParentType, ContextType, RequireFields<MutationCreateUserArgs, 'input'>>;
  deleteUser?: Resolver<ResolversTypes['DeleteUserResponse'], ParentType, ContextType, RequireFields<MutationDeleteUserArgs, 'id'>>;
  updateUser?: Resolver<ResolversTypes['UpdateUserResponse'], ParentType, ContextType, RequireFields<MutationUpdateUserArgs, 'id' | 'input'>>;
};

export type MutationResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['MutationResponse'] = ResolversParentTypes['MutationResponse']> = {
  __resolveType: TypeResolveFn<'CreateUserResponse' | 'DeleteUserResponse' | 'UpdateUserResponse', ParentType, ContextType>;
  errors?: Resolver<Maybe<ReadonlyArray<ResolversTypes['Error']>>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type NodeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Node'] = ResolversParentTypes['Node']> = {
  __resolveType: TypeResolveFn<'User', ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
};

export type PageInfoResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = {
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  hasPreviousPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  startCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  totalCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  health?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  me?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, RequireFields<QueryUserArgs, 'id'>>;
  users?: Resolver<ResolversTypes['UserConnection'], ParentType, ContextType, Partial<QueryUsersArgs>>;
  version?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type SubscriptionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = {
  _empty?: SubscriptionResolver<Maybe<ResolversTypes['String']>, "_empty", ParentType, ContextType>;
  userCreated?: SubscriptionResolver<ResolversTypes['User'], "userCreated", ParentType, ContextType>;
  userUpdated?: SubscriptionResolver<ResolversTypes['User'], "userUpdated", ParentType, ContextType, Partial<SubscriptionUserUpdatedArgs>>;
};

export type UpdateUserResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['UpdateUserResponse'] = ResolversParentTypes['UpdateUserResponse']> = {
  errors?: Resolver<Maybe<ReadonlyArray<ResolversTypes['Error']>>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface UploadScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Upload'], any> {
  name: 'Upload';
}

export type UserResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = {
  avatar?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  firstName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lastLoginAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  lastName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  role?: Resolver<ResolversTypes['UserRole'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['UserStatus'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  username?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UserConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['UserConnection'] = ResolversParentTypes['UserConnection']> = {
  edges?: Resolver<ReadonlyArray<ResolversTypes['UserEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type UserEdgeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['UserEdge'] = ResolversParentTypes['UserEdge']> = {
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = GraphQLContext> = {
  CreateUserResponse?: CreateUserResponseResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  DeleteUserResponse?: DeleteUserResponseResolvers<ContextType>;
  Error?: ErrorResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Mutation?: MutationResolvers<ContextType>;
  MutationResponse?: MutationResponseResolvers<ContextType>;
  Node?: NodeResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  UpdateUserResponse?: UpdateUserResponseResolvers<ContextType>;
  Upload?: GraphQLScalarType;
  User?: UserResolvers<ContextType>;
  UserConnection?: UserConnectionResolvers<ContextType>;
  UserEdge?: UserEdgeResolvers<ContextType>;
};

