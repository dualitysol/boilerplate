/// <reference types="reflect-metadata" />

/**
 * Global type definitions for reflect-metadata
 */
declare global {
  interface ReflectConstructor {
    defineMetadata(metadataKey: any, metadataValue: any, target: Object): void
    defineMetadata(metadataKey: any, metadataValue: any, target: Object, propertyKey: string | symbol): void
    getMetadata(metadataKey: any, target: Object): any
    getMetadata(metadataKey: any, target: Object, propertyKey: string | symbol): any
    getOwnMetadata(metadataKey: any, target: Object): any
    getOwnMetadata(metadataKey: any, target: Object, propertyKey: string | symbol): any
    hasMetadata(metadataKey: any, target: Object): boolean
    hasMetadata(metadataKey: any, target: Object, propertyKey: string | symbol): boolean
  }
}

export {}
