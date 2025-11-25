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

    // Initialize model
    Category.initModel(sequelize);
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

    // Create test user
    const user = await User.create({
      email: 'test@example.com',
      // ... other fields
    });
    testUserId = user.id;
  });

  describe('Model Creation', () => {
    it('should create category with userId', async () => {
      const category = await Category.create(
        { name: 'Fiction' },
        testUserId
      );

      expect(category.userId).toBe(testUserId);
    });

    it('should create category with userId', async () => {
      const category = await Category.create(
        { name: 'John', surname: 'Doe' },
        testUserId
      );

      expect(category.userId).toBe(testUserId);
    });

    it('should allow different users to have categories with same name', async () => {
      const user2 = await User.create({ email: 'user2@example.com' });

      const category1 = await Category.create(
        { name: 'Biography' },
        testUserId
      );

      const category2 = await Category.create(
        { name: 'Fiction' },
        user2.id
      );

      expect(category1.id).not.toBe(category2.id);
      expect(category1.userId).toBe(testUserId);
      expect(category2.userId).toBe(user2.id);
    });

    it('should not allow same user to create duplicate category', async () => {
      await Category.create(
        { name: 'Biography' },
        testUserId
      );

      await Category.create(
        { name: 'Fiction' },
        testUserId
      );

      // Should return existing category, not create new one
      const categories = await Category.findAll({ where: { userId: testUserId } });
      expect(categories.length).toBe(1);
    });

    it('should only return categories for specific user', async () => {
      const user2 = await User.create({ email: 'user2@example.com' });

      await Category.create({ name: 'Biography' }, testUserId);
      await Category.create({ name: 'Fiction' }, user2.id);

      const user1Categories = await Category.findAll({ where: { userId: testUserId } });
      const user2Categories = await Category.findAll({ where: { userId: user2.id } });

      expect(user1Categories.length).toBe(1);
      expect(user2Categories.length).toBe(1);
      expect(user1Categories[0].name).toBe('John');
      expect(user2Categories[0].name).toBe('Jane');
    });

/////////////////////////
    it('should create a category with valid data', async () => {
      const categoryData = {
        name: 'Fiction',
      };

      const category = await Category.create(categoryData as any, testUserId);

      expect(category.name).toBe('Fiction');
      expect(category.id).toBeDefined();
      expect(category.creationDate).toBeDefined();
      expect(category.updateDate).toBeDefined();
    });

    it('should fail to create category without name', async () => {
      await expect(Category.create({} as any), testUserId).rejects.toThrow();
    });

    it('should fail to create duplicate category names', async () => {
      await Category.create({ name: 'Fiction' } as any, testUserId);
      
      await expect(Category.create({ name: 'Fiction' } as any), testUserId).rejects.toThrow();
    });
  });

  describe('Instance Methods', () => {
    it('should serialize to JSON correctly', async () => {
      const category = await Category.create({
        name: 'Science Fiction',
      } as any,
      testUserId);

      const json = category.toJSON();

      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('name', 'Science Fiction');
      expect(json).toHaveProperty('userId');
      expect(json).toHaveProperty('creationDate');
      expect(json).toHaveProperty('updateDate');
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      // Create test data
      await Category.bulkCreate([
        { name: 'Fiction' },
        { name: 'Non-Fiction' },
        { name: 'Science Fiction' },
        { name: 'Biography' },
      ] as any,
      testUserId);
    });

    it('should find category by name', async () => {
      const category = await Category.findByName('Fiction', testUserId);

      expect(category).not.toBeNull();
      expect(category?.name).toBe('Fiction');
    });

    it('should search categories by name', async () => {
      const results = await Category.searchByName('Fiction', testUserId);

      expect(results).toHaveLength(3); // Fiction, Non-Fiction and Science Fiction
    });

    it('should get all categories sorted by name', async () => {
      const categories = await Category.getAllCategories(testUserId);

      expect(categories).toHaveLength(4);
      expect(categories[0]!.name).toBe('Biography'); // Alphabetical order
      expect(categories[1]!.name).toBe('Fiction');
    });

    it('should create new category if not exists', async () => {
      const newCategory = await Category.createCategory({
        name: 'Mystery',
      },
      testUserId);

      expect(newCategory.name).toBe('Mystery');
    });

    it('should return existing category if already exists', async () => {
      const existingCategory = await Category.createCategory({
        name: 'Fiction',
      },
      testUserId);

      const categoryCount = await Category.count();
      expect(categoryCount).toBe(4);
      expect(existingCategory.name).toBe('Fiction');
    });

    it('should trim category names', async () => {
      const category = await Category.createCategory({
        name: '  Trimmed Category  ',
      });

      expect(category.name).toBe('Trimmed Category');
    });
  });
});
