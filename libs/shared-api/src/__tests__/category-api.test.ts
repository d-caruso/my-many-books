import { CategoryApi } from '../category-api';
import { MockHttpClient } from '../__mocks__/MockHttpClient';
import { ZodError } from 'zod';
import { Category } from '@my-many-books/shared-types';

describe('CategoryApi', () => {
  let mockHttpClient: MockHttpClient;
  let categoryApi: CategoryApi;

  const mockCategory: Category = {
    id: 1,
    name: 'Fiction',
    translationKey: 'categories.fiction',
    userId: 1,
    creationDate: '2024-01-01T00:00:00.000Z',
    updateDate: '2024-01-01T00:00:00.000Z',
    books: [{ id: 10, title: 'Test Book' }],
  };

  beforeEach(() => {
    mockHttpClient = new MockHttpClient();
    categoryApi = new CategoryApi(mockHttpClient, {
      baseURL: 'https://api.example.com',
    });
  });

  afterEach(() => {
    mockHttpClient.reset();
  });

  describe('getCategories', () => {
    it('should fetch all categories', async () => {
      mockHttpClient.setResponse('/categories', {
        data: [mockCategory],
        status: 200,
      });

      const result = await categoryApi.getCategories();

      expect(result).toEqual([mockCategory]);
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('GET');
      expect(lastRequest?.url).toContain('/categories');
    });

    it('should return empty array when no categories exist', async () => {
      mockHttpClient.setResponse('/categories', {
        data: [],
        status: 200,
      });

      const result = await categoryApi.getCategories();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should validate response against CategoriesArraySchema', async () => {
      const invalidResponse = [{ id: 1 }];
      mockHttpClient.setResponse('/categories', {
        data: invalidResponse,
        status: 200,
      });

      await expect(categoryApi.getCategories()).rejects.toThrow(ZodError);
    });

    it('should parse categories without translationKey for backward compatibility', async () => {
      const legacyCategory = {
        id: 2,
        name: 'Custom Category',
        userId: 1,
      };
      mockHttpClient.setResponse('/categories', {
        data: [legacyCategory],
        status: 200,
      });

      const result = await categoryApi.getCategories();
      expect(result[0]).toEqual(legacyCategory);
    });

    it('should handle non-array responses', async () => {
      const invalidResponse = { notAnArray: 'data' };
      mockHttpClient.setResponse('/categories', {
        data: invalidResponse,
        status: 200,
      });

      await expect(categoryApi.getCategories()).rejects.toThrow(ZodError);
    });

    it('should propagate HTTP errors', async () => {
      mockHttpClient.setResponse('/categories', {
        data: { error: 'Server error' },
        status: 500,
      });

      await expect(categoryApi.getCategories()).rejects.toThrow('HTTP Error 500');
    });
  });

  describe('getCategory', () => {
    it('should fetch a single category by id', async () => {
      mockHttpClient.setResponse('/categories/1', {
        data: mockCategory,
        status: 200,
      });

      const result = await categoryApi.getCategory(1);

      expect(result).toEqual(mockCategory);
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('GET');
      expect(lastRequest?.url).toContain('/categories/1');
    });

    it('should handle different category ids', async () => {
      const category2: Category = { ...mockCategory, id: 2, name: 'Non-fiction' };
      mockHttpClient.setResponse('/categories/2', {
        data: category2,
        status: 200,
      });

      const result = await categoryApi.getCategory(2);

      expect(result).toEqual(category2);
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.url).toContain('/categories/2');
    });

    it('should validate response against CategorySchema', async () => {
      const invalidCategory = { id: 1 };
      mockHttpClient.setResponse('/categories/1', {
        data: invalidCategory,
        status: 200,
      });

      await expect(categoryApi.getCategory(1)).rejects.toThrow(ZodError);
    });

    it('should handle 404 errors when category not found', async () => {
      mockHttpClient.setResponse('/categories/999', {
        data: { error: 'Not found' },
        status: 404,
      });

      await expect(categoryApi.getCategory(999)).rejects.toThrow('HTTP Error 404');
    });
  });

  describe('createCategory', () => {
    const newCategoryData: Omit<Category, 'id' | 'creationDate' | 'updateDate'> = {
      name: 'New Category',
      userId: 1,
    };

    it('should create a new category', async () => {
      mockHttpClient.setResponse('/categories', {
        data: mockCategory,
        status: 201,
      });

      const result = await categoryApi.createCategory(newCategoryData);

      expect(result).toEqual(mockCategory);
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('POST');
      expect(lastRequest?.url).toContain('/categories');
      expect(lastRequest?.data).toEqual(newCategoryData);
    });

    it('should validate response against CategorySchema', async () => {
      const invalidResponse = { id: 1 };
      mockHttpClient.setResponse('/categories', {
        data: invalidResponse,
        status: 201,
      });

      await expect(categoryApi.createCategory(newCategoryData)).rejects.toThrow(
        ZodError
      );
    });

    it('should handle validation errors from server', async () => {
      mockHttpClient.setResponse('/categories', {
        data: { error: 'Validation failed' },
        status: 400,
      });

      await expect(categoryApi.createCategory(newCategoryData)).rejects.toThrow(
        'HTTP Error 400'
      );
    });
  });

  describe('updateCategory', () => {
    const updateData: Partial<Omit<Category, 'id' | 'creationDate' | 'updateDate'>> =
      {
        name: 'Updated Category',
      };

    it('should update a category with PUT method', async () => {
      const updatedCategory: Category = { ...mockCategory, ...updateData };
      mockHttpClient.setResponse('/categories/1', {
        data: updatedCategory,
        status: 200,
      });

      const result = await categoryApi.updateCategory(1, updateData);

      expect(result).toEqual(updatedCategory);
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('PUT');
      expect(lastRequest?.url).toContain('/categories/1');
      expect(lastRequest?.data).toEqual(updateData);
    });

    it('should handle empty update data', async () => {
      mockHttpClient.setResponse('/categories/1', {
        data: mockCategory,
        status: 200,
      });

      const result = await categoryApi.updateCategory(1, {});

      expect(result).toEqual(mockCategory);
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.data).toEqual({});
    });

    it('should validate response against CategorySchema', async () => {
      const invalidResponse = { id: 1 };
      mockHttpClient.setResponse('/categories/1', {
        data: invalidResponse,
        status: 200,
      });

      await expect(categoryApi.updateCategory(1, updateData)).rejects.toThrow(
        ZodError
      );
    });
  });

  describe('deleteCategory', () => {
    it('should delete a category by id', async () => {
      mockHttpClient.setResponse('/categories/1', {
        data: undefined,
        status: 204,
      });

      await categoryApi.deleteCategory(1);

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('DELETE');
      expect(lastRequest?.url).toContain('/categories/1');
    });

    it('should handle 404 errors when category not found', async () => {
      mockHttpClient.setResponse('/categories/999', {
        data: { error: 'Not found' },
        status: 404,
      });

      await expect(categoryApi.deleteCategory(999)).rejects.toThrow(
        'HTTP Error 404'
      );
    });

    it('should handle 403 errors when unauthorized', async () => {
      mockHttpClient.setResponse('/categories/1', {
        data: { error: 'Forbidden' },
        status: 403,
      });

      await expect(categoryApi.deleteCategory(1)).rejects.toThrow(
        'HTTP Error 403'
      );
    });
  });
});
