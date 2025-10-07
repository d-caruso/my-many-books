/**
 * Unified API service using shared-api library
 * Replaces the old api.ts with modern monorepo architecture
 */

import { createApiClient, HttpClient, ApiClientConfig } from '@my-many-books/shared-api';
import { Book, User, Author, Category, PaginatedResponse, ApiError, SearchFilters, SearchResult } from '../types';
import { BookFormData } from '../components/Book/BookForm';
import axios from 'axios';


// Axios adapter for web platform
class AxiosHttpClient implements HttpClient {
  private axios;

  constructor(baseURL?: string, timeout?: number) {
    // NOTE: We don't pass baseURL to axios.create() because shared-api's BaseApiClient
    // constructs full URLs by prepending baseURL to endpoints. Axios should receive
    // complete URLs, not relative paths. This is the industry standard for layered APIs.
    this.axios = axios.create({
      timeout,
    });
    // Add request interceptor for auth token
    this.axios.interceptors.request.use((config: any) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.axios.interceptors.response.use(
      (response: any) => {
        // Extract data field from API response structure
        // In production, unwrap nested success response if present
        if (response.data && response.data.success && response.data.data !== undefined) {
          return response.data.data;
        }
        return response.data;
      },
      (error: any) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - redirect to login
          localStorage.removeItem('authToken');
          // Don't redirect in test environment
          if (typeof window !== 'undefined' && import.meta.env.MODE !== 'test') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: any): Promise<T> {
    return this.axios.get(url, config);
  }

  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    return this.axios.post(url, data, config);
  }

  async put<T>(url: string, data?: any, config?: any): Promise<T> {
    return this.axios.put(url, data, config);
  }

  async delete<T>(url: string, config?: any): Promise<T> {
    return this.axios.delete(url, config);
  }
}

// Interface for API service dependencies
interface ApiServiceDependencies {
  apiClient?: any;
  httpClient?: HttpClient;
  config?: ApiClientConfig;
}

// Enhanced API service with dependency injection and mock data support
class ApiService {
  private apiClient: any;

  constructor(dependencies: ApiServiceDependencies = {}) {
    // Use injected API client if provided (for testing)
    if (dependencies.apiClient) {
      this.apiClient = dependencies.apiClient;
      return;
    }

    // Create API client configuration (use injected or default)
    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

    // Ensure baseURL is never empty string (fallback to default if it is)
    const validBaseURL = baseURL && baseURL.trim() !== '' ? baseURL : 'http://localhost:3000';

    const apiConfig: ApiClientConfig = dependencies.config || {
      baseURL: validBaseURL,
      timeout: 10000,
      getAuthToken: () => localStorage.getItem('authToken'),
      onUnauthorized: () => {
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      },
    };

    // Create HTTP client (use injected or default)
    const httpClient = dependencies.httpClient || new AxiosHttpClient(apiConfig.baseURL, apiConfig.timeout);

    // Create and configure the API client
    this.apiClient = createApiClient(httpClient, apiConfig);
  }

