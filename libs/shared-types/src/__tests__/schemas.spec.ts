import {
  AuthorSchema,
  BookFormSchema,
  BookSchema,
  BookStatusSchema,
  CategorySchema,
  createPaginatedResponseSchema,
  SearchFiltersSchema,
  SearchResultSchema,
  UserSchema,
} from '../index';

describe('shared-types schemas', () => {
  it('validates a full book payload', () => {
    const payload = {
      id: 1,
      isbnCode: '9781234567897',
      title: 'My Many Books',
      status: 'reading',
      creationDate: new Date().toISOString(),
      updateDate: new Date().toISOString(),
      authors: [
        { id: 10, name: 'Ada', surname: 'Lovelace', creationDate: new Date().toISOString(), updateDate: new Date().toISOString() },
      ],
      categories: [
        { id: 5, name: 'Tech', creationDate: new Date().toISOString(), updateDate: new Date().toISOString() },
      ],
    };

    const parsed = BookSchema.parse(payload);
    expect(parsed).toMatchObject({
      id: payload.id,
      isbnCode: payload.isbnCode,
      title: payload.title,
      status: payload.status,
      authors: payload.authors?.map(({ id, name, surname }) => ({ id, name, surname })),
      categories: payload.categories?.map(({ id, name }) => ({ id, name })),
    });
  });

  it('rejects invalid book status', () => {
    expect(() =>
      BookStatusSchema.parse('unknown')
    ).toThrow();
  });

  it('validates paginated responses', () => {
    const PaginatedBookSchema = createPaginatedResponseSchema(BookSchema);
    const result = PaginatedBookSchema.parse({
      books: [
        {
          id: 1,
          isbnCode: '111',
          title: 'Test',
          creationDate: new Date().toISOString(),
          updateDate: new Date().toISOString(),
        },
      ],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 1,
        itemsPerPage: 20,
      },
    });

    expect(result.books?.length).toBe(1);
  });

  it('validates author/category/user schemas', () => {
    const now = new Date().toISOString();
    expect(
      AuthorSchema.parse({ id: 1, name: 'Test', surname: 'User', creationDate: now, updateDate: now })
    ).toBeDefined();
    expect(
      CategorySchema.parse({ id: 2, name: 'Fiction', creationDate: now, updateDate: now })
    ).toBeDefined();
    expect(
      UserSchema.parse({
        id: 3,
        email: 'user@example.com',
        name: 'John',
        surname: 'Doe',
        isActive: true,
        role: 'user',
        creationDate: now,
        updateDate: now,
      })
    ).toBeDefined();
  });

  it('validates search helpers', () => {
    expect(
      SearchFiltersSchema.parse({ query: 'Test', page: 1, limit: 10 })
    ).toBeDefined();

    const result = SearchResultSchema.parse({
      books: [
        {
          id: 1,
          isbnCode: '123',
          title: 'Search Book',
          creationDate: new Date().toISOString(),
          updateDate: new Date().toISOString(),
        },
      ],
      total: 1,
      hasMore: false,
      page: 1,
    });

    expect(result.total).toBe(1);
  });

  it('validates book form inputs', () => {
    expect(
      BookFormSchema.parse({
        title: 'Form Book',
        isbnCode: '999',
        authorIds: [1, 2],
      })
    ).toBeDefined();
  });
});
