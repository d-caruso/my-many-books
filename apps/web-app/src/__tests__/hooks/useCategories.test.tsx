import { renderHook, act } from '@testing-library/react';
import { useCategories } from '../../hooks/useCategories';
import { Category } from '../../hooks/../types';
import { ApiProvider } from '../../contexts/ApiContext';
import React from 'react';

// Create mock API service
const mockCategoryAPI = {
  getCategories: vi.fn(),
  createCategory: vi.fn(),
};

const mockApiService = {
  getCategories: mockCategoryAPI.getCategories,
  createCategory: mockCategoryAPI.createCategory,
  // Add other methods that might be accessed
  searchBooks: vi.fn(),
  searchByISBN: vi.fn(),
  getBooks: vi.fn(),
  getBook: vi.fn(),
  createBook: vi.fn(),
  updateBook: vi.fn(),
  deleteBook: vi.fn(),
  getCategory: vi.fn(),
  getAuthors: vi.fn(),
  searchAuthors: vi.fn(),
  getAuthor: vi.fn(),
  createAuthor: vi.fn(),
  getCurrentUser: vi.fn(),
  updateProfile: vi.fn(),
} as any;

// Mock console.error to keep tests clean
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

const mockCategories: Category[] = [
  { id: 1, name: 'Fiction' },
  { id: 2, name: 'Adventure' },
  { id: 3, name: 'Biography' },
];

