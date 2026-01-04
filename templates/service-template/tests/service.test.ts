/**
 * {{ServiceName}} Service Tests
 */

import { {{ServiceName}}Model } from '../model';

describe('{{ServiceName}}Model', () => {
  let model;
  let mockStorage;
  let mockEventBus;
  let mockQueueManager;

  beforeEach(() => {
    // Mock dependencies
    mockStorage = {
      insertOne: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn()
    };

    mockEventBus = {
      publish: jest.fn(),
      subscribe: jest.fn()
    };

    mockQueueManager = {
      enqueue: jest.fn()
    };

    model = new {{ServiceName}}Model({
      storage: mockStorage,
      eventBus: mockEventBus,
      queueManager: mockQueueManager
    });
  });

  describe('create', () => {
    it('should create a new item', async () => {
      const mockData = { name: 'Test' };
      const mockResult = { id: '1', ...mockData };
      mockStorage.insertOne.mockResolvedValue(mockResult);

      const result = await model.create(mockData);

      expect(result).toEqual(mockResult);
      expect(mockStorage.insertOne).toHaveBeenCalledWith(
        '{{serviceName}}',
        expect.objectContaining(mockData)
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        '{{serviceName}}.created',
        expect.objectContaining({ id: '1' })
      );
    });

    it('should throw error for invalid data', async () => {
      await expect(model.create(null)).rejects.toThrow('Data is required');
    });
  });

  describe('findById', () => {
    it('should find item by id', async () => {
      const mockItem = { id: '1', name: 'Test' };
      mockStorage.findOne.mockResolvedValue(mockItem);

      const result = await model.findById('1');

      expect(result).toEqual(mockItem);
      expect(mockStorage.findOne).toHaveBeenCalledWith('{{serviceName}}', { id: '1' });
    });
  });

  describe('findAll', () => {
    it('should find all items', async () => {
      const mockItems = [
        { id: '1', name: 'Test1' },
        { id: '2', name: 'Test2' }
      ];
      mockStorage.find.mockResolvedValue(mockItems);

      const result = await model.findAll();

      expect(result).toEqual(mockItems);
      expect(mockStorage.find).toHaveBeenCalledWith('{{serviceName}}', {});
    });

    it('should find items with filter', async () => {
      const mockFilter = { name: 'Test1' };
      mockStorage.find.mockResolvedValue([{ id: '1', name: 'Test1' }]);

      await model.findAll(mockFilter);

      expect(mockStorage.find).toHaveBeenCalledWith('{{serviceName}}', mockFilter);
    });
  });

  describe('update', () => {
    it('should update item', async () => {
      const mockUpdated = { id: '1', name: 'Updated' };
      mockStorage.updateOne.mockResolvedValue(mockUpdated);

      const result = await model.update('1', { name: 'Updated' });

      expect(result).toEqual(mockUpdated);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        '{{serviceName}}.updated',
        expect.objectContaining({ id: '1' })
      );
    });
  });

  describe('delete', () => {
    it('should delete item', async () => {
      mockStorage.deleteOne.mockResolvedValue(true);

      const result = await model.delete('1');

      expect(result).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        '{{serviceName}}.deleted',
        { id: '1' }
      );
    });

    it('should not publish event if delete failed', async () => {
      mockStorage.deleteOne.mockResolvedValue(false);

      await model.delete('1');

      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });
});
