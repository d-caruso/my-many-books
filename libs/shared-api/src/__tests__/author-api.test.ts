import { AuthorApi } from '../author-api';
import { MockHttpClient } from '../__mocks__/MockHttpClient';
import { ZodError } from 'zod';
import { Author } from '@my-many-books/shared-types';

describe('AuthorApi', () => {
  let mockHttpClient: MockHttpClient;
  let authorApi: AuthorApi;

  const mockAuthor: Author = {
    id: 1,
    name: 'John',
    surname: 'Doe',
    nationality: null,
    userId: 1,
    creationDate: '2024-01-01T00:00:00.000Z',
    updateDate: '2024-01-01T00:00:00.000Z',
  };

  const mockAuthors: Author[] = [
    mockAuthor,
    {
      id: 2,
      name: 'Jane',
      surname: 'Smith',
      nationality: 'American',
      userId: 1,
      creationDate: '2024-01-02T00:00:00.000Z',
      updateDate: '2024-01-02T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    mockHttpClient = new MockHttpClient();
    authorApi = new AuthorApi(mockHttpClient, {
      baseURL: 'https://api.example.com',
    });
  });

  afterEach(() => {
    mockHttpClient.reset();
  });

  describe('getAuthors', () => {
    it('should fetch all authors', async () => {
      mockHttpClient.setResponse('/authors', {
        data: mockAuthors,
        status: 200,
      });

      const result = await authorApi.getAuthors();

      expect(result).toEqual(mockAuthors);
      expect(result).toHaveLength(2);
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('GET');
      expect(lastRequest?.url).toContain('/authors');
    });

    it('should return empty array when no authors exist', async () => {
      mockHttpClient.setResponse('/authors', {
        data: [],
        status: 200,
      });

      const result = await authorApi.getAuthors();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should validate response against AuthorsArraySchema', async () => {
      const invalidResponse = [{ id: 1, invalid: 'data' }];
      mockHttpClient.setResponse('/authors', {
        data: invalidResponse,
        status: 200,
      });

      await expect(authorApi.getAuthors()).rejects.toThrow(ZodError);
    });

    it('should handle non-array responses', async () => {
      const invalidResponse = { notAnArray: 'data' };
      mockHttpClient.setResponse('/authors', {
        data: invalidResponse,
        status: 200,
      });

      await expect(authorApi.getAuthors()).rejects.toThrow(ZodError);
    });

    it('should propagate HTTP errors', async () => {
      mockHttpClient.setResponse('/authors', {
        data: { error: 'Server error' },
        status: 500,
      });

      await expect(authorApi.getAuthors()).rejects.toThrow('HTTP Error 500');
    });
  });

  describe('getAuthor', () => {
    it('should fetch a single author by id', async () => {
      mockHttpClient.setResponse('/authors/1', {
        data: mockAuthor,
        status: 200,
      });

      const result = await authorApi.getAuthor(1);

      expect(result).toEqual(mockAuthor);
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('GET');
      expect(lastRequest?.url).toContain('/authors/1');
    });

    it('should handle different author ids', async () => {
      const author2 = mockAuthors[1];
      mockHttpClient.setResponse('/authors/2', {
        data: author2,
        status: 200,
      });

      const result = await authorApi.getAuthor(2);

      expect(result).toEqual(author2);
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.url).toContain('/authors/2');
    });

    it('should validate response against AuthorSchema', async () => {
      const invalidAuthor = { id: 1, invalid: 'data' };
      mockHttpClient.setResponse('/authors/1', {
        data: invalidAuthor,
        status: 200,
      });

      await expect(authorApi.getAuthor(1)).rejects.toThrow(ZodError);
    });

    it('should handle 404 errors when author not found', async () => {
      mockHttpClient.setResponse('/authors/999', {
        data: { error: 'Not found' },
        status: 404,
      });

      await expect(authorApi.getAuthor(999)).rejects.toThrow('HTTP Error 404');
    });

    it('should handle missing required fields in response', async () => {
      const incompleteAuthor = { id: 1, name: 'John' };
      mockHttpClient.setResponse('/authors/1', {
        data: incompleteAuthor,
        status: 200,
      });

      await expect(authorApi.getAuthor(1)).rejects.toThrow(ZodError);
    });
  });

  describe('createAuthor', () => {
    const newAuthorData: Omit<Author, 'id' | 'creationDate' | 'updateDate'> = {
      name: 'New',
      surname: 'Author',
      nationality: 'Canadian',
      userId: 1,
    };

    it('should create a new author', async () => {
      mockHttpClient.setResponse('/authors', {
        data: mockAuthor,
        status: 201,
      });

      const result = await authorApi.createAuthor(newAuthorData);

      expect(result).toEqual(mockAuthor);
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('POST');
      expect(lastRequest?.url).toContain('/authors');
      expect(lastRequest?.data).toEqual(newAuthorData);
    });

    it('should create author with minimal required fields', async () => {
      const minimalData: Omit<Author, 'id' | 'creationDate' | 'updateDate'> = {
        name: 'John',
        surname: 'Doe',
        userId: 1,
      };
      mockHttpClient.setResponse('/authors', {
        data: { ...mockAuthor, nationality: undefined },
        status: 201,
      });

      const result = await authorApi.createAuthor(minimalData);

      expect(result.name).toBe('John');
      expect(result.surname).toBe('Doe');
    });

    it('should validate response against AuthorSchema', async () => {
      const invalidResponse = { id: 1, invalid: 'data' };
      mockHttpClient.setResponse('/authors', {
        data: invalidResponse,
        status: 201,
      });

      await expect(authorApi.createAuthor(newAuthorData)).rejects.toThrow(ZodError);
    });

    it('should handle validation errors from server', async () => {
      mockHttpClient.setResponse('/authors', {
        data: { error: 'Validation failed' },
        status: 400,
      });

      await expect(authorApi.createAuthor(newAuthorData)).rejects.toThrow('HTTP Error 400');
    });

    it('should handle duplicate author errors', async () => {
      mockHttpClient.setResponse('/authors', {
        data: { error: 'Author already exists' },
        status: 409,
      });

      await expect(authorApi.createAuthor(newAuthorData)).rejects.toThrow('HTTP Error 409');
    });
  });

  describe('updateAuthor', () => {
    const updateData: Partial<Omit<Author, 'id' | 'creationDate' | 'updateDate'>> = {
      name: 'Updated',
      nationality: 'Italian',
    };

    it('should update an author with PUT method', async () => {
      const updatedAuthor = { ...mockAuthor, ...updateData };
      mockHttpClient.setResponse('/authors/1', {
        data: updatedAuthor,
        status: 200,
      });

      const result = await authorApi.updateAuthor(1, updateData);

      expect(result.name).toBe('Updated');
      expect(result.nationality).toBe('Italian');
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('PUT');
      expect(lastRequest?.url).toContain('/authors/1');
      expect(lastRequest?.data).toEqual(updateData);
    });

    it('should update only specified fields', async () => {
      const partialUpdate = { surname: 'NewSurname' };
      const updatedAuthor = { ...mockAuthor, surname: 'NewSurname' };
      mockHttpClient.setResponse('/authors/1', {
        data: updatedAuthor,
        status: 200,
      });

      const result = await authorApi.updateAuthor(1, partialUpdate);

      expect(result.surname).toBe('NewSurname');
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.data).toEqual(partialUpdate);
    });

    it('should handle empty update data', async () => {
      mockHttpClient.setResponse('/authors/1', {
        data: mockAuthor,
        status: 200,
      });

      const result = await authorApi.updateAuthor(1, {});

      expect(result).toEqual(mockAuthor);
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.data).toEqual({});
    });

    it('should validate response against AuthorSchema', async () => {
      const invalidResponse = { id: 1, invalid: 'data' };
      mockHttpClient.setResponse('/authors/1', {
        data: invalidResponse,
        status: 200,
      });

      await expect(authorApi.updateAuthor(1, updateData)).rejects.toThrow(ZodError);
    });

    it('should handle 404 errors when author not found', async () => {
      mockHttpClient.setResponse('/authors/999', {
        data: { error: 'Not found' },
        status: 404,
      });

      await expect(authorApi.updateAuthor(999, updateData)).rejects.toThrow('HTTP Error 404');
    });

    it('should handle 403 errors when unauthorized', async () => {
      mockHttpClient.setResponse('/authors/1', {
        data: { error: 'Forbidden' },
        status: 403,
      });

      await expect(authorApi.updateAuthor(1, updateData)).rejects.toThrow('HTTP Error 403');
    });
  });

  describe('deleteAuthor', () => {
    it('should delete an author by id', async () => {
      mockHttpClient.setResponse('/authors/1', {
        data: undefined,
        status: 204,
      });

      await authorApi.deleteAuthor(1);

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('DELETE');
      expect(lastRequest?.url).toContain('/authors/1');
    });

    it('should handle different author ids', async () => {
      mockHttpClient.setResponse('/authors/42', {
        data: undefined,
        status: 204,
      });

      await authorApi.deleteAuthor(42);

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.url).toContain('/authors/42');
    });

    it('should handle 404 errors when author not found', async () => {
      mockHttpClient.setResponse('/authors/999', {
        data: { error: 'Not found' },
        status: 404,
      });

      await expect(authorApi.deleteAuthor(999)).rejects.toThrow('HTTP Error 404');
    });

    it('should handle 403 errors when unauthorized', async () => {
      mockHttpClient.setResponse('/authors/1', {
        data: { error: 'Forbidden' },
        status: 403,
      });

      await expect(authorApi.deleteAuthor(1)).rejects.toThrow('HTTP Error 403');
    });

    it('should handle 409 errors when author is in use', async () => {
      mockHttpClient.setResponse('/authors/1', {
        data: { error: 'Author has associated books' },
        status: 409,
      });

      await expect(authorApi.deleteAuthor(1)).rejects.toThrow('HTTP Error 409');
    });
  });

  describe('searchAuthors', () => {
    it('should search authors by query string', async () => {
      mockHttpClient.setResponse('/authors/search', {
        data: [mockAuthor],
        status: 200,
      });

      const result = await authorApi.searchAuthors('John');

      expect(result).toEqual([mockAuthor]);
      expect(result).toHaveLength(1);
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('GET');
      expect(lastRequest?.url).toContain('/authors/search');
      expect(lastRequest?.config?.params).toEqual({ q: 'John' });
    });

    it('should handle empty search results', async () => {
      mockHttpClient.setResponse('/authors/search', {
        data: [],
        status: 200,
      });

      const result = await authorApi.searchAuthors('NonexistentAuthor');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should handle multiple search results', async () => {
      mockHttpClient.setResponse('/authors/search', {
        data: mockAuthors,
        status: 200,
      });

      const result = await authorApi.searchAuthors('author');

      expect(result).toEqual(mockAuthors);
      expect(result).toHaveLength(2);
    });

    it('should handle wrapped search responses with metadata', async () => {
      mockHttpClient.setResponse('/authors/search', {
        data: {
          results: mockAuthors,
          total: mockAuthors.length,
          limit: 20,
          offset: 0,
        },
        status: 200,
      });

      const result = await authorApi.searchAuthors('author');

      expect(result).toEqual(mockAuthors);
      expect(result).toHaveLength(2);
    });

    it('should handle special characters in search query', async () => {
      mockHttpClient.setResponse('/authors/search', {
        data: [mockAuthor],
        status: 200,
      });

      await authorApi.searchAuthors('O\'Reilly');

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.config?.params?.q).toBe('O\'Reilly');
    });

    it('should handle empty query string', async () => {
      mockHttpClient.setResponse('/authors/search', {
        data: mockAuthors,
        status: 200,
      });

      const result = await authorApi.searchAuthors('');

      expect(result).toEqual(mockAuthors);
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.config?.params?.q).toBe('');
    });

    it('should validate response against AuthorsArraySchema', async () => {
      const invalidResponse = [{ id: 1, invalid: 'data' }];
      mockHttpClient.setResponse('/authors/search', {
        data: invalidResponse,
        status: 200,
      });

      await expect(authorApi.searchAuthors('John')).rejects.toThrow(ZodError);
    });

    it('should handle non-array search responses', async () => {
      const invalidResponse = { notAnArray: 'data' };
      mockHttpClient.setResponse('/authors/search', {
        data: invalidResponse,
        status: 200,
      });

      await expect(authorApi.searchAuthors('John')).rejects.toThrow(ZodError);
    });

    it('should propagate HTTP errors', async () => {
      mockHttpClient.setResponse('/authors/search', {
        data: { error: 'Server error' },
        status: 500,
      });

      await expect(authorApi.searchAuthors('John')).rejects.toThrow('HTTP Error 500');
    });
  });
});
