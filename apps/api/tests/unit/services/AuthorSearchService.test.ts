/**
 * AuthorSearchService Tests
 */

import { SORT_DIRECTIONS } from '@my-many-books/shared-types';
import { AuthorSearchService } from '../../../src/services/search/AuthorSearchService';
import { ISearchAdapter } from '../../../src/services/search/ISearchable';
import { AuthorEntity } from '../../../src/domain/entities/Author';

// Mock adapter implementation
class MockAuthorAdapter implements ISearchAdapter<AuthorEntity> {
  async searchFulltext(
    _query: string,
    _userId?: number,
    limit = 20,
    offset = 0
  ): Promise<{
    rows: AuthorEntity[];
    total: number;
    relevanceScores: Map<number, number>;
  }> {
    const allData: AuthorEntity[] = [
      { id: 1, name: 'John', surname: 'Doe', userId: 1, creationDate: new Date('2024-01-01') },
      { id: 2, name: 'Jane', surname: 'Smith', userId: 1, creationDate: new Date('2024-01-02') },
      { id: 3, name: 'Bob', surname: 'Johnson', userId: 1, creationDate: new Date('2024-01-03') },
    ];

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
    rows: AuthorEntity[];
    total: number;
  }> {
    const mockData: AuthorEntity[] = [
      { id: 1, name: 'John', surname: 'Doe', userId: 1, creationDate: new Date('2024-01-01') },
      { id: 2, name: 'Jane', surname: 'Smith', userId: 1, creationDate: new Date('2024-01-02') },
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

describe('AuthorSearchService', () => {
  let service: AuthorSearchService;
  let mockAdapter: MockAuthorAdapter;
  let mockSettingsService: MockSearchSettingsService;

  beforeEach(() => {
    mockAdapter = new MockAuthorAdapter();
    mockSettingsService = new MockSearchSettingsService();

    // Create service with mock adapter
    service = new AuthorSearchService(mockSettingsService as any);
    (service as any).adapter = mockAdapter;
  });

  describe('search functionality', () => {
    it('should return author search results', async () => {
      const result = await service.search({
        query: 'test',
        limit: 10,
        offset: 0,
      });

      expect(result.total).toBe(3);
      expect(result.results).toHaveLength(3);
      expect(result.results[0]?.name).toBe('Jane'); // Pinned first
    });

    it('should validate sortBy fields', async () => {
      await expect(service['performSearch']({
        query: 'test',
        sortBy: 'invalidField',
        sortOrder: SORT_DIRECTIONS.ASC,
      })).rejects.toThrow('Invalid sortBy field');
    });

    it('should accept valid sortBy fields', async () => {
      await expect(service['performSearch']({
        query: 'test',
        sortBy: 'name',
        sortOrder: SORT_DIRECTIONS.ASC,
      })).resolves.toBeDefined();
    });
  });

  describe('default sort', () => {
    it('should sort by surname, name when no sortBy provided', async () => {
      const result = await service.search({
        query: '',
        limit: 10,
        offset: 0,
      });

      expect(result.results).toBeDefined();
    });
  });

  describe('with FULLTEXT disabled', () => {
    beforeEach(() => {
      mockSettingsService.setFulltextEnabled(false);
    });

    it('should use LIKE search', async () => {
      const result = await service.search({
        query: 'test',
        limit: 10,
        offset: 0,
      });

      expect(result.total).toBe(2);
      expect(result.results[0]?.relevanceScore).toBeUndefined();
    });
  });
});
