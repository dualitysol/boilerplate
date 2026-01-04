/**
 * UserService Tests
 */

import { UserModel } from '../model';

describe('UserModel', () => {
  let model;
  let mockStorage;
  let mockEventBus;
  let mockQueueManager;

  beforeEach(() => {
    mockStorage = {
      findOne: jest.fn(),
      insertOne: jest.fn(),
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

    model = new UserModel({
      storage: mockStorage,
      eventBus: mockEventBus,
      queueManager: mockQueueManager
    });
  });

  describe('registerUser', () => {
    it('should register a new user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      };

      mockStorage.findOne.mockResolvedValue(null); // No existing user
      mockStorage.insertOne.mockResolvedValue({
        id: '1',
        ...userData,
        password: 'hashed',
        createdAt: new Date().toISOString()
      });

      const result = await model.registerUser(userData);

      expect(result).toBeDefined();
      expect(result.username).toBe('testuser');
      expect(result.password).toBeUndefined(); // Password should be removed
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'user.registered',
        expect.objectContaining({ userId: '1' })
      );
    });

    it('should throw error if username exists', async () => {
      mockStorage.findOne.mockResolvedValue({ id: '1', username: 'existing' });

      await expect(
        model.registerUser({ username: 'existing', email: 'test@test.com', password: 'pass' })
      ).rejects.toThrow('Username already exists');
    });
  });

  describe('loginUser', () => {
    it('should login user with correct credentials', async () => {
      const user = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        password: model.hashPassword('password123')
      };

      mockStorage.findOne.mockResolvedValue(user);

      const result = await model.loginUser({
        username: 'testuser',
        password: 'password123'
      });

      expect(result).toBeDefined();
      expect(result.password).toBeUndefined();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'user.loggedIn',
        expect.objectContaining({ userId: '1' })
      );
    });

    it('should throw error with wrong credentials', async () => {
      mockStorage.findOne.mockResolvedValue(null);

      await expect(
        model.loginUser({ username: 'test', password: 'wrong' })
      ).rejects.toThrow('Invalid username or password');
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const user = {
        id: '1',
        username: 'testuser',
        password: 'hashed'
      };

      mockStorage.findOne.mockResolvedValue(user);

      const result = await model.findById('1');

      expect(result).toBeDefined();
      expect(result.password).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('should return all users without passwords', async () => {
      const users = [
        { id: '1', username: 'user1', password: 'hash1' },
        { id: '2', username: 'user2', password: 'hash2' }
      ];

      mockStorage.find.mockResolvedValue(users);

      const result = await model.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].password).toBeUndefined();
      expect(result[1].password).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      const updated = {
        id: '1',
        username: 'test',
        email: 'new@email.com',
        password: 'hashed'
      };

      mockStorage.updateOne.mockResolvedValue(updated);

      const result = await model.update('1', { email: 'new@email.com' });

      expect(result.password).toBeUndefined();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'user.updated',
        expect.objectContaining({ userId: '1' })
      );
    });
  });

  describe('delete', () => {
    it('should delete user and publish event', async () => {
      mockStorage.deleteOne.mockResolvedValue(true);

      const result = await model.delete('1');

      expect(result).toBe(true);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'user.deleted',
        { userId: '1' }
      );
    });
  });

  describe('validate', () => {
    it('should validate username length', () => {
      expect(() => model.validate({ username: 'ab' }))
        .toThrow('Username must be at least 3 characters');
    });

    it('should validate email format', () => {
      expect(() => model.validate({ email: 'invalid' }))
        .toThrow('Invalid email address');
    });

    it('should validate password length', () => {
      expect(() => model.validate({ password: '12345' }))
        .toThrow('Password must be at least 6 characters');
    });
  });
});
