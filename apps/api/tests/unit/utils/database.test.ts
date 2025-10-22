// ================================================================
// tests/utils/database.test.ts
// ================================================================

import { DatabaseUtils } from '../../../src/utils/database';
import DatabaseConnection from '../../../src/config/database';
import { ModelManager } from '../../../src/models';
import { Sequelize } from 'sequelize';

// Mock dependencies
jest.mock('../../../src/config/database');
jest.mock('../../../src/models');

describe('DatabaseUtils', () => {
  let mockSequelize: jest.Mocked<Sequelize>;
  let mockDatabaseConnection: jest.Mocked<typeof DatabaseConnection>;
  let mockModelManager: jest.Mocked<typeof ModelManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Sequelize instance
    mockSequelize = {
      sync: jest.fn(),
    } as any;

    // Mock DatabaseConnection
    mockDatabaseConnection = DatabaseConnection as jest.Mocked<typeof DatabaseConnection>;
    mockDatabaseConnection.getInstance.mockReturnValue(mockSequelize);
    mockDatabaseConnection.testConnection.mockResolvedValue(true);
    mockDatabaseConnection.closeConnection.mockResolvedValue(undefined);

    // Mock ModelManager
    mockModelManager = ModelManager as jest.Mocked<typeof ModelManager>;
    mockModelManager.initialize.mockReturnValue(undefined);
    mockModelManager.close.mockResolvedValue(undefined);
    mockModelManager.isInitialized.mockReturnValue(true);
    mockModelManager.getModels.mockReturnValue({
      User: { count: jest.fn().mockResolvedValue(1) } as any,
      Author: { count: jest.fn().mockResolvedValue(5) } as any,
      Category: { count: jest.fn().mockResolvedValue(3) } as any,
      Book: { count: jest.fn().mockResolvedValue(2) } as any,
      BookAuthor: { count: jest.fn().mockResolvedValue(0) } as any,
      BookCategory: { count: jest.fn().mockResolvedValue(0) } as any,
    });

    // Clear any static state
    (DatabaseUtils as any).sequelize = null;
  });

  describe('initialize', () => {
    it('should initialize database successfully', async () => {
      const result = await DatabaseUtils.initialize();

      expect(mockDatabaseConnection.getInstance).toHaveBeenCalled();
      expect(mockDatabaseConnection.testConnection).toHaveBeenCalled();
      expect(mockModelManager.initialize).toHaveBeenCalledWith(mockSequelize);
      expect(result).toBe(mockSequelize);
    });

    it('should return existing instance if already initialized', async () => {
      // Initialize once
      await DatabaseUtils.initialize();
      
      // Clear mocks to verify second call behavior
      jest.clearAllMocks();
      
      // Initialize again
      const result = await DatabaseUtils.initialize();

      expect(mockDatabaseConnection.getInstance).not.toHaveBeenCalled();
      expect(mockDatabaseConnection.testConnection).not.toHaveBeenCalled();
      expect(mockModelManager.initialize).not.toHaveBeenCalled();
      expect(result).toBe(mockSequelize);
    });

    it('should throw error if database connection fails', async () => {
      mockDatabaseConnection.testConnection.mockResolvedValue(false);

      await expect(DatabaseUtils.initialize()).rejects.toThrow('Failed to establish database connection');
    });
  });

  describe('syncDatabase', () => {
    beforeEach(async () => {
      await DatabaseUtils.initialize();
    });

    it('should sync database with default options', async () => {
      await DatabaseUtils.syncDatabase();

      expect(mockSequelize.sync).toHaveBeenCalledWith({ force: false, alter: false });
    });

    it('should sync database with force option', async () => {
      await DatabaseUtils.syncDatabase({ force: true });

      expect(mockSequelize.sync).toHaveBeenCalledWith({ force: true, alter: false });
    });

    it('should sync database with alter option', async () => {
      await DatabaseUtils.syncDatabase({ alter: true });

      expect(mockSequelize.sync).toHaveBeenCalledWith({ force: false, alter: true });
    });

    it('should sync database with both options', async () => {
      await DatabaseUtils.syncDatabase({ force: true, alter: true });

      expect(mockSequelize.sync).toHaveBeenCalledWith({ force: true, alter: true });
    });

    it('should throw error if database not initialized', async () => {
      (DatabaseUtils as any).sequelize = null;

      await expect(DatabaseUtils.syncDatabase()).rejects.toThrow('Database not initialized. Call initialize() first.');
    });
  });

  describe('resetDatabase', () => {
    beforeEach(async () => {
      await DatabaseUtils.initialize();
    });

    it('should reset database successfully', async () => {
      jest.spyOn(DatabaseUtils, 'syncDatabase').mockResolvedValue(undefined);

      await DatabaseUtils.resetDatabase();

      expect(DatabaseUtils.syncDatabase).toHaveBeenCalledWith({ force: true });
    });

    it('should throw error if database not initialized', async () => {
      (DatabaseUtils as any).sequelize = null;

      await expect(DatabaseUtils.resetDatabase()).rejects.toThrow('Database not initialized. Call initialize() first.');
    });

    it('should handle reset errors', async () => {
      const error = new Error('Reset failed');
      jest.spyOn(DatabaseUtils, 'syncDatabase').mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(DatabaseUtils.resetDatabase()).rejects.toThrow('Reset failed');
      expect(consoleSpy).toHaveBeenCalledWith('Database reset failed:', error);

      consoleSpy.mockRestore();
    });
  });

  describe('closeConnection', () => {
    it('should close connection when initialized', async () => {
      await DatabaseUtils.initialize();
      
      await DatabaseUtils.closeConnection();

      expect(mockModelManager.close).toHaveBeenCalled();
      expect(mockDatabaseConnection.closeConnection).toHaveBeenCalled();
      expect((DatabaseUtils as any).sequelize).toBeNull();
    });

    it('should handle closure when not initialized', async () => {
      await DatabaseUtils.closeConnection();

      expect(mockModelManager.close).not.toHaveBeenCalled();
      expect(mockDatabaseConnection.closeConnection).not.toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('should return status when database is connected and initialized', async () => {
      await DatabaseUtils.initialize();

      const status = await DatabaseUtils.getStatus();

      expect(status).toEqual({
        connected: true,
        modelsInitialized: true,
        tableStats: {
          authors: 5,
          categories: 3,
          books: 2,
          bookAuthors: 0,
          bookCategories: 0,
        },
      });
    });

    it('should return disconnected status when database is not initialized', async () => {
      mockDatabaseConnection.testConnection.mockResolvedValue(false);

      const status = await DatabaseUtils.getStatus();

      expect(status).toEqual({
        connected: false,
        modelsInitialized: true,
        tableStats: {
          authors: 0,
          categories: 0,
          books: 0,
          bookAuthors: 0,
          bookCategories: 0,
        },
      });
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Initialize database first so sequelize instance exists
      await DatabaseUtils.initialize();
      
      // Then mock testConnection to throw an error
      mockDatabaseConnection.testConnection.mockRejectedValue(new Error('Connection error'));

      const status = await DatabaseUtils.getStatus();

      expect(status).toEqual({
        connected: false,
        modelsInitialized: false, // Should be false in catch block
        tableStats: {
          authors: 0,
          categories: 0,
          books: 0,
          bookAuthors: 0,
          bookCategories: 0,
        },
      });

      expect(consoleSpy).toHaveBeenCalledWith('Error getting database status:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should return zero counts when models not initialized', async () => {
      mockModelManager.isInitialized.mockReturnValue(false);

      const status = await DatabaseUtils.getStatus();

      expect(status.modelsInitialized).toBe(false);
      expect(status.tableStats).toEqual({
        authors: 0,
        categories: 0,
        books: 0,
        bookAuthors: 0,
        bookCategories: 0,
      });
    });
  });
});