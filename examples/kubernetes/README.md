# Kubernetes Deployment Example

Deploy services in Kubernetes using NATS for communication.

## Structure

```
kubernetes/
├── services/
│   ├── UserService/
│   │   ├── Dockerfile
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   └── ProductService/
│       ├── Dockerfile
│       ├── deployment.yaml
│       └── service.yaml
├── gateway/
│   ├── Dockerfile
│   ├── deployment.yaml
│   └── service.yaml
└── infrastructure/
    ├── mongodb.yaml
    └── nats.yaml
```

## services/UserService/index.js

```javascript
import { Bootstrap } from '@dualitysol/boilerplate'
import UserService from './model.js'
import typeDefs from './typeDefs/index.js'
import resolvers from './resolvers/index.js'

await Bootstrap.createServer([UserService], {
    runtime: {
        type: 'kubernetes'
    },
    
    transport: {
        type: 'http',
        port: 3000,
        healthCheck: true
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
        servers: [process.env.NATS_URL || 'nats://nats:4222']
    },
    
    queue: {
        backend: 'nats',
        servers: [process.env.NATS_URL || 'nats://nats:4222']
    },
    
    registry: {
        backend: 'consul',
        host: process.env.CONSUL_HOST || 'consul'
    }
})

console.log('✅ UserService started on port 3000')
```

## services/UserService/model.js

```javascript
import { Microservice } from '@dualitysol/boilerplate'
import { RequireAuth, InternalOnly } from '@dualitysol/boilerplate/decorators'

export class UserService extends Microservice {
    get collectionName() {
        return 'users'
    }

    async initialize() {
        await this.subscribe('order.created', async (data) => {
            this.logger.info('Order created for user:', data.userId)
        })
    }

    // Public
    async getUser(id) {
        return this.findOne({ _id: id })
    }

    // Protected
    @RequireAuth
    async updateUser(id, data, context) {
        return this.updateOne({ _id: id }, { $set: data })
    }

    // Only from other services
    @InternalOnly
    async getUsersByIds(ids, context) {
        return this.findMany({ _id: { $in: ids } })
    }
}

export default UserService
```

## services/UserService/Dockerfile

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "index.js"]
```

## services/UserService/deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
      - name: user-service
        image: your-registry/user-service:latest
        ports:
        - containerPort: 3000
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: mongodb-secret
              key: uri
        - name: NATS_URL
          value: "nats://nats:4222"
        - name: CONSUL_HOST
          value: "consul"
        - name: NODE_ENV
          value: "production"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## services/UserService/service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: user-service
spec:
  selector:
    app: user-service
  ports:
  - protocol: TCP
    port: 3000
    targetPort: 3000
  type: ClusterIP
```

## gateway/index.js

```javascript
import { Bootstrap } from '@dualitysol/boilerplate'

// Gateway aggregates schemas from all services
await Bootstrap.createGateway({
    port: 4000,
    host: '0.0.0.0',
    
    registry: {
        backend: 'consul',
        host: process.env.CONSUL_HOST || 'consul'
    },
    
    services: [
        { name: 'UserService', url: 'http://user-service:3000/graphql' },
        { name: 'ProductService', url: 'http://product-service:3000/graphql' },
        { name: 'OrderService', url: 'http://order-service:3000/graphql' }
    ]
})

console.log('✅ API Gateway started on port 4000')
```

## infrastructure/nats.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nats
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nats
  template:
    metadata:
      labels:
        app: nats
    spec:
      containers:
      - name: nats
        image: nats:2.9-alpine
        ports:
        - containerPort: 4222
---
apiVersion: v1
kind: Service
metadata:
  name: nats
spec:
  selector:
    app: nats
  ports:
  - protocol: TCP
    port: 4222
    targetPort: 4222
  type: ClusterIP
```

## Deploy

```bash
# Build images
docker build -t your-registry/user-service:latest ./services/UserService
docker build -t your-registry/product-service:latest ./services/ProductService
docker build -t your-registry/gateway:latest ./gateway

# Push to registry
docker push your-registry/user-service:latest
docker push your-registry/product-service:latest
docker push your-registry/gateway:latest

# Deploy infrastructure
kubectl apply -f infrastructure/

# Deploy services
kubectl apply -f services/UserService/
kubectl apply -f services/ProductService/

# Deploy gateway
kubectl apply -f gateway/

# Check status
kubectl get pods
kubectl get services

# View logs
kubectl logs -f deployment/user-service
```
