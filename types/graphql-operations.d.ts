export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
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
};

export type CreateUserInput = {
  readonly email: Scalars['String']['input'];
  readonly firstName?: InputMaybe<Scalars['String']['input']>;
  readonly lastName?: InputMaybe<Scalars['String']['input']>;
  readonly password: Scalars['String']['input'];
  readonly role?: InputMaybe<UserRole>;
  readonly username: Scalars['String']['input'];
};

export type CreateUserResponse = MutationResponse & {
  readonly __typename?: 'CreateUserResponse';
  readonly errors?: Maybe<ReadonlyArray<Error>>;
  readonly message?: Maybe<Scalars['String']['output']>;
  readonly success: Scalars['Boolean']['output'];
  readonly user?: Maybe<User>;
};

export type DeleteUserResponse = MutationResponse & {
  readonly __typename?: 'DeleteUserResponse';
  readonly errors?: Maybe<ReadonlyArray<Error>>;
  readonly message?: Maybe<Scalars['String']['output']>;
  readonly success: Scalars['Boolean']['output'];
};

/** Generic error type */
export type Error = {
  readonly __typename?: 'Error';
  /** Error code */
  readonly code: Scalars['String']['output'];
  /** Additional error details */
  readonly details?: Maybe<Scalars['JSON']['output']>;
  /** Error field (for validation errors) */
  readonly field?: Maybe<Scalars['String']['output']>;
  /** Error message */
  readonly message: Scalars['String']['output'];
};

/** Filter operators */
export enum FilterOperator {
  Contains = 'CONTAINS',
  EndsWith = 'ENDS_WITH',
  Equals = 'EQUALS',
  GreaterThan = 'GREATER_THAN',
  GreaterThanOrEqual = 'GREATER_THAN_OR_EQUAL',
  In = 'IN',
  LessThan = 'LESS_THAN',
  LessThanOrEqual = 'LESS_THAN_OR_EQUAL',
  NotEquals = 'NOT_EQUALS',
  NotIn = 'NOT_IN',
  StartsWith = 'STARTS_WITH'
}

export type Mutation = {
  readonly __typename?: 'Mutation';
  /** Placeholder mutation */
  readonly _empty?: Maybe<Scalars['String']['output']>;
  /** Create a new user */
  readonly createUser: CreateUserResponse;
  /** Delete a user */
  readonly deleteUser: DeleteUserResponse;
  /** Update an existing user */
  readonly updateUser: UpdateUserResponse;
};


export type MutationCreateUserArgs = {
  input: CreateUserInput;
};


export type MutationDeleteUserArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUpdateUserArgs = {
  id: Scalars['ID']['input'];
  input: UpdateUserInput;
};

/** Generic mutation response */
export type MutationResponse = {
  /** Errors if any */
  readonly errors?: Maybe<ReadonlyArray<Error>>;
  /** Response message */
  readonly message?: Maybe<Scalars['String']['output']>;
  /** Success indicator */
  readonly success: Scalars['Boolean']['output'];
};

/** Generic node interface (for relay-style pagination) */
export type Node = {
  /** Unique ID */
  readonly id: Scalars['ID']['output'];
};

/** Generic pagination info */
export type PageInfo = {
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
};

/** Input for pagination */
export type PaginationInput = {
  /** Cursor for cursor-based pagination */
  readonly cursor?: InputMaybe<Scalars['String']['input']>;
  /** Items per page */
  readonly limit?: InputMaybe<Scalars['Int']['input']>;
  /** Page number (1-indexed) */
  readonly page?: InputMaybe<Scalars['Int']['input']>;
};

export type Query = {
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
};


export type QueryUserArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUsersArgs = {
  filter?: InputMaybe<UserFilterInput>;
  pagination?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<SortInput>;
};

/** Sort direction enum */
export enum SortDirection {
  Asc = 'ASC',
  Desc = 'DESC'
}

/** Input for sorting */
export type SortInput = {
  /** Sort direction */
  readonly direction?: InputMaybe<SortDirection>;
  /** Field to sort by */
  readonly field: Scalars['String']['input'];
};

export type Subscription = {
  readonly __typename?: 'Subscription';
  /** Placeholder subscription */
  readonly _empty?: Maybe<Scalars['String']['output']>;
  /** Subscribe to new users */
  readonly userCreated: User;
  /** Subscribe to user updates */
  readonly userUpdated: User;
};


export type SubscriptionUserUpdatedArgs = {
  userId?: InputMaybe<Scalars['ID']['input']>;
};

