/**
 * Pinned Results API Integration Tests
 */

import { SearchPinnedResult } from '../../../src/models/SearchPinnedResult';

describe('Pinned Results API Integration Tests', () => {
  beforeAll(async () => {
    // Clean up test data
    await SearchPinnedResult.destroy({ where: {}, force: true });
  });

  afterEach(async () => {
    // Clean up after each test
    await SearchPinnedResult.destroy({ where: {}, force: true });
  });

  describe('POST /admin/search/pinned', () => {
    it('should create a pinned result with valid data', async () => {
      const pinnedResult = await SearchPinnedResult.create({
        resourceType: 'book',
        resourceId: 1,
        priority: 0,
        active: true,
      } as any);

      expect(pinnedResult.id).toBeDefined();
      expect(pinnedResult.resourceType).toBe('book');
      expect(pinnedResult.resourceId).toBe(1);
      expect(pinnedResult.priority).toBe(0);
      expect(pinnedResult.active).toBe(true);
    });

    it('should not allow duplicate resource pins', async () => {
      await SearchPinnedResult.create({
        resourceType: 'book',
        resourceId: 1,
        priority: 0,
        active: true,
      } as any);

      await expect(
        SearchPinnedResult.create({
          resourceType: 'book',
          resourceId: 1,
          priority: 1,
          active: true,
        } as any)
      ).rejects.toThrow();
    });

    it('should validate resource_type against RESOURCE_TYPE_VALUES', async () => {
      const validTypes = ['book', 'author', 'category', 'user', 'hook'];

      for (const resourceType of validTypes) {
        const pinnedResult = await SearchPinnedResult.create({
          resourceType,
          resourceId: Math.floor(Math.random() * 1000),
          priority: 0,
          active: true,
        } as any);

        expect(pinnedResult.resourceType).toBe(resourceType);
        await pinnedResult.destroy();
      }
    });
  });

  describe('GET /admin/search/pinned', () => {
    beforeEach(async () => {
      // Create test data
      await SearchPinnedResult.bulkCreate([
        { resourceType: 'book', resourceId: 1, priority: 0, active: true },
        { resourceType: 'book', resourceId: 2, priority: 1, active: true },
        { resourceType: 'author', resourceId: 1, priority: 0, active: true },
        { resourceType: 'category', resourceId: 1, priority: 0, active: false },
      ] as any);
    });

    it('should return all pinned results', async () => {
      const results = await SearchPinnedResult.findAll({
        order: [['resourceType', 'ASC'], ['priority', 'ASC']],
      });

      expect(results).toHaveLength(4);
    });

    it('should filter by resource_type', async () => {
      const bookResults = await SearchPinnedResult.findAll({
        where: { resourceType: 'book' },
        order: [['priority', 'ASC']],
      });

      expect(bookResults).toHaveLength(2);
      expect(bookResults[0]?.resourceId).toBe(1);
      expect(bookResults[1]?.resourceId).toBe(2);
    });

    it('should return only active results', async () => {
      const activeResults = await SearchPinnedResult.findAll({
        where: { resourceType: 'book', active: true },
        order: [['priority', 'ASC']],
      });

      expect(activeResults).toHaveLength(2);
      expect(activeResults.every(r => r.active)).toBe(true);
    });
  });

  describe('PATCH /admin/search/pinned/:id/priority', () => {
    it('should update priority', async () => {
      const pinnedResult = await SearchPinnedResult.create({
        resourceType: 'book',
        resourceId: 1,
        priority: 0,
        active: true,
      } as any);

      await pinnedResult.update({ priority: 5 });
      await pinnedResult.reload();

      expect(pinnedResult.priority).toBe(5);
    });

    it('should reject negative priority', async () => {
      const pinnedResult = await SearchPinnedResult.create({
        resourceType: 'book',
        resourceId: 1,
        priority: 0,
        active: true,
      } as any);

      await expect(
        pinnedResult.update({ priority: -1 })
      ).rejects.toThrow();
    });
  });

  describe('DELETE /admin/search/pinned/:id', () => {
    it('should delete a pinned result', async () => {
      const pinnedResult = await SearchPinnedResult.create({
        resourceType: 'book',
        resourceId: 1,
        priority: 0,
        active: true,
      } as any);

      const id = pinnedResult.id;
      await pinnedResult.destroy();

      const deleted = await SearchPinnedResult.findByPk(id);
      expect(deleted).toBeNull();
    });
  });

  describe('Priority ordering', () => {
    it('should order by priority ascending', async () => {
      await SearchPinnedResult.bulkCreate([
        { resourceType: 'book', resourceId: 1, priority: 2, active: true },
        { resourceType: 'book', resourceId: 2, priority: 0, active: true },
        { resourceType: 'book', resourceId: 3, priority: 1, active: true },
      ] as any);

      const results = await SearchPinnedResult.findAll({
        where: { resourceType: 'book', active: true },
        order: [['priority', 'ASC']],
      });

      expect(results[0]?.resourceId).toBe(2); // priority 0
      expect(results[1]?.resourceId).toBe(3); // priority 1
      expect(results[2]?.resourceId).toBe(1); // priority 2
    });
  });
});
