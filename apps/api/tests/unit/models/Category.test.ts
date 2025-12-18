// ================================================================
// tests/models/Category.test.ts
// ================================================================

import { Sequelize } from 'sequelize';
import { Category } from '@/models/Category';
import { User } from '@/models/User';
import { ModelAssociations } from '@/models/associations/ModelAssociations';

describe('Category Model', () => {
  let sequelize: Sequelize;
  let testUserId: number;

  beforeAll(async () => {
    sequelize = new Sequelize('sqlite::memory:', {
      logging: false,
      define: {
        timestamps: true,
        underscored: true,
        createdAt: 'creation_date',
        updatedAt: 'update_date',
      },
    });

    // Initialize models
    User.initModel(sequelize);
    Category.initModel(sequelize);
    ModelAssociations.registerModel('User', User);
    ModelAssociations.registerModel('Category', Category);

    // Sync database
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    if (sequelize) {
      await sequelize.close();
    }
  });

  beforeEach(async () => {
    // Clean up data before each test
    await Category.destroy({ where: {} });
    await User.destroy({ where: {} });

    // Create test user
    const user = await User.create({
      email: 'test@example.com',
      role: 'user',
      name: 'Test',
      surname: 'User',
      cognitoSub: 'test-sub-123',
            isActive: true,
    } as any);
    testUserId = user.id;
  });

  describe('Model Creation', () => {
    it('should create category with userId', async () => {
      const category = await Category.createCategory({
        name: 'Fiction',
        userId: testUserId,
      });

      expect(category.userId).toBe(testUserId);
    });

    it('should allow different users to have categories with same name', async () => {
      const user2 = await User.create({
        email: 'user2@example.com',
      role: 'user',
        name: 'Test2',
        surname: 'User2',
        cognitoSub: 'test-sub-456',
                isActive: true,
      } as any);

      const category1 = await Category.createCategory({
        name: 'Fiction',
        userId: testUserId,
      });

      const category2 = await Category.createCategory({
        name: 'Fiction',
        userId: user2.id,
      });

      expect(category1.id).not.toBe(category2.id);
      expect(category1.userId).toBe(testUserId);
      expect(category2.userId).toBe(user2.id);
    });

    it('should not allow same user to create duplicate category', async () => {
      await Category.createCategory({
        name: 'Fiction',
        userId: testUserId,
      });

      await Category.createCategory({
        name: 'Fiction',
        userId: testUserId,
      });

      // Should return existing category, not create new one
      const categories = await Category.findAll({ where: { userId: testUserId } });
      expect(categories.length).toBe(1);
    });

    it('should only return categories for specific user', async () => {
      const user2 = await User.create({
        email: 'user2@example.com',
      role: 'user',
        name: 'Test3',
        surname: 'User3',
        cognitoSub: 'test-sub-789',
                isActive: true,
      } as any);

      await Category.createCategory({ name: 'Fiction', userId: testUserId });
      await Category.createCategory({ name: 'Non-Fiction', userId: user2.id });

      const user?: { id: testUserId } });
      const user?: { id: user2.id } });

      expect(user1Categories.length).toBe(1);
      expect(user2Categories.length).toBe(1);
      expect(user1Categories[0]?.name).toBe('Fiction');
      expect(user2Categories[0]?.name).toBe('Non-Fiction');
    });

    it('should create a category with valid data', async () => {
      const category = await Category.createCategory({
        name: 'Science Fiction',
        userId: testUserId,
      });

      expect(category.name).toBe('Science Fiction');
      expect(category.id).toBeDefined();
      expect(category.creationDate).toBeDefined();
      expect(category.updateDate).toBeDefined();
    });

    it('should fail to create category without required fields', async () => {
      const categoryData = {
        // Missing name
        userId: testUserId,
      };

      await expect(Category.createCategory(categoryData as any)).rejects.toThrow();
    });

    it('should trim category name', async () => {
      const category = await Category.createCategory({
        name: '  Trimmed Category  ',
        userId: testUserId,
      });

      expect(category.name).toBe('Trimmed Category');
    });
  });

  describe('Instance Methods', () => {
    it('should serialize to JSON correctly', async () => {
      const category = await Category.createCategory({
        name: 'Biography',
        userId: testUserId,
      });

      const json = category.toJSON();

      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('name', 'Biography');
      expect(json).toHaveProperty('userId');
      expect(json).toHaveProperty('creationDate');
      expect(json).toHaveProperty('updateDate');
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      // Create test data
      await Category.createCategory({ name: 'Fiction', userId: testUserId });
      await Category.createCategory({ name: 'Non-Fiction', userId: testUserId });
      await Category.createCategory({ name: 'Biography', userId: testUserId });
    });

    it('should find category by name', async () => {
      const category = await Category.findByName('Fiction', testUserId);

      expect(category).not.toBeNull();
      expect(category?.name).toBe('Fiction');
    });

    it('should search categories by name', async () => {
      const results = await Category.searchByName('Fiction', testUserId);

      expect(results).toHaveLength(2); // Fiction and Non-Fiction
    });

    it('should get all categories for user', async () => {
      const categories = await Category.getAllCategories(testUserId);

      expect(categories).toHaveLength(3);
      expect(categories[0]?.name).toBe('Biography'); // Sorted alphabetically
    });

    it('should create new category if not exists', async () => {
      const newCategory = await Category.createCategory({
        name: 'Horror',
        userId: testUserId,
      });

      expect(newCategory.name).toBe('Horror');
    });

    it('should return existing category if already exists', async () => {
      const existingCategory = await Category.createCategory({
        name: 'Fiction',
        userId: testUserId,
      });

      const categoryCount = await Category.count({ where: { userId: testUserId } });
      expect(categoryCount).toBe(3); // Should not create duplicate
      expect(existingCategory.name).toBe('Fiction');
    });
  });
});
