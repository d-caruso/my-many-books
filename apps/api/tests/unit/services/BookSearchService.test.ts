import {
  BOOK_STATUS,
  SEARCH_SORT_BY_FIELDS,
  SEARCH_SORT_BY_FIELD_VALUES,
  SORT_DIRECTIONS,
} from '@my-many-books/shared-types';
import type { Repository as BookRepositoryContract } from '../../../src/repositories/book/Repository';
import { BookSearchService } from '../../../src/services/search/BookSearchService';

class MockSearchSettingsService {
  constructor(private readonly fulltextEnabled: boolean) {}

  async isFulltextEnabled(): Promise<boolean> {
    return this.fulltextEnabled;
  }
}

const unsortedBooks = [
  {
    id: 1,
    title: 'Bravo',
    isbnCode: '1',
    status: BOOK_STATUS.PAUSED,
    creationDate: new Date('2024-01-02T00:00:00Z'),
    updateDate: new Date('2024-01-04T00:00:00Z'),
    authors: [{ id: 11, name: 'Amy', surname: 'Brown' }],
  },
  {
    id: 3,
    title: 'Charlie',
    isbnCode: '3',
    status: BOOK_STATUS.READING,
    creationDate: new Date('2024-01-03T00:00:00Z'),
    updateDate: new Date('2024-01-02T00:00:00Z'),
    authors: [{ id: 13, name: 'Zoe', surname: 'Brown' }],
  },
  {
    id: 2,
    title: 'Alpha',
    isbnCode: '2',
    status: BOOK_STATUS.FINISHED,
    creationDate: new Date('2024-01-01T00:00:00Z'),
    updateDate: new Date('2024-01-03T00:00:00Z'),
    authors: [{ id: 12, name: 'Zoe', surname: 'Adams' }],
  },
];

const createMockBookRepository = (): jest.Mocked<BookRepositoryContract> => ({
  findById: jest.fn(),
  findUserBookById: jest.fn(),
  findByIsbnCode: jest.fn(),
  listUserBooks: jest.fn(),
  search: jest.fn(),
  searchFulltext: jest.fn(),
  searchLike: jest.fn(),
  searchFulltextSorted: jest.fn(),
  searchLikeSorted: jest.fn(),
  findPinned: jest.fn(),
  countUserBooks: jest.fn(),
  findRecentUserBooks: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

describe('BookSearchService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the explicit fulltext sort path for author sorting', async () => {
    const mockRepository = createMockBookRepository();
    mockRepository.findPinned.mockResolvedValue([]);
    mockRepository.searchFulltextSorted.mockResolvedValue({
      rows: [
        {
          id: 2,
          title: 'Two',
          isbnCode: '2',
          creationDate: new Date('2024-01-02'),
          updateDate: new Date('2024-01-03'),
          authors: [{ id: 2, name: 'Ada', surname: 'Zulu' }],
        },
        {
          id: 1,
          title: 'One',
          isbnCode: '1',
          creationDate: new Date('2024-01-01'),
          updateDate: new Date('2024-01-02'),
          authors: [{ id: 1, name: 'Amy', surname: 'Alpha' }],
        },
      ],
      total: 2,
      relevanceScores: new Map<number, number>(),
    });

    const service = new BookSearchService(
      mockRepository,
      new MockSearchSettingsService(true) as any
    );

    const result = await service.search({
      query: 'test',
      sortBy: SEARCH_SORT_BY_FIELDS.AUTHOR,
      sortOrder: SORT_DIRECTIONS.ASC,
      limit: 10,
      offset: 0,
    });

    expect(mockRepository.searchFulltextSorted).toHaveBeenCalledWith({
      query: 'test',
      userId: undefined,
      sortBy: SEARCH_SORT_BY_FIELDS.AUTHOR,
      sortOrder: SORT_DIRECTIONS.ASC,
      limit: 10,
      offset: 0,
    });
    expect(mockRepository.searchFulltext).not.toHaveBeenCalled();
    expect(result.results.map(book => book.id)).toEqual([1, 2]);
  });

  test.each([
    [SEARCH_SORT_BY_FIELDS.TITLE, SORT_DIRECTIONS.ASC, [2, 1, 3]],
    [SEARCH_SORT_BY_FIELDS.TITLE, SORT_DIRECTIONS.DESC, [3, 1, 2]],
    [SEARCH_SORT_BY_FIELDS.STATUS, SORT_DIRECTIONS.ASC, [2, 1, 3]],
    [SEARCH_SORT_BY_FIELDS.STATUS, SORT_DIRECTIONS.DESC, [3, 1, 2]],
    [SEARCH_SORT_BY_FIELDS.CREATION_DATE, SORT_DIRECTIONS.ASC, [2, 1, 3]],
    [SEARCH_SORT_BY_FIELDS.CREATION_DATE, SORT_DIRECTIONS.DESC, [3, 1, 2]],
    [SEARCH_SORT_BY_FIELDS.UPDATE_DATE, SORT_DIRECTIONS.ASC, [3, 2, 1]],
    [SEARCH_SORT_BY_FIELDS.UPDATE_DATE, SORT_DIRECTIONS.DESC, [1, 2, 3]],
    [SEARCH_SORT_BY_FIELDS.AUTHOR, SORT_DIRECTIONS.ASC, [2, 1, 3]],
    [SEARCH_SORT_BY_FIELDS.AUTHOR, SORT_DIRECTIONS.DESC, [3, 1, 2]],
  ] as const)(
    'sorts %s in %s order',
    async (sortBy, sortOrder, expectedIds) => {
      expect(SEARCH_SORT_BY_FIELD_VALUES).toContain(sortBy);

      const mockRepository = createMockBookRepository();
      mockRepository.findPinned.mockResolvedValue([]);
      mockRepository.searchLikeSorted.mockResolvedValue({
        rows: [...unsortedBooks],
        total: unsortedBooks.length,
      });

      const service = new BookSearchService(
        mockRepository,
        new MockSearchSettingsService(false) as any
      );

      const result = await service.search({
        query: 'test',
        sortBy,
        sortOrder,
        limit: 10,
        offset: 0,
      });

      expect(mockRepository.searchLikeSorted).toHaveBeenCalledWith({
        query: 'test',
        userId: undefined,
        sortBy,
        sortOrder,
        limit: 10,
        offset: 0,
      });
      expect(result.results.map(book => book.id)).toEqual(expectedIds);
    }
  );
});
