# AWS Lambda Example

Deploy each service as a separate Lambda function.

## Structure

```
aws-lambda/
├── services/
│   ├── UserService/
│   │   ├── model.js
│   │   ├── handler.js
│   │   ├── typeDefs/
│   │   └── resolvers/
│   └── ProductService/
│       ├── model.js
│       ├── handler.js
│       ├── typeDefs/
│       └── resolvers/
├── gateway/
│   └── handler.js
└── serverless.yml
```

## services/UserService/handler.js

```javascript
import { Bootstrap } from '@dualitysol/boilerplate'
import UserService from './model.js'
import typeDefs from './typeDefs/index.js'
import resolvers from './resolvers/index.js'

export const handler = Bootstrap.createLambdaHandler([UserService], {
    runtime: {
        type: 'lambda'
    },
    
    graphql: {
        typeDefs,
        resolvers
    },
    
    storage: {
        mongodb: {
            uri: process.env.MONGODB_URI
        }
    },
    
    events: {
        backend: 'nats',
        servers: [process.env.NATS_URL]
    },
    
    queue: {
        backend: 'nats',
        servers: [process.env.NATS_URL]
    }
})
```

## services/UserService/model.js

```javascript
import { Microservice } from '@dualitysol/boilerplate'
import { RequireAuth, RequireRole } from '@dualitysol/boilerplate/decorators'

export class UserService extends Microservice {
    get collectionName() {
        return 'users'
    }

    async initialize() {
        await this.subscribe('order.created', async (data) => {
            this.logger.info('Order created:', data)
        })
    }

    // Public method
    async getUser(id) {
        return this.findOne({ _id: id })
    }

    // Requires authentication
    @RequireAuth
    async updateProfile(userId, data, context) {
        return this.updateOne({ _id: userId }, { $set: data })
    }

    // Admin only
    @RequireRole('admin')
    async deleteUser(id, context) {
        return this.deleteOne({ _id: id })
    }
}

export default UserService
```

## serverless.yml

```yaml
service: microservices-app

provider:
  name: aws
  runtime: nodejs22.x
  region: us-east-1
  environment:
    MONGODB_URI: ${env:MONGODB_URI}
    NATS_URL: ${env:NATS_URL}

functions:
  userService:
    handler: services/UserService/handler.handler
    events:
      - httpApi:
          path: /graphql
          method: POST
  
  productService:
    handler: services/ProductService/handler.handler
    events:
      - httpApi:
          path: /graphql
          method: POST

plugins:
  - serverless-offline
```

## Deploy

```bash
# Install dependencies
npm install

# Deploy to AWS
serverless deploy

# Deploy specific function
serverless deploy function -f userService

# View logs
serverless logs -f userService --tail
```

## Environment Variables

Create `.env` file:

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/myapp
NATS_URL=nats://your-nats-server:4222
```