  // Mock data for development mode - preserved from old api.ts
  private getMockBooks(): Promise<PaginatedResponse<Book>> {
    const mockBooks: Book[] = [
      {
        id: 1,
        title: "The Great Gatsby",
        isbnCode: "9780743273565",
        editionNumber: 1,
        editionDate: "2004-09-30",
        status: "finished",
        notes: "Classic American literature",
        userId: 1,
        authors: [{ id: 1, name: "F. Scott", surname: "Fitzgerald", nationality: "American", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" }],
        categories: [{ id: 1, name: "Fiction", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" }, { id: 2, name: "Classic Literature", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" }],
        creationDate: "2024-01-15T10:00:00Z",
        updateDate: "2024-01-15T10:00:00Z"
      },
      {
        id: 2,
        title: "To Kill a Mockingbird",
        isbnCode: "9780061120084",
        editionNumber: 1,
        editionDate: "2006-05-23",
        status: "in progress",
        notes: "Powerful story about justice and morality",
        userId: 1,
        authors: [{ id: 2, name: "Harper", surname: "Lee", nationality: "American", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" }],
        categories: [{ id: 1, name: "Fiction", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" }, { id: 3, name: "Social Issues", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" }],
        creationDate: "2024-01-20T14:30:00Z",
        updateDate: "2024-01-25T16:45:00Z"
      },
      {
        id: 3,
        title: "1984",
        isbnCode: "9780451524935",
        editionNumber: 1,
        editionDate: "1961-01-01",
        status: "paused",
        notes: "Dystopian masterpiece",
        userId: 1,
        authors: [{ id: 3, name: "George", surname: "Orwell", nationality: "British", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" }],
        categories: [{ id: 1, name: "Fiction", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" }, { id: 4, name: "Dystopian", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" }],
        creationDate: "2024-02-01T09:15:00Z",
        updateDate: "2024-02-01T09:15:00Z"
      }
    ];

    return Promise.resolve({
      books: mockBooks,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: mockBooks.length,
        itemsPerPage: 10
      }
    });
  }

  private getMockCategories(): Promise<Category[]> {
    return Promise.resolve([
      { id: 1, name: "Fiction", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
      { id: 2, name: "Classic Literature", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
      { id: 3, name: "Social Issues", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
      { id: 4, name: "Dystopian", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
      { id: 5, name: "Science Fiction", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
      { id: 6, name: "Mystery", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
      { id: 7, name: "Romance", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
      { id: 8, name: "Non-Fiction", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" }
    ]);
  }

  private getMockAuthors(): Promise<Author[]> {
    return Promise.resolve([
      { id: 1, name: "F. Scott", surname: "Fitzgerald", nationality: "American", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
      { id: 2, name: "Harper", surname: "Lee", nationality: "American", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
      { id: 3, name: "George", surname: "Orwell", nationality: "British", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
      { id: 4, name: "Jane", surname: "Austen", nationality: "British", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" },
      { id: 5, name: "Mark", surname: "Twain", nationality: "American", creationDate: "2024-01-01T00:00:00Z", updateDate: "2024-01-01T00:00:00Z" }
    ]);
  }

  private getMockSearchResults(searchParams: {
    q?: string;
    page?: number;
    limit?: number;
    status?: string;
    sortBy?: string;
    authorId?: number;
    categoryId?: number;
  }): Promise<SearchResult> {
    const mockBooksData = this.getMockBooks();
    return mockBooksData.then(data => {
      let filteredBooks = data.books || [];
      
      // Filter by search query
      if (searchParams.q) {
        const query = searchParams.q.toLowerCase();
        filteredBooks = filteredBooks.filter(book => 
          book.title.toLowerCase().includes(query) ||
          book.authors?.some(author => 
            `${author.name} ${author.surname}`.toLowerCase().includes(query)
          ) ||
          book.isbnCode.includes(query)
        );
      }
      
      // Filter by status
      if (searchParams.status) {
        filteredBooks = filteredBooks.filter(book => book.status === searchParams.status);
      }
      
      // Filter by author
      if (searchParams.authorId) {
        filteredBooks = filteredBooks.filter(book => 
          book.authors?.some(author => author.id === searchParams.authorId)
        );
      }
      
      // Filter by category
      if (searchParams.categoryId) {
        filteredBooks = filteredBooks.filter(book => 
          book.categories?.some(category => category.id === searchParams.categoryId)
        );
      }
      
      // Sort results
      if (searchParams.sortBy) {
        switch (searchParams.sortBy) {
          case 'title':
            filteredBooks.sort((a, b) => a.title.localeCompare(b.title));
            break;
          case 'author':
            filteredBooks.sort((a, b) => {
              const aAuthor = a.authors?.[0] ? `${a.authors[0].name} ${a.authors[0].surname}` : '';
              const bAuthor = b.authors?.[0] ? `${b.authors[0].name} ${b.authors[0].surname}` : '';
              return aAuthor.localeCompare(bAuthor);
            });
            break;
          case 'date-added':
            filteredBooks.sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());
            break;
        }
      }
      
      const page = searchParams.page || 1;
      const limit = searchParams.limit || 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedBooks = filteredBooks.slice(startIndex, endIndex);
      
      return {
        books: paginatedBooks,
        total: filteredBooks.length,
        hasMore: endIndex < filteredBooks.length,
        page
      };
    });
  }

  // User methods
  async getCurrentUser(): Promise<User> {
    return this.apiClient.users.getCurrentUser();
  }

  async updateProfile(userData: Partial<User>): Promise<User> {
    return this.apiClient.users.updateProfile(userData);
  }

  // Book methods with development mock data fallback
  async getBooks(filters?: SearchFilters): Promise<PaginatedResponse<Book>> {
    // In development mode without API URL, return mock data
    if (import.meta.env.MODE === 'development' && !import.meta.env.VITE_API_BASE_URL) {
      return this.getMockBooks();
    }

    return this.apiClient.books.getBooks(filters?.page || 1, filters?.limit || 10);
  }

  async getBook(id: number): Promise<Book> {
    return this.apiClient.books.getBook(id);
  }

  async createBook(bookData: BookFormData): Promise<Book> {
    // Transform frontend format to backend format
    const backendData = {
      title: bookData.title,
      isbnCode: bookData.isbnCode,
      editionNumber: bookData.editionNumber,
      editionDate: bookData.editionDate,
      status: bookData.status,
      notes: bookData.notes,
      authorIds: bookData.selectedAuthors?.map(author => author.id) || [],
      categoryIds: bookData.selectedCategories || []
    };
    return this.apiClient.books.createBook(backendData);
  }

  async updateBook(id: number, bookData: Partial<BookFormData>): Promise<Book> {
    // Transform frontend format to backend format if it includes form data
    const backendData = bookData.selectedAuthors || bookData.selectedCategories ? {
      title: bookData.title,
      isbnCode: bookData.isbnCode,
      editionNumber: bookData.editionNumber,
      editionDate: bookData.editionDate,
      status: bookData.status,
      notes: bookData.notes,
      ...(bookData.selectedAuthors && { authorIds: bookData.selectedAuthors.map(author => author.id) }),
      ...(bookData.selectedCategories && { categoryIds: bookData.selectedCategories })
    } : bookData;
    
    return this.apiClient.books.updateBook(id, backendData);
  }

  async deleteBook(id: number): Promise<void> {
    return this.apiClient.books.deleteBook(id);
  }

  // Search books with enhanced filters
  async searchBooks(searchParams: {
    q?: string;
    page?: number;
    limit?: number;
    status?: string;
    sortBy?: string;
    authorId?: number;
    categoryId?: number;
  }): Promise<SearchResult> {
    // In development mode without API URL, return mock data
    if (import.meta.env.MODE === 'development' && !import.meta.env.VITE_API_BASE_URL) {
      return this.getMockSearchResults(searchParams);
    }

    // Transform parameters for shared API
    const filters: SearchFilters = {
      query: searchParams.q,
      status: searchParams.status as any,
      sortBy: searchParams.sortBy as any,
      authorId: searchParams.authorId,
      categoryId: searchParams.categoryId,
      page: searchParams.page,
      limit: searchParams.limit
    };

    return this.apiClient.books.searchBooks(filters);
  }

  // ISBN lookup
  async searchByISBN(isbn: string): Promise<any> {
    return this.apiClient.books.searchByISBN(isbn);
  }

  // Categories methods with development mock data fallback
  async getCategories(): Promise<Category[]> {
    // In development mode without API URL, return mock data
    if (import.meta.env.MODE === 'development' && !import.meta.env.VITE_API_BASE_URL) {
      return this.getMockCategories();
    }

    return this.apiClient.categories.getCategories();
  }

  async getCategory(id: number): Promise<Category> {
    return this.apiClient.categories.getCategory(id);
  }

  async createCategory(categoryData: { name: string }): Promise<Category> {
    return this.apiClient.categories.createCategory(categoryData);
  }

  // Authors methods with development mock data fallback
  async getAuthors(): Promise<Author[]> {
    // In development mode without API URL, return mock data
    if (import.meta.env.MODE === 'development' && !import.meta.env.VITE_API_BASE_URL) {
      return this.getMockAuthors();
    }

    return this.apiClient.authors.getAuthors();
  }

  async searchAuthors(searchTerm: string): Promise<Author[]> {
    if (!searchTerm.trim()) {
      return [];
    }

    // In development mode without API URL, return filtered mock data
    if (import.meta.env.MODE === 'development' && !import.meta.env.VITE_API_BASE_URL) {
      const mockAuthors = await this.getMockAuthors();
      return mockAuthors.filter(author =>
        author.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        author.surname.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return this.apiClient.authors.searchAuthors(searchTerm.trim());
  }

  async getAuthor(id: number): Promise<Author> {
    return this.apiClient.authors.getAuthor(id);
  }

  async createAuthor(authorData: { name: string; surname: string; nationality?: string }): Promise<Author> {
    return this.apiClient.authors.createAuthor(authorData);
  }

  // Error handler
  handleApiError(error: any): ApiError {
    if (error.response?.data) {
      return error.response.data as ApiError;
    }
    return {
      error: 'Network error',
      details: error.message || 'Unknown error occurred'
    };
  }
}

// Factory function for creating API service with dependencies (useful for testing)
export const createApiService = (dependencies?: ApiServiceDependencies): ApiService => {
  return new ApiService(dependencies);
};

// Default API service instance
export const apiService = new ApiService();

// Export the class and interface for direct usage in tests
export { ApiService };
export type { ApiServiceDependencies };

// Legacy export for compatibility - ensure all existing imports continue to work
export const bookAPI = {
  searchBooks: apiService.searchBooks.bind(apiService),
  searchByISBN: apiService.searchByISBN.bind(apiService),
  getBooks: apiService.getBooks.bind(apiService),
  getBook: apiService.getBook.bind(apiService),
  createBook: apiService.createBook.bind(apiService),
  updateBook: apiService.updateBook.bind(apiService),
  deleteBook: apiService.deleteBook.bind(apiService),
};

export const categoryAPI = {
  getCategories: apiService.getCategories.bind(apiService),
  getCategory: apiService.getCategory.bind(apiService),
  createCategory: apiService.createCategory.bind(apiService),
};

export const authorAPI = {
  getAuthors: apiService.getAuthors.bind(apiService),
  searchAuthors: apiService.searchAuthors.bind(apiService),
  getAuthor: apiService.getAuthor.bind(apiService),
  createAuthor: apiService.createAuthor.bind(apiService),
};

export const userAPI = {
  getCurrentUser: apiService.getCurrentUser.bind(apiService),
  updateProfile: apiService.updateProfile.bind(apiService),
};

// Individual API clients are accessed through the main apiService instance