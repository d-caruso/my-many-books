// ================================================================
// tests/models/Author.test.ts
// ================================================================
import { Sequelize } from 'sequelize';
import { Author } from '@/models/Author';
import { User } from '@/models/User';
import { ModelAssociations } from '@/models/associations/ModelAssociations';

describe('Author Model', () => {
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
    Author.initModel(sequelize);
    ModelAssociations.registerModel('User', User);
    ModelAssociations.registerModel('Author', Author);

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
    await Author.destroy({ where: {} });
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
    it('should create author with userId', async () => {
      const author = await Author.createAuthor({
        name: 'John',
        surname: 'Doe',
        userId: testUserId,
      });

      expect(author.userId).toBe(testUserId);
    });

    it('should allow different users to have authors with same name', async () => {
      const user2 = await User.create({
        email: 'user2@example.com',
      role: 'user',
        name: 'Test2',
        surname: 'User2',
        cognitoSub: 'test-sub-456',
                isActive: true,
      } as any);

      const author1 = await Author.createAuthor({
        name: 'John',
        surname: 'Doe',
        userId: testUserId,
      });

      const author2 = await Author.createAuthor({
        name: 'John',
        surname: 'Doe',
        userId: user2.id,
      });

      expect(author1.id).not.toBe(author2.id);
      expect(author1.userId).toBe(testUserId);
      expect(author2.userId).toBe(user2.id);
    });

    it('should not allow same user to create duplicate author', async () => {
      await Author.createAuthor({
        name: 'John',
        surname: 'Doe',
        userId: testUserId,
      });

      await Author.createAuthor({
        name: 'John',
        surname: 'Doe',
        userId: testUserId,
      });

      // Should return existing author, not create new one
      const authors = await Author.findAll({ where: { userId: testUserId } });
      expect(authors.length).toBe(1);
    });

    it('should only return authors for specific user', async () => {
      const user2 = await User.create({
        email: 'user2@example.com',
      role: 'user',
        name: 'Test3',
        surname: 'User3',
        cognitoSub: 'test-sub-789',
                isActive: true,
      } as any);

      await Author.createAuthor({ name: 'John', surname: 'Doe', userId: testUserId });
      await Author.createAuthor({ name: 'Jane', surname: 'Smith', userId: user2.id });

      const user: { id: testUserId } });
      const user: { id: user2.id } });

      expect(user1Authors.length).toBe(1);
      expect(user2Authors.length).toBe(1);
      expect(user1Authors[0]?.name).toBe('John');
      expect(user2Authors[0]?.name).toBe('Jane');
    });

    it('should create an author with valid data', async () => {
      const author = await Author.createAuthor({
        name: 'John',
        surname: 'Doe',
        nationality: 'American',
        userId: testUserId,
      });

      expect(author.name).toBe('John');
      expect(author.surname).toBe('Doe');
      expect(author.nationality).toBe('American');
      expect(author.id).toBeDefined();
      expect(author.creationDate).toBeDefined();
      expect(author.updateDate).toBeDefined();
    });

    it('should create an author without nationality', async () => {
      const author = await Author.createAuthor({
        name: 'Jane',
        surname: 'Smith',
        userId: testUserId,
      });

      expect(author.name).toBe('Jane');
      expect(author.surname).toBe('Smith');
      expect(author.nationality == null).toBe(true);
    });

    it('should fail to create author without required fields', async () => {
      const authorData = {
        name: 'John',
        // Missing surname
        userId: testUserId,
      };

      await expect(Author.createAuthor(authorData as any)).rejects.toThrow();
    });
  });

  describe('Instance Methods', () => {
    it('should return full name correctly', async () => {
      const author = await Author.createAuthor({
        name: 'John',
        surname: 'Doe',
        userId: testUserId,
      });

      expect(author.getFullName()).toBe('John Doe');
    });

    it('should serialize to JSON correctly', async () => {
      const author = await Author.createAuthor({
        name: 'John',
        surname: 'Doe',
        nationality: 'American',
        userId: testUserId,
      });

      const json = author.toJSON();

      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('name', 'John');
      expect(json).toHaveProperty('surname', 'Doe');
      expect(json).toHaveProperty('nationality', 'American');
      expect(json).toHaveProperty('userId');
      expect(json).toHaveProperty('creationDate');
      expect(json).toHaveProperty('updateDate');
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      // Create test data
      await Author.createAuthor({ name: 'John', surname: 'Doe', nationality: 'American', userId: testUserId });
      await Author.createAuthor({ name: 'Jane', surname: 'Smith', nationality: 'British', userId: testUserId });
      await Author.createAuthor({ name: 'Bob', surname: 'Johnson', nationality: 'American', userId: testUserId });
    });

    it('should find author by full name', async () => {
      const author = await Author.findByFullName('John', 'Doe', testUserId);

      expect(author).not.toBeNull();
      expect(author?.name).toBe('John');
      expect(author?.surname).toBe('Doe');
    });

    it('should find authors by nationality', async () => {
      const americanAuthors = await Author.findByNationality('American', testUserId);

      expect(americanAuthors).toHaveLength(2);
      expect(americanAuthors.every(author => author.nationality === 'American')).toBe(true);
    });

    it('should search authors by name', async () => {
      const results = await Author.searchByName('John', testUserId);

      expect(results).toHaveLength(2); // John Doe and Bob Johnson
    });

    it('should create new author if not exists', async () => {
      const newAuthor = await Author.createAuthor({
        name: 'New',
        surname: 'Author',
        userId: testUserId,
      });

      expect(newAuthor.name).toBe('New');
      expect(newAuthor.surname).toBe('Author');
    });

    it('should return existing author if already exists', async () => {
      const existingAuthor = await Author.createAuthor({
        name: 'John',
        surname: 'Doe',
        userId: testUserId,
      });

      const authorCount = await Author.count({ where: { userId: testUserId } });
      expect(authorCount).toBe(3); // Should not create duplicate
      expect(existingAuthor.name).toBe('John');
    });
  });
});
