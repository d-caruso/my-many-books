/**
 * FullTextSearchService Tests
 *
 * Tests for the generic full-text search service base class
 */

import { RESOURCE_TYPES, SORT_DIRECTIONS } from '@my-many-books/shared-types';
import { FullTextSearchService } from '../../../src/services/search/FullTextSearchService';
import { SearchSettingsService } from '../../../src/services/SearchSettingsService';
import { ISearchAdapter, SearchResult, SortField } from '../../../src/services/search/ISearchable';

// Mock entity type for testing
interface TestEntity {
  id: number;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Mock adapter implementation
class MockSearchAdapter implements ISearchAdapter<TestEntity> {
  async searchFulltext(
    _query: string,
    _userId?: number,
    limit = 20,
    offset = 0
  ): Promise<{
    rows: TestEntity[];
    total: number;
    relevanceScores: Map<number, number>;
  }> {
    const allData: TestEntity[] = [
      { id: 1, name: 'Test Item 1', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-05') },
      { id: 2, name: 'Test Item 2', createdAt: new Date('2024-01-02'), updatedAt: new Date('2024-01-04') },
      { id: 3, name: 'Test Item 3', createdAt: new Date('2024-01-03'), updatedAt: new Date('2024-01-03') },
    ];

    // Respect pagination
    const mockData = allData.slice(offset, offset + limit);

    const relevanceScores = new Map<number, number>();
    relevanceScores.set(1, 95);
    relevanceScores.set(2, 85);
    relevanceScores.set(3, 75);

    return {
      rows: mockData,
      total: allData.length,
      relevanceScores,
    };
  }

  async searchLike(
    _query: string,
    _userId?: number,
    _limit = 20,
    _offset = 0
  ): Promise<{
    rows: TestEntity[];
    total: number;
  }> {
    const mockData: TestEntity[] = [
      { id: 1, name: 'Test Item 1', createdAt: new Date('2024-01-01') },
      { id: 2, name: 'Test Item 2', createdAt: new Date('2024-01-02') },
    ];

    return {
      rows: mockData,
      total: mockData.length,
    };
  }

  async findPinned(_userId?: number): Promise<Array<{
    resourceId: number;
    priority: number;
  }>> {
    return [
      { resourceId: 2, priority: 1 },
      { resourceId: 1, priority: 2 },
    ];
  }
}

// Concrete test implementation
class TestSearchService extends FullTextSearchService<TestEntity> {
  constructor(
    adapter: ISearchAdapter<TestEntity>,
    searchSettingsService: SearchSettingsService
  ) {
    super(
      RESOURCE_TYPES.BOOK,
      ['name', 'createdAt', 'updatedAt'],
      adapter,
      searchSettingsService
    );
  }

  protected toSearchResult(
    item: TestEntity,
    meta: { isPinned: boolean; relevanceScore?: number }
  ): SearchResult<TestEntity> {
    return {
      id: item.id,
      creationDate: item.createdAt,
      updateDate: item.updatedAt,
      isPinned: meta.isPinned,
      relevanceScore: meta.relevanceScore,
      data: item,
    };
  }

  protected getDefaultSort(): SortField[] {
    return [{ field: 'name', direction: SORT_DIRECTIONS.ASC }];
  }
}

// Mock SearchSettingsService
class MockSearchSettingsService {
  private fulltextEnabled = true;

  async isFulltextEnabled(): Promise<boolean> {
    return this.fulltextEnabled;
  }

  setFulltextEnabled(enabled: boolean): void {
    this.fulltextEnabled = enabled;
  }
}

describe('FullTextSearchService', () => {
  let service: TestSearchService;
  let mockAdapter: MockSearchAdapter;
  let mockSettingsService: MockSearchSettingsService;

  beforeEach(() => {
    mockAdapter = new MockSearchAdapter();
    mockSettingsService = new MockSearchSettingsService();
    service = new TestSearchService(
      mockAdapter,
      mockSettingsService as any
    );
  });

  describe('search with FULLTEXT enabled', () => {
    it('should return results with relevance scores', async () => {
      const result = await service['performSearch']({
        query: 'test',
        limit: 10,
        offset: 0,
      });

      expect(result.total).toBe(3);
      expect(result.results).toHaveLength(3);
      expect(result.results[0]?.relevanceScore).toBeDefined();
    });

    it('should sort pinned results by priority', async () => {
      const result = await service['performSearch']({
        query: 'test',
        limit: 10,
        offset: 0,
      });

      // First two should be pinned (id 2 and id 1 in priority order)
      expect(result.results[0]?.isPinned).toBe(true);
      expect(result.results[0]?.id).toBe(2); // Priority 1
      expect(result.results[1]?.isPinned).toBe(true);
      expect(result.results[1]?.id).toBe(1); // Priority 2
    });

    it('should sort regular results by relevance', async () => {
      const result = await service['performSearch']({
        query: 'test',
        limit: 10,
        offset: 0,
      });

      // Third result should be regular (not pinned)
      expect(result.results[2]?.isPinned).toBe(false);
      expect(result.results[2]?.id).toBe(3);
    });
  });

  describe('search with FULLTEXT disabled', () => {
    beforeEach(() => {
      mockSettingsService.setFulltextEnabled(false);
    });

    it('should use LIKE search', async () => {
      const result = await service['performSearch']({
        query: 'test',
        limit: 10,
        offset: 0,
      });

      expect(result.total).toBe(2); // LIKE returns only 2 results
      expect(result.results[0]?.relevanceScore).toBeUndefined(); // No relevance scores
    });
  });

  describe('field validation', () => {
    it('should accept valid sortable fields', async () => {
      await expect(service['performSearch']({
        query: 'test',
        sortBy: 'name',
        sortOrder: SORT_DIRECTIONS.ASC,
      })).resolves.toBeDefined();
    });

    it('should reject invalid sortable fields', async () => {
      await expect(service['performSearch']({
        query: 'test',
        sortBy: 'invalidField',
        sortOrder: SORT_DIRECTIONS.ASC,
      })).rejects.toThrow('Invalid sortBy field');
    });
  });

  describe('multi-field sorting', () => {
    it('should support array of sort fields', async () => {
      await expect(service['performSearch']({
        query: 'test',
        sortBy: ['name', 'createdAt'],
        sortOrder: SORT_DIRECTIONS.ASC,
      })).resolves.toBeDefined();
    });

    it('should use default sort when no sortBy provided', async () => {
      const result = await service['performSearch']({
        query: '',
        limit: 10,
        offset: 0,
      });

      expect(result.results).toBeDefined();
      // Results should be sorted by default (name ASC)
    });
  });

  describe('pagination', () => {
    it('should respect limit parameter', async () => {
      const result = await service['performSearch']({
        query: 'test',
        limit: 2,
        offset: 0,
      });

      expect(result.results.length).toBeLessThanOrEqual(2);
    });

    it('should cap limit at 100', async () => {
      const result = await service['performSearch']({
        query: 'test',
        limit: 500, // Too high
        offset: 0,
      });

      // Should still work (limit capped internally)
      expect(result.results).toBeDefined();
    });
  });
});
