import { SEARCH_SORT_BY_FIELDS, SORT_DIRECTIONS } from '@my-many-books/shared-types';
import { container } from '../../../src/container';
import { TYPES } from '../../../src/container/types';
import { BookController } from '../../../src/controllers/BookController';
import { UniversalRequest } from '../../../src/types';

describe('BookController search sorting', () => {
  let controller: BookController;

  beforeEach(() => {
    container.snapshot();
    controller = container.get<BookController>(TYPES.BookController);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    container.restore();
  });

  it('passes shared sortBy and sortOrder to legacy search repository calls', async () => {
    const repositorySearch = jest
      .spyOn((controller as any).bookRepository, 'search')
      .mockResolvedValue({ rows: [], total: 0 });

    const request: UniversalRequest = {
      headers: { 'accept-language': 'en' },
      queryStringParameters: {
        sortBy: SEARCH_SORT_BY_FIELDS.AUTHOR,
        sortOrder: SORT_DIRECTIONS.DESC,
        page: '1',
        limit: '20',
      },
      user: { id: 1, email: 'test@example.com', role: 'user', provider: 'cognito' },
    };

    const result = await controller.searchBooks(request);

    expect(result.statusCode).toBe(200);
    expect(repositorySearch).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
      }),
      expect.objectContaining({
        orderBy: SEARCH_SORT_BY_FIELDS.AUTHOR,
        orderDirection: SORT_DIRECTIONS.DESC,
        includeAssociations: true,
      })
    );
  });

  it('rejects stale sortBy values in the search controller', async () => {
    const request: UniversalRequest = {
      headers: { 'accept-language': 'en' },
      queryStringParameters: {
        q: 'test',
        sortBy: 'date-added',
      },
      user: { id: 1, email: 'test@example.com', role: 'user', provider: 'cognito' },
    };

    const result = await controller.searchBooks(request);

    expect(result.statusCode).toBe(400);
    expect(result.success).toBe(false);
  });

  it('rejects relevance as a public search sortBy value', async () => {
    const request: UniversalRequest = {
      headers: { 'accept-language': 'en' },
      queryStringParameters: {
        q: 'test',
        sortBy: 'relevance',
      },
      user: { id: 1, email: 'test@example.com', role: 'user', provider: 'cognito' },
    };

    const result = await controller.searchBooks(request);

    expect(result.statusCode).toBe(400);
    expect(result.success).toBe(false);
  });
});
