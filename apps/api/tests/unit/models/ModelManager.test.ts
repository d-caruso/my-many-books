// ================================================================
// tests/models/ModelManager.test.ts
// Simple tests for ModelManager coverage  
// ================================================================

import { ModelManager } from '../../../src/models/index';
import { ModelAssociations } from '../../../src/models/associations/ModelAssociations';
import { User } from '../../../src/models/User';
import { Author } from '../../../src/models/Author';
import { Category } from '../../../src/models/Category';
import { Book } from '../../../src/models/Book';
import { BookAuthor } from '../../../src/models/BookAuthor';
import { BookCategory } from '../../../src/models/BookCategory';

// Mock all dependencies
jest.mock('../../../src/models/associations/ModelAssociations');
jest.mock('../../../src/models/User');
jest.mock('../../../src/models/Author');
jest.mock('../../../src/models/Category');
jest.mock('../../../src/models/Book');
jest.mock('../../../src/models/BookAuthor');
jest.mock('../../../src/models/BookCategory');

describe('ModelManager', () => {
  let mockSequelize: any;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset ModelManager state
    (ModelManager as any).sequelize = null;
    (ModelManager as any).initialized = false;

    mockSequelize = {
      close: jest.fn().mockResolvedValue(undefined),
      sync: jest.fn().mockResolvedValue(undefined)
    };

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    // Mock all the init methods
    (User.initialize as jest.Mock) = jest.fn();
    (Author.initModel as jest.Mock) = jest.fn();
    (Category.initModel as jest.Mock) = jest.fn();
    (Book.initModel as jest.Mock) = jest.fn();
    (BookAuthor.initModel as jest.Mock) = jest.fn();
    (BookCategory.initModel as jest.Mock) = jest.fn();

    // Mock ModelAssociations methods
    (ModelAssociations.registerModel as jest.Mock) = jest.fn();
    (ModelAssociations.defineAssociations as jest.Mock) = jest.fn();
    (ModelAssociations.syncModels as jest.Mock) = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('initialize', () => {
    it('should initialize ModelManager successfully', () => {
      ModelManager.initialize(mockSequelize);

      expect(User.initialize).toHaveBeenCalledWith(mockSequelize);
      expect(Author.initModel).toHaveBeenCalledWith(mockSequelize);
      expect(Category.initModel).toHaveBeenCalledWith(mockSequelize);
      expect(Book.initModel).toHaveBeenCalledWith(mockSequelize);
      expect(BookAuthor.initModel).toHaveBeenCalledWith(mockSequelize);
      expect(BookCategory.initModel).toHaveBeenCalledWith(mockSequelize);

      expect(ModelAssociations.registerModel).toHaveBeenCalledTimes(6);
      expect(ModelAssociations.registerModel).toHaveBeenCalledWith('User', User);
      expect(ModelAssociations.registerModel).toHaveBeenCalledWith('Author', Author);
      expect(ModelAssociations.registerModel).toHaveBeenCalledWith('Category', Category);
      expect(ModelAssociations.registerModel).toHaveBeenCalledWith('Book', Book);
      expect(ModelAssociations.registerModel).toHaveBeenCalledWith('BookAuthor', BookAuthor);
      expect(ModelAssociations.registerModel).toHaveBeenCalledWith('BookCategory', BookCategory);

      expect(ModelAssociations.defineAssociations).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('Model manager initialized with all models and associations');
    });

    it('should not reinitialize if already initialized', () => {
      // First initialization
      ModelManager.initialize(mockSequelize);
      
      jest.clearAllMocks();
      
      // Second initialization - should return early
      ModelManager.initialize(mockSequelize);

      expect(User.initialize).not.toHaveBeenCalled();
      expect(Author.initModel).not.toHaveBeenCalled();
      expect(ModelAssociations.registerModel).not.toHaveBeenCalled();
    });
  });

  describe('getSequelize', () => {
    it('should return sequelize instance when initialized', () => {
      ModelManager.initialize(mockSequelize);
      
      const result = ModelManager.getSequelize();
      
      expect(result).toBe(mockSequelize);
    });

    it('should throw error when not initialized', () => {
      expect(() => ModelManager.getSequelize()).toThrow(
        'ModelManager not initialized. Call initialize() first.'
      );
    });
  });

  describe('syncDatabase', () => {
    it('should sync database when initialized', async () => {
      ModelManager.initialize(mockSequelize);
      
      await ModelManager.syncDatabase();
      
      expect(ModelAssociations.syncModels).toHaveBeenCalledWith(mockSequelize, false);
    });

    it('should sync database with force option', async () => {
      ModelManager.initialize(mockSequelize);
      
      await ModelManager.syncDatabase(true);
      
      expect(ModelAssociations.syncModels).toHaveBeenCalledWith(mockSequelize, true);
    });

    it('should throw error when not initialized', async () => {
      await expect(ModelManager.syncDatabase()).rejects.toThrow(
        'ModelManager not initialized'
      );
    });
  });

  describe('isInitialized', () => {
    it('should return false when not initialized', () => {
      expect(ModelManager.isInitialized()).toBe(false);
    });

    it('should return true when initialized', () => {
      ModelManager.initialize(mockSequelize);
      
      expect(ModelManager.isInitialized()).toBe(true);
    });
  });

  describe('close', () => {
    it('should close sequelize connection and reset state', async () => {
      ModelManager.initialize(mockSequelize);
      
      await ModelManager.close();
      
      expect(mockSequelize.close).toHaveBeenCalled();
      expect(ModelManager.isInitialized()).toBe(false);
    });

    it('should handle close when sequelize is null', async () => {
      // Should not throw
      await expect(ModelManager.close()).resolves.toBeUndefined();
      expect(mockSequelize.close).not.toHaveBeenCalled();
    });
  });

  describe('getModels', () => {
    it('should return all model classes', () => {
      const models = ModelManager.getModels();
      
      expect(models).toEqual({
        User,
        Author,
        Category,
        Book,
        BookAuthor,
        BookCategory
      });
    });

    it('should return models even when not initialized', () => {
      const models = ModelManager.getModels();
      
      expect(models).toBeDefined();
      expect(models.User).toBe(User);
      expect(models.Author).toBe(Author);
      expect(models.Category).toBe(Category);
      expect(models.Book).toBe(Book);
      expect(models.BookAuthor).toBe(BookAuthor);
      expect(models.BookCategory).toBe(BookCategory);
    });
  });

  describe('Error handling', () => {
    it('should handle initialization with null sequelize', () => {
      expect(() => ModelManager.initialize(null as any)).not.toThrow();
    });

    it('should maintain state consistency', () => {
      expect(ModelManager.isInitialized()).toBe(false);
      
      ModelManager.initialize(mockSequelize);
      expect(ModelManager.isInitialized()).toBe(true);
      
      const sequelize1 = ModelManager.getSequelize();
      expect(sequelize1).toBe(mockSequelize);
    });
  });
});