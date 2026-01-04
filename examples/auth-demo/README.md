# Auth Demo

Complete demonstration of authentication with JWT, OAuth2, and Sessions.

## Structure

```
Auth/
├── typeDefs/
│   └── schema.graphql    # GraphQL schema
├── resolvers/
│   ├── queries.js        # Query resolvers
│   └── mutations.js      # Mutation resolvers
├── model/
│   └── index.js          # User model & validation
└── index.js              # Service entry point
```

## Running

```bash
npm install
npm start
```

Open http://localhost:4002/graphql

## Authentication Methods

- **JWT**: Access tokens (15min) + Refresh tokens (7d)
- **OAuth2**: GitHub, Google (with PKCE)
- **Sessions**: Cookie-based with fingerprinting

## Example Mutations

### Register

```graphql
mutation {
  register(input: {
    email: "user@example.com"
    password: "password123"
    name: "John Doe"
  }) {
    success
    message
    user {
      id
      email
      name
      role
    }
    tokens {
      accessToken
      refreshToken
      expiresIn
    }
  }
}
```

### Login

```graphql
mutation {
  login(input: {
    email: "user@example.com"
    password: "password123"
  }) {
    success
    user {
      id
      email
      name
    }
    tokens {
      accessToken
      refreshToken
    }
  }
}
```

### Get Current User

Add HTTP header:
```
Authorization: Bearer <accessToken>
```

```graphql
query {
  me {
    id
    email
    name
    role
  }
}
```

### Refresh Token

```graphql
mutation {
  refreshToken(refreshToken: "your-refresh-token") {
    success
    tokens {
      accessToken
      refreshToken
    }
  }
}
```

### Logout

```graphql
mutation {
  logout(refreshToken: "your-refresh-token") {
    success
    message
  }
}
```

### OAuth2 Flow

1. Get authorization URL:
```graphql
query {
  getOAuth2Url(provider: "github") {
    url
    state
  }
}
```

2. Redirect user to URL
3. User authorizes
4. Provider redirects back with code
5. Exchange code for tokens:

```graphql
mutation {
  oauth2Callback(code: "auth-code", state: "state-param") {
    success
    user {
      id
      email
      name
    }
    tokens {
      accessToken
      refreshToken
    }
  }
}
```

## Features Demonstrated

✅ JWT access + refresh tokens  
✅ Token rotation on refresh  
✅ Token revocation (logout)  
✅ Multi-device logout  
✅ OAuth2 with PKCE  
✅ Session management  
✅ Session fingerprinting  
✅ Password hashing  
✅ Input validation  
