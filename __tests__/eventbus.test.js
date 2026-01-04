/**
 * EventBus Tests
 */

import EventBus from '../src/events/EventBus';

describe('EventBus', () => {
  let eventBus

  beforeEach(() => {
    eventBus = new EventBus({ backend: 'local' })
  })

  afterEach(async () => {
    await eventBus.close()
  })

  describe('publish/subscribe', () => {
    test('should publish and receive events', async () => {
      const handler = jest.fn()
      
      await eventBus.subscribe('test.event', handler)
      await eventBus.publish('test.event', { message: 'Hello' })
      
      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(handler).toHaveBeenCalledWith({ message: 'Hello' })
    })

    test('should support multiple subscribers', async () => {
      const handler1 = jest.fn()
      const handler2 = jest.fn()
      
      await eventBus.subscribe('test.event', handler1)
      await eventBus.subscribe('test.event', handler2)
      await eventBus.publish('test.event', { data: 'test' })
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(handler1).toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
    })

    test('should support wildcard subscriptions', async () => {
      const handler = jest.fn()
      
      await eventBus.subscribe('user.*', handler)
      await eventBus.publish('user.created', { id: 1 })
      await eventBus.publish('user.updated', { id: 1 })
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(handler).toHaveBeenCalledTimes(2)
    })
  })

  describe('unsubscribe', () => {
    test('should unsubscribe from events', async () => {
      const handler = jest.fn()
      
      const unsubscribe = await eventBus.subscribe('test.event', handler)
      await eventBus.publish('test.event', { data: 'first' })
      
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(handler).toHaveBeenCalledTimes(1)
      
      await unsubscribe()
      await eventBus.publish('test.event', { data: 'second' })
      
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(handler).toHaveBeenCalledTimes(1) // Should not be called again
    })
  })

  describe('error handling', () => {
    test('should handle errors in handlers gracefully', async () => {
      // Suppress console.error for this test
      const consoleError = console.error
      console.error = jest.fn()

      const errorHandler = jest.fn(() => {
        throw new Error('Handler error')
      })
      const goodHandler = jest.fn()
      
      await eventBus.subscribe('test.event', errorHandler)
      await eventBus.subscribe('test.event', goodHandler)
      await eventBus.publish('test.event', { data: 'test' })
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Good handler should still be called despite error in errorHandler
      expect(goodHandler).toHaveBeenCalled()

      // Restore console.error
      console.error = consoleError
    })
  })
})