describe('useCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  test('initializes with empty state and loads categories on mount', async () => {
    mockCategoryAPI.getCategories.mockResolvedValue(mockCategories);

    const { result } = renderHook(() => useCategories(), {
      wrapper: ({ children }) => <ApiProvider apiService={mockApiService}>{children}</ApiProvider>,
    });

    // Initial state
    expect(result.current.categories).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.loadCategories).toBe('function');
    expect(typeof result.current.createCategory).toBe('function');

    // Wait for categories to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockCategoryAPI.getCategories).toHaveBeenCalledTimes(1);
    expect(result.current.categories).toEqual([
      { id: 2, name: 'Adventure' },
      { id: 3, name: 'Biography' },
      { id: 1, name: 'Fiction' },
    ]); // Should be sorted alphabetically
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  describe('loadCategories', () => {
    test('loads and sorts categories successfully', async () => {
      const unsortedCategories = [
        { id: 1, name: 'Fiction' },
        { id: 2, name: 'Adventure' },
        { id: 3, name: 'Zorro' },
        { id: 4, name: 'Biography' },
      ];

      mockCategoryAPI.getCategories.mockResolvedValue(unsortedCategories);

      const { result } = renderHook(() => useCategories(), {
        wrapper: ({ children }) => <ApiProvider apiService={mockApiService}>{children}</ApiProvider>,
      });

      await act(async () => {
        await result.current.loadCategories();
      });

      expect(result.current.categories).toEqual([
        { id: 2, name: 'Adventure' },
        { id: 4, name: 'Biography' },
        { id: 1, name: 'Fiction' },
        { id: 3, name: 'Zorro' },
      ]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    test('handles API errors with detailed message', async () => {
      const apiError = {
        response: {
          data: {
            message: 'Failed to fetch categories from server',
          },
        },
      };

      mockCategoryAPI.getCategories.mockRejectedValue(apiError);

      const { result } = renderHook(() => useCategories(), {
        wrapper: ({ children }) => <ApiProvider apiService={mockApiService}>{children}</ApiProvider>,
      });

      await act(async () => {
        await result.current.loadCategories();
      });

      expect(result.current.error).toBe('Failed to fetch categories from server');
      expect(result.current.loading).toBe(false);
      expect(result.current.categories).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load categories:', apiError);
    });

    test('handles API errors with generic message', async () => {
      const genericError = new Error('Network error');

      mockCategoryAPI.getCategories.mockRejectedValue(genericError);

      const { result } = renderHook(() => useCategories(), {
        wrapper: ({ children }) => <ApiProvider apiService={mockApiService}>{children}</ApiProvider>,
      });

      await act(async () => {
        await result.current.loadCategories();
      });

      expect(result.current.error).toBe('Failed to load categories');
      expect(result.current.loading).toBe(false);
      expect(result.current.categories).toEqual([]);
    });

    test('sets loading state correctly during fetch', async () => {
      let resolvePromise: (value: Category[]) => void;
      const promise = new Promise<Category[]>((resolve) => {
        resolvePromise = resolve;
      });

      mockCategoryAPI.getCategories.mockReturnValue(promise);

      const { result } = renderHook(() => useCategories(), {
        wrapper: ({ children }) => <ApiProvider apiService={mockApiService}>{children}</ApiProvider>,
      });

      // Should start loading immediately on mount
      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise!(mockCategories);
        await promise;
      });

      expect(result.current.loading).toBe(false);
    });

    test('clears previous error when loading again', async () => {
      // First call fails
      mockCategoryAPI.getCategories.mockRejectedValueOnce(new Error('First error'));

      const { result } = renderHook(() => useCategories(), {
        wrapper: ({ children }) => <ApiProvider apiService={mockApiService}>{children}</ApiProvider>,
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.error).toBe('Failed to load categories');

      // Second call succeeds
      mockCategoryAPI.getCategories.mockResolvedValue(mockCategories);

      await act(async () => {
        await result.current.loadCategories();
      });

      expect(result.current.error).toBe(null);
      expect(result.current.categories).toEqual(expect.any(Array));
    });
  });

  describe('createCategory', () => {
    test('creates category successfully and adds to sorted list', async () => {
      // Initial categories
      mockCategoryAPI.getCategories.mockResolvedValue([
        { id: 1, name: 'Fiction' },
        { id: 3, name: 'Biography' },
      ]);

      const newCategory: Category = { id: 2, name: 'Adventure' };
      mockCategoryAPI.createCategory.mockResolvedValue(newCategory);

      const { result } = renderHook(() => useCategories(), {
        wrapper: ({ children }) => <ApiProvider apiService={mockApiService}>{children}</ApiProvider>,
      });

      // Wait for initial load
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Create new category
      let createdCategory: Category | null = null;
      await act(async () => {
        createdCategory = await result.current.createCategory('Adventure');
      });

      expect(mockCategoryAPI.createCategory).toHaveBeenCalledWith({ name: 'Adventure' });
      expect(createdCategory).toEqual(newCategory);
      expect(result.current.categories).toEqual([
        { id: 2, name: 'Adventure' },
        { id: 3, name: 'Biography' },
        { id: 1, name: 'Fiction' },
      ]); // Should maintain alphabetical order
    });

    test('trims whitespace from category name', async () => {
      mockCategoryAPI.getCategories.mockResolvedValue([]);
      
      const newCategory: Category = { id: 1, name: 'Trimmed' };
      mockCategoryAPI.createCategory.mockResolvedValue(newCategory);

      const { result } = renderHook(() => useCategories(), {
        wrapper: ({ children }) => <ApiProvider apiService={mockApiService}>{children}</ApiProvider>,
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await act(async () => {
        await result.current.createCategory('  Trimmed  ');
      });

      expect(mockCategoryAPI.createCategory).toHaveBeenCalledWith({ name: 'Trimmed' });
    });

    test('returns null for empty category name', async () => {
      mockCategoryAPI.getCategories.mockResolvedValue([]);

      const { result } = renderHook(() => useCategories(), {
        wrapper: ({ children }) => <ApiProvider apiService={mockApiService}>{children}</ApiProvider>,
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      let createdCategory: Category | null = null;
      await act(async () => {
        createdCategory = await result.current.createCategory('');
      });

      expect(createdCategory).toBe(null);
      expect(mockCategoryAPI.createCategory).not.toHaveBeenCalled();
    });

    test('returns null for whitespace-only category name', async () => {
      mockCategoryAPI.getCategories.mockResolvedValue([]);

      const { result } = renderHook(() => useCategories(), {
        wrapper: ({ children }) => <ApiProvider apiService={mockApiService}>{children}</ApiProvider>,
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      let createdCategory: Category | null = null;
      await act(async () => {
        createdCategory = await result.current.createCategory('   ');
      });

      expect(createdCategory).toBe(null);
      expect(mockCategoryAPI.createCategory).not.toHaveBeenCalled();
    });

    test('handles create category API errors with detailed message', async () => {
      mockCategoryAPI.getCategories.mockResolvedValue([]);

      const apiError = {
        response: {
          data: {
            message: 'Category already exists',
          },
        },
      };

      mockCategoryAPI.createCategory.mockRejectedValue(apiError);

      const { result } = renderHook(() => useCategories(), {
        wrapper: ({ children }) => <ApiProvider apiService={mockApiService}>{children}</ApiProvider>,
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      let createdCategory: Category | null = null;
      await act(async () => {
        createdCategory = await result.current.createCategory('Duplicate');
      });

      expect(createdCategory).toBe(null);
      expect(result.current.error).toBe('Category already exists');
      expect(consoleSpy).toHaveBeenCalledWith('Failed to create category:', apiError);
    });

    test('handles create category API errors with generic message', async () => {
      mockCategoryAPI.getCategories.mockResolvedValue([]);
      
      const genericError = new Error('Network error');
      mockCategoryAPI.createCategory.mockRejectedValue(genericError);

      const { result } = renderHook(() => useCategories(), {
        wrapper: ({ children }) => <ApiProvider apiService={mockApiService}>{children}</ApiProvider>,
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      let createdCategory: Category | null = null;
      await act(async () => {
        createdCategory = await result.current.createCategory('NewCategory');
      });

      expect(createdCategory).toBe(null);
      expect(result.current.error).toBe('Failed to create category');
    });

    test('maintains sorted order when adding multiple categories', async () => {
      mockCategoryAPI.getCategories.mockResolvedValue([
        { id: 1, name: 'Fiction' },
      ]);

      const { result } = renderHook(() => useCategories(), {
        wrapper: ({ children }) => <ApiProvider apiService={mockApiService}>{children}</ApiProvider>,
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Add categories in non-alphabetical order
      mockCategoryAPI.createCategory
        .mockResolvedValueOnce({ id: 2, name: 'Zorro' })
        .mockResolvedValueOnce({ id: 3, name: 'Adventure' })
        .mockResolvedValueOnce({ id: 4, name: 'Biography' });

      await act(async () => {
        await result.current.createCategory('Zorro');
      });

      await act(async () => {
        await result.current.createCategory('Adventure');
      });

      await act(async () => {
        await result.current.createCategory('Biography');
      });

      expect(result.current.categories).toEqual([
        { id: 3, name: 'Adventure' },
        { id: 4, name: 'Biography' },
        { id: 1, name: 'Fiction' },
        { id: 2, name: 'Zorro' },
      ]);
    });
  });

  describe('error handling', () => {
    test('preserves categories when create fails', async () => {
      const existingCategories = [{ id: 1, name: 'Fiction' }];
      mockCategoryAPI.getCategories.mockResolvedValue(existingCategories);
      mockCategoryAPI.createCategory.mockRejectedValue(new Error('Create failed'));

      const { result } = renderHook(() => useCategories(), {
        wrapper: ({ children }) => <ApiProvider apiService={mockApiService}>{children}</ApiProvider>,
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const categoriesBeforeCreate = result.current.categories;

      await act(async () => {
        await result.current.createCategory('NewCategory');
      });

      expect(result.current.categories).toEqual(categoriesBeforeCreate);
      expect(result.current.error).toBe('Failed to create category');
    });
  });
});