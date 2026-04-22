import {
  ExternalBookPrefillSchema,
  IsbnSearchResponse,
  IsbnSearchResponseSchema,
} from '../isbnSearch';

describe('IsbnSearchResponseSchema', () => {
  it('parses a not-found response', () => {
    const result = IsbnSearchResponseSchema.parse({ found: false });

    expect(result.found).toBe(false);
  });

  it('parses a local DB hit', () => {
    const result = IsbnSearchResponseSchema.parse({
      found: true,
      external: false,
      book: {
        id: 1,
        isbnCode: '9780140449136',
        title: 'Test',
        userId: 2,
      },
    });

    expect(result.found).toBe(true);

    if (!result.found || result.external) {
      throw new Error('Expected a local DB hit');
    }

    const localResult = result as Extract<IsbnSearchResponse, { found: true; external: false }>;

    expect(localResult.book.id).toBe(1);
  });

  it('parses an external metadata hit', () => {
    const result = IsbnSearchResponseSchema.parse({
      found: true,
      external: true,
      book: {
        title: 'Test',
        authorIds: [10, 11],
        categoryIds: [5],
        createdAuthorIds: [11],
        createdCategoryIds: [],
      },
    });

    expect(result.found).toBe(true);

    if (!result.found || !result.external) {
      throw new Error('Expected an external metadata hit');
    }

    const externalResult = result as Extract<IsbnSearchResponse, { found: true; external: true }>;

    expect(externalResult.book.createdAuthorIds).toEqual([11]);
  });

  it('rejects a response missing the found field', () => {
    expect(() => IsbnSearchResponseSchema.parse({ external: false })).toThrow();
  });
});

describe('ExternalBookPrefillSchema', () => {
  it('requires resolved author and category identifiers', () => {
    expect(() =>
      ExternalBookPrefillSchema.parse({
        title: 'Test',
        createdAuthorIds: [],
        createdCategoryIds: [],
      })
    ).toThrow();
  });
});
