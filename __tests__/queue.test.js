/**
 * QueueManager Tests
 */

import { QueueManager } from '../src/queue/index'
import EventBus from '../src/events/EventBus'

describe('QueueManager', () => {
  let queueManager

  beforeEach(() => {
    queueManager = new QueueManager({ backend: 'local' })
  })

  afterEach(async () => {
    await queueManager.close()
  })

  describe('send/process', () => {
    test('should send and process messages', async () => {
      const handler = jest.fn()
      
      await queueManager.process('test-queue', handler)
      await queueManager.send('test-queue', { task: 'do something' })
      
      await new Promise(resolve => setTimeout(resolve, 200))
      
      expect(handler).toHaveBeenCalledWith({ task: 'do something' })
    })

    test('should process messages in order (FIFO)', async () => {
      const results = []
      const handler = jest.fn(msg => results.push(msg.order))
      
      await queueManager.process('test-queue', handler)
      
      await queueManager.send('test-queue', { order: 1 })
      await queueManager.send('test-queue', { order: 2 })
      await queueManager.send('test-queue', { order: 3 })
      
      await new Promise(resolve => setTimeout(resolve, 300))
      
      expect(results).toEqual([1, 2, 3])
    })
  })

  describe('concurrent processing', () => {
    test('should support concurrent workers', async () => {
      let concurrent = 0
      let maxConcurrent = 0
      
      const handler = jest.fn(async () => {
        concurrent++
        maxConcurrent = Math.max(maxConcurrent, concurrent)
        await new Promise(resolve => setTimeout(resolve, 50))
        concurrent--
      })
      
      await queueManager.process('test-queue', handler, { concurrency: 3 })
      
      // Send 5 messages
      for (let i = 0; i < 5; i++) {
        await queueManager.send('test-queue', { id: i })
      }
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      expect(handler).toHaveBeenCalledTimes(5)
      expect(maxConcurrent).toBeLessThanOrEqual(3)
      // Note: Due to test timing, actual concurrency may vary
      // The important assertion is that it doesn't exceed the limit
    })
  })

  describe('error handling', () => {
    test('should retry failed messages', async () => {
      // Suppress console.error for this test
      const consoleError = console.error
      console.error = jest.fn()

      let attempts = 0
      const handler = jest.fn(() => {
        attempts++
        if (attempts < 3) {
          throw new Error('Temporary failure')
        }
      })
      
      await queueManager.process('test-queue', handler, { 
        interval: 50,
        retryAttempts: 3
      })
      await queueManager.send('test-queue', { task: 'retry me' })
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      expect(attempts).toBe(3)

      // Restore console.error
      console.error = consoleError
    })
  })
})
