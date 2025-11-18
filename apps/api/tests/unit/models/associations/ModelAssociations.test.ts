// ================================================================
// tests/models/associations/ModelAssociations.test.ts
// ================================================================

import { Sequelize } from 'sequelize';
import { ModelAssociations } from '../../../../src/models/associations/ModelAssociations';

describe('ModelAssociations', () => {
  let mockUser: any;
  let mockBook: any;
  let mockAuthor: any;
  let mockCategory: any;
  let mockBookAuthor: any;
  let mockBookCategory: any;
  let mockSequelize: jest.Mocked<Sequelize>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();

    // Create mock models with the methods they need
    mockUser = {
      hasMany: jest.fn(),
    };

    mockBook = {
      belongsTo: jest.fn(),
      belongsToMany: jest.fn(),
      hasMany: jest.fn(),
    };

    mockAuthor = {
      belongsToMany: jest.fn(),
      hasMany: jest.fn(),
    };

    mockCategory = {
      belongsToMany: jest.fn(),
      hasMany: jest.fn(),
    };

    mockBookAuthor = {
      belongsTo: jest.fn(),
    };

    mockBookCategory = {
      belongsTo: jest.fn(),
    };

    mockSequelize = {
      sync: jest.fn(),
    } as any;

    // Clear any existing registrations
    (ModelAssociations as any).models = {};
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Model Registration', () => {
    it('should register a model', () => {
      ModelAssociations.registerModel('User', mockUser);
      
      const retrievedModel = ModelAssociations.getModel('User');
      expect(retrievedModel).toBe(mockUser);
    });

    it('should register multiple models', () => {
      ModelAssociations.registerModel('User', mockUser);
      ModelAssociations.registerModel('Book', mockBook);
      ModelAssociations.registerModel('Author', mockAuthor);

      expect(ModelAssociations.getModel('User')).toBe(mockUser);
      expect(ModelAssociations.getModel('Book')).toBe(mockBook);
      expect(ModelAssociations.getModel('Author')).toBe(mockAuthor);
    });

    it('should get all registered models', () => {
      ModelAssociations.registerModel('User', mockUser);
      ModelAssociations.registerModel('Book', mockBook);

      const allModels = ModelAssociations.getAllModels();
      expect(allModels).toEqual({
        User: mockUser,
        Book: mockBook,
      });
    });

    it('should throw error when getting unregistered model', () => {
      expect(() => {
        ModelAssociations.getModel('User');
      }).toThrow('Model User is not registered');
    });

    it('should throw error when getting non-existent model', () => {
      ModelAssociations.registerModel('User', mockUser);
      
      expect(() => {
        ModelAssociations.getModel('Book');
      }).toThrow('Model Book is not registered');
    });
  });

  describe('Association Definition', () => {
    beforeEach(() => {
      // Register all required models
      ModelAssociations.registerModel('User', mockUser);
      ModelAssociations.registerModel('Book', mockBook);
      ModelAssociations.registerModel('Author', mockAuthor);
      ModelAssociations.registerModel('Category', mockCategory);
      ModelAssociations.registerModel('BookAuthor', mockBookAuthor);
      ModelAssociations.registerModel('BookCategory', mockBookCategory);
    });

    it('should define all associations successfully', () => {
      ModelAssociations.defineAssociations();

      // Verify User - Book relationships
      expect(mockUser.hasMany).toHaveBeenCalledWith(mockBook, {
        foreignKey: 'user_id',
        as: 'books',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });

      expect(mockBook.belongsTo).toHaveBeenCalledWith(mockUser, {
        foreignKey: 'user_id',
        as: 'user',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });

      // Verify Book - Author many-to-many relationships
      expect(mockBook.belongsToMany).toHaveBeenCalledWith(mockAuthor, {
        through: mockBookAuthor,
        foreignKey: 'bookId',
        otherKey: 'authorId',
        as: 'authors',
      });

      expect(mockAuthor.belongsToMany).toHaveBeenCalledWith(mockBook, {
        through: mockBookAuthor,
        foreignKey: 'authorId',
        otherKey: 'bookId',
        as: 'books',
      });

      // Verify Book - Category many-to-many relationships
      expect(mockBook.belongsToMany).toHaveBeenCalledWith(mockCategory, {
        through: mockBookCategory,
        foreignKey: 'bookId',
        otherKey: 'categoryId',
        as: 'categories',
      });

      expect(mockCategory.belongsToMany).toHaveBeenCalledWith(mockBook, {
        through: mockBookCategory,
        foreignKey: 'categoryId',
        otherKey: 'bookId',
        as: 'books',
      });

      expect(console.log).toHaveBeenCalledWith('Model associations defined successfully');
    });

    it('should define junction table associations', () => {
      ModelAssociations.defineAssociations();

      // Verify BookAuthor associations
      expect(mockBookAuthor.belongsTo).toHaveBeenCalledWith(mockBook, { 
        foreignKey: 'bookId', 
        as: 'book' 
      });
      expect(mockBookAuthor.belongsTo).toHaveBeenCalledWith(mockAuthor, { 
        foreignKey: 'authorId', 
        as: 'author' 
      });

      // Verify BookCategory associations
      expect(mockBookCategory.belongsTo).toHaveBeenCalledWith(mockBook, { 
        foreignKey: 'bookId', 
        as: 'book' 
      });
      expect(mockBookCategory.belongsTo).toHaveBeenCalledWith(mockCategory, { 
        foreignKey: 'categoryId', 
        as: 'category'
      });

      // Verify reverse hasMany associations
      expect(mockBook.hasMany).toHaveBeenCalledWith(mockBookAuthor, { foreignKey: 'bookId' });
      expect(mockBook.hasMany).toHaveBeenCalledWith(mockBookCategory, { foreignKey: 'bookId' });
      expect(mockAuthor.hasMany).toHaveBeenCalledWith(mockBookAuthor, { foreignKey: 'authorId' });
      expect(mockCategory.hasMany).toHaveBeenCalledWith(mockBookCategory, { foreignKey: 'categoryId' });
    });

    it('should throw error when models are missing', () => {
      // Clear one model to trigger the error
      (ModelAssociations as any).models = {
        User: mockUser,
        Book: mockBook,
        Author: mockAuthor,
        Category: mockCategory,
        BookAuthor: mockBookAuthor,
        // BookCategory is missing
      };

      expect(() => {
        ModelAssociations.defineAssociations();
      }).toThrow('All models must be registered before defining associations');
    });

    it('should throw error when all models are missing', () => {
      (ModelAssociations as any).models = {};

      expect(() => {
        ModelAssociations.defineAssociations();
      }).toThrow('All models must be registered before defining associations');
    });

    it('should handle partial model registration errors', () => {
      // Register only some models
      (ModelAssociations as any).models = {
        User: mockUser,
        Book: mockBook,
      };

      expect(() => {
        ModelAssociations.defineAssociations();
      }).toThrow('All models must be registered before defining associations');
    });
  });

  describe('Model Synchronization', () => {
    it('should sync models successfully', async () => {
      mockSequelize.sync.mockResolvedValue({} as any);

      await ModelAssociations.syncModels(mockSequelize);

      expect(mockSequelize.sync).toHaveBeenCalledWith({ force: false });
      expect(console.log).toHaveBeenCalledWith('Database models synchronized successfully');
    });

    it('should sync models with force option', async () => {
      mockSequelize.sync.mockResolvedValue({} as any);

      await ModelAssociations.syncModels(mockSequelize, true);

      expect(mockSequelize.sync).toHaveBeenCalledWith({ force: true });
      expect(console.log).toHaveBeenCalledWith('Database models synchronized successfully');
    });

    it('should handle sync errors', async () => {
      const error = new Error('Sync failed');
      mockSequelize.sync.mockRejectedValue(error);

      await expect(ModelAssociations.syncModels(mockSequelize)).rejects.toThrow('Sync failed');

      expect(mockSequelize.sync).toHaveBeenCalledWith({ force: false });
      expect(console.error).toHaveBeenCalledWith('Error synchronizing database models:', error);
    });

    it('should handle sync errors with force option', async () => {
      const error = new Error('Force sync failed');
      mockSequelize.sync.mockRejectedValue(error);

      await expect(ModelAssociations.syncModels(mockSequelize, true)).rejects.toThrow('Force sync failed');

      expect(mockSequelize.sync).toHaveBeenCalledWith({ force: true });
      expect(console.error).toHaveBeenCalledWith('Error synchronizing database models:', error);
    });
  });

  describe('Registry Management', () => {
    it('should maintain separate model registrations', () => {
      ModelAssociations.registerModel('User', mockUser);
      ModelAssociations.registerModel('Book', mockBook);

      // Verify each model is registered correctly
      expect(ModelAssociations.getModel('User')).toBe(mockUser);
      expect(ModelAssociations.getModel('Book')).toBe(mockBook);

      // Verify they are different objects
      expect(ModelAssociations.getModel('User')).not.toBe(ModelAssociations.getModel('Book'));
    });

    it('should allow overriding model registrations', () => {
      const originalUser = { name: 'original' } as any;
      const newUser = { name: 'new' } as any;

      ModelAssociations.registerModel('User', originalUser);
      expect(ModelAssociations.getModel('User')).toBe(originalUser);

      ModelAssociations.registerModel('User', newUser);
      expect(ModelAssociations.getModel('User')).toBe(newUser);
      expect(ModelAssociations.getModel('User')).not.toBe(originalUser);
    });

    it('should handle empty registry', () => {
      const allModels = ModelAssociations.getAllModels();
      expect(allModels).toEqual({});
    });

    it('should maintain registry state across operations', () => {
      ModelAssociations.registerModel('User', mockUser);
      ModelAssociations.registerModel('Book', mockBook);

      // Get all models
      const allModels = ModelAssociations.getAllModels();
      expect(Object.keys(allModels)).toHaveLength(2);

      // Add another model
      ModelAssociations.registerModel('Author', mockAuthor);

      // Verify all three are present
      const updatedModels = ModelAssociations.getAllModels();
      expect(Object.keys(updatedModels)).toHaveLength(3);
      expect(updatedModels.User).toBe(mockUser);
      expect(updatedModels.Book).toBe(mockBook);
      expect(updatedModels.Author).toBe(mockAuthor);
    });
  });
});