export type UpdateUserInput = {
  readonly avatar?: InputMaybe<Scalars['String']['input']>;
  readonly email?: InputMaybe<Scalars['String']['input']>;
  readonly firstName?: InputMaybe<Scalars['String']['input']>;
  readonly lastName?: InputMaybe<Scalars['String']['input']>;
  readonly username?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateUserResponse = MutationResponse & {
  readonly __typename?: 'UpdateUserResponse';
  readonly errors?: Maybe<ReadonlyArray<Error>>;
  readonly message?: Maybe<Scalars['String']['output']>;
  readonly success: Scalars['Boolean']['output'];
  readonly user?: Maybe<User>;
};

export type User = Node & {
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
};

export type UserConnection = {
  readonly __typename?: 'UserConnection';
  readonly edges: ReadonlyArray<UserEdge>;
  readonly pageInfo: PageInfo;
};

export type UserEdge = {
  readonly __typename?: 'UserEdge';
  readonly cursor: Scalars['String']['output'];
  readonly node: User;
};

export type UserFilterInput = {
  readonly email?: InputMaybe<Scalars['String']['input']>;
  readonly role?: InputMaybe<UserRole>;
  readonly search?: InputMaybe<Scalars['String']['input']>;
  readonly status?: InputMaybe<UserStatus>;
  readonly username?: InputMaybe<Scalars['String']['input']>;
};

export enum UserRole {
  Admin = 'ADMIN',
  Guest = 'GUEST',
  User = 'USER'
}

export enum UserStatus {
  Active = 'ACTIVE',
  Deleted = 'DELETED',
  Inactive = 'INACTIVE',
  Suspended = 'SUSPENDED'
}

export type GetUserQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetUserQuery = { readonly __typename?: 'Query', readonly user?: { readonly __typename?: 'User', readonly id: string, readonly email: string, readonly username: string, readonly firstName?: string | null, readonly lastName?: string | null, readonly avatar?: string | null, readonly role: UserRole, readonly status: UserStatus, readonly createdAt: Date, readonly updatedAt: Date } | null };

export type GetCurrentUserQueryVariables = Exact<{ [key: string]: never; }>;


export type GetCurrentUserQuery = { readonly __typename?: 'Query', readonly me?: { readonly __typename?: 'User', readonly id: string, readonly email: string, readonly username: string, readonly firstName?: string | null, readonly lastName?: string | null, readonly avatar?: string | null, readonly role: UserRole, readonly status: UserStatus, readonly createdAt: Date, readonly updatedAt: Date, readonly lastLoginAt?: Date | null } | null };

export type ListUsersQueryVariables = Exact<{
  pagination?: InputMaybe<PaginationInput>;
  filter?: InputMaybe<UserFilterInput>;
  sort?: InputMaybe<SortInput>;
}>;


export type ListUsersQuery = { readonly __typename?: 'Query', readonly users: { readonly __typename?: 'UserConnection', readonly edges: ReadonlyArray<{ readonly __typename?: 'UserEdge', readonly cursor: string, readonly node: { readonly __typename?: 'User', readonly id: string, readonly email: string, readonly username: string, readonly firstName?: string | null, readonly lastName?: string | null, readonly role: UserRole, readonly status: UserStatus, readonly createdAt: Date } }>, readonly pageInfo: { readonly __typename?: 'PageInfo', readonly hasNextPage: boolean, readonly hasPreviousPage: boolean, readonly startCursor?: string | null, readonly endCursor?: string | null, readonly totalCount?: number | null } } };

export type CreateUserMutationVariables = Exact<{
  input: CreateUserInput;
}>;


export type CreateUserMutation = { readonly __typename?: 'Mutation', readonly createUser: { readonly __typename?: 'CreateUserResponse', readonly success: boolean, readonly message?: string | null, readonly errors?: ReadonlyArray<{ readonly __typename?: 'Error', readonly code: string, readonly message: string, readonly field?: string | null }> | null, readonly user?: { readonly __typename?: 'User', readonly id: string, readonly email: string, readonly username: string, readonly role: UserRole, readonly status: UserStatus, readonly createdAt: Date } | null } };

export type UpdateUserMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateUserInput;
}>;


export type UpdateUserMutation = { readonly __typename?: 'Mutation', readonly updateUser: { readonly __typename?: 'UpdateUserResponse', readonly success: boolean, readonly message?: string | null, readonly errors?: ReadonlyArray<{ readonly __typename?: 'Error', readonly code: string, readonly message: string, readonly field?: string | null }> | null, readonly user?: { readonly __typename?: 'User', readonly id: string, readonly email: string, readonly username: string, readonly firstName?: string | null, readonly lastName?: string | null, readonly avatar?: string | null, readonly updatedAt: Date } | null } };

export type DeleteUserMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteUserMutation = { readonly __typename?: 'Mutation', readonly deleteUser: { readonly __typename?: 'DeleteUserResponse', readonly success: boolean, readonly message?: string | null, readonly errors?: ReadonlyArray<{ readonly __typename?: 'Error', readonly code: string, readonly message: string }> | null } };

export type OnUserUpdatedSubscriptionVariables = Exact<{
  userId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type OnUserUpdatedSubscription = { readonly __typename?: 'Subscription', readonly userUpdated: { readonly __typename?: 'User', readonly id: string, readonly email: string, readonly username: string, readonly firstName?: string | null, readonly lastName?: string | null, readonly status: UserStatus, readonly updatedAt: Date } };

export type OnUserCreatedSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type OnUserCreatedSubscription = { readonly __typename?: 'Subscription', readonly userCreated: { readonly __typename?: 'User', readonly id: string, readonly email: string, readonly username: string, readonly role: UserRole, readonly status: UserStatus, readonly createdAt: Date } };

export type UserBasicInfoFragment = { readonly __typename?: 'User', readonly id: string, readonly email: string, readonly username: string, readonly firstName?: string | null, readonly lastName?: string | null, readonly avatar?: string | null };

export type UserFullInfoFragment = { readonly __typename?: 'User', readonly role: UserRole, readonly status: UserStatus, readonly createdAt: Date, readonly updatedAt: Date, readonly lastLoginAt?: Date | null, readonly id: string, readonly email: string, readonly username: string, readonly firstName?: string | null, readonly lastName?: string | null, readonly avatar?: string | null };
