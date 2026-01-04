/**
 * Authorization decorators
 */

/**
 * Require authentication
 */
export function RequireAuth(target: any, propertyKey: string, descriptor: PropertyDescriptor): void {
  const originalMethod = descriptor.value
  
  descriptor.value = async function (...args: any[]) {
    const context = args[args.length - 1]
    
    if (!context || !context.user) {
      throw new Error('Authentication required')
    }
    
    return originalMethod.apply(this, args)
  }
}

/**
 * Require specific roles
 */
export function RequireRole(roles: string[]): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      const context = args[args.length - 1]
      
      if (!context || !context.user) {
        throw new Error('Authentication required')
      }
      
      const userRoles = context.user.roles || []
      const hasRole = roles.some(role => userRoles.includes(role))
      
      if (!hasRole) {
        throw new Error(`Required roles: ${roles.join(', ')}`)
      }
      
      return originalMethod.apply(this, args)
    }
  }
}

/**
 * Require specific permissions
 */
export function RequirePermission(permissions: string[]): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      const context = args[args.length - 1]
      
      if (!context || !context.user) {
        throw new Error('Authentication required')
      }
      
      const userPermissions = context.user.permissions || []
      const hasPermission = permissions.every(perm => userPermissions.includes(perm))
      
      if (!hasPermission) {
        throw new Error(`Required permissions: ${permissions.join(', ')}`)
      }
      
      return originalMethod.apply(this, args)
    }
  }
}

/**
 * Check ownership
 */
export function RequireOwnership(resourceIdParam: string = 'id'): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      const context = args[args.length - 1]
      
      if (!context || !context.user) {
        throw new Error('Authentication required')
      }
      
      // Get resource ID from args
      const resourceId = args[0]?.[resourceIdParam]
      
      // Check if user owns the resource
      const isOwner = await this.checkOwnership?.(context.user.id, resourceId)
      
      if (!isOwner) {
        throw new Error('You do not own this resource')
      }
      
      return originalMethod.apply(this, args)
    }
  }
}
