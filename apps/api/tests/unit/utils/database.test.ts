// ================================================================
// tests/utils/database.test.ts
// ================================================================

import { DatabaseUtils } from '../../../src/utils/database';
import DatabaseConnection from '../../../src/config/database';
import { ModelManager } from '../../../src/models';
import { Author, Category, Book } from '../../../src/models';
import { Sequelize } from 'sequelize';

// Mock dependencies
jest.mock('../../../src/config/database');
jest.mock('../../../src/models');
jest.mock('../../../src/models/Author');
jest.mock('../../../src/models/Category');
jest.mock('../../../src/models/Book');

describe('DatabaseUtils', () => {
  let mockSequelize: jest.Mocked<Sequelize>;
  let mockDatabaseConnection: jest.Mocked<typeof DatabaseConnection>;
  let mockModelManager: jest.Mocked<typeof ModelManager>;
  let mockAuthor: jest.Mocked<typeof Author>;
  let mockCategory: jest.Mocked<typeof Category>;
  let mockBook: jest.Mocked<typeof Book>;

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
      Author: Author as any,
      Category: Category as any,
      Book: Book as any,
      BookAuthor: { count: jest.fn().mockResolvedValue(0) } as any,
      BookCategory: { count: jest.fn().mockResolvedValue(0) } as any,
    });

    // Mock Author model
    mockAuthor = Author as jest.Mocked<typeof Author>;
    mockAuthor.findOrCreateAuthor.mockResolvedValue([{ id: 1, name: 'Test', surname: 'Author' } as any, true]);
    mockAuthor.count.mockResolvedValue(5);

    // Mock Category model
    mockCategory = Category as jest.Mocked<typeof Category>;
    mockCategory.findOrCreateCategory.mockResolvedValue([{ id: 1, name: 'Test Category' } as any, true]);
    mockCategory.count.mockResolvedValue(3);

    // Mock Book model
    mockBook = Book as jest.Mocked<typeof Book>;
    mockBook.createBook.mockResolvedValue({
      id: 1,
      addAuthors: jest.fn(),
      addCategories: jest.fn(),
    } as any);
    mockBook.count.mockResolvedValue(2);

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

  describe('seedDatabase', () => {
    beforeEach(async () => {
      await DatabaseUtils.initialize();
    });

    it('should seed database successfully', async () => {
      const mockAuthors = [
        { id: 1, name: 'George', surname: 'Orwell' },
        { id: 2, name: 'Jane', surname: 'Austen' },
      ];
      const mockCategories = [
        { id: 1, name: 'Fiction' },
        { id: 2, name: 'Classic Literature' },
      ];

      mockAuthor.findOrCreateAuthor
        .mockResolvedValueOnce([mockAuthors[0] as any, true])
        .mockResolvedValueOnce([mockAuthors[1] as any, true]);

      mockCategory.findOrCreateCategory
        .mockResolvedValueOnce([mockCategories[0] as any, true])
        .mockResolvedValueOnce([mockCategories[1] as any, true]);

      await DatabaseUtils.seedDatabase();

      // Verify authors were seeded
      expect(mockAuthor.findOrCreateAuthor).toHaveBeenCalledTimes(8); // 8 authors in seed data

      // Verify categories were seeded
      expect(mockCategory.findOrCreateCategory).toHaveBeenCalledTimes(10); // 10 categories in seed data

      // Verify books were seeded
      expect(mockBook.createBook).toHaveBeenCalledTimes(5); // 5 books in seed data
    });

    it('should throw error if database not initialized', async () => {
      (DatabaseUtils as any).sequelize = null;

      await expect(DatabaseUtils.seedDatabase()).rejects.toThrow('Database not initialized. Call initialize() first.');
    });

    it('should handle book creation with associations', async () => {
      const mockAuthor = { id: 1, name: 'George', surname: 'Orwell' };
      const mockCategory = { id: 1, name: 'Fiction' };
      const mockBookInstance = {
        id: 1,
        addAuthors: jest.fn(),
        addCategories: jest.fn(),
      };

      (Author.findOrCreateAuthor as jest.Mock).mockResolvedValue([mockAuthor as any, true]);
      (Category.findOrCreateCategory as jest.Mock).mockResolvedValue([mockCategory as any, true]);
      (Book.createBook as jest.Mock).mockResolvedValue(mockBookInstance as any);

      await DatabaseUtils.seedDatabase();

      expect(mockBookInstance.addAuthors).toHaveBeenCalled();
      expect(mockBookInstance.addCategories).toHaveBeenCalled();
    });
  });

  describe('resetDatabase', () => {
    beforeEach(async () => {
      await DatabaseUtils.initialize();
    });

    it('should reset database successfully', async () => {
      jest.spyOn(DatabaseUtils, 'syncDatabase').mockResolvedValue(undefined);
      jest.spyOn(DatabaseUtils, 'seedDatabase').mockResolvedValue(undefined);

      await DatabaseUtils.resetDatabase();

      expect(DatabaseUtils.syncDatabase).toHaveBeenCalledWith({ force: true });
      expect(DatabaseUtils.seedDatabase).toHaveBeenCalled();
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