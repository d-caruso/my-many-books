import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Book, User, Author, Category, PaginatedResponse, ApiError, SearchFilters, SearchResult } from '../types';
import { BookFormData } from '../components/Book/BookForm';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000',
      timeout: 10000,
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor to handle errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - redirect to login
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // User methods  
  async getCurrentUser(): Promise<User> {
    const response = await this.api.get('/api/users');
    return response.data;
  }

  async updateProfile(userData: Partial<User>): Promise<User> {
    const response = await this.api.put('/api/users', userData);
    return response.data;
  }

  // Mock data for development mode
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

  // Book methods
  async getBooks(filters?: SearchFilters): Promise<PaginatedResponse<Book>> {
    // In development mode, return mock data
    if (process.env.NODE_ENV === 'development' && !process.env.REACT_APP_API_BASE_URL) {
      return this.getMockBooks();
    }
    
    const params = new URLSearchParams();
    
    if (filters?.query) params.append('search', filters.query);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await this.api.get(`/api/books?${params.toString()}`);
    return response.data;
  }

  async getBook(id: number): Promise<Book> {
    const response = await this.api.get(`/api/books/${id}`);
    return response.data;
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
    const response = await this.api.post('/api/books', backendData);
    return response.data;
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
    
    const response = await this.api.put(`/api/books/${id}`, backendData);
    return response.data;
  }

  async deleteBook(id: number): Promise<void> {
    await this.api.delete(`/api/books/${id}`);
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
    // In development mode, return mock data
    if (process.env.NODE_ENV === 'development' && !process.env.REACT_APP_API_BASE_URL) {
      return this.getMockSearchResults(searchParams);
    }
    
    const params = new URLSearchParams();
    
    // Use search query for title search
    if (searchParams.q) params.append('search', searchParams.q);
    if (searchParams.status) params.append('status', searchParams.status);
    if (searchParams.page) params.append('page', searchParams.page.toString());
    if (searchParams.limit) params.append('limit', searchParams.limit.toString());
    
    // For author/category filtering, we'll need to implement this on the backend
    // For now, use general search
    const response = await this.api.get(`/api/books?${params.toString()}`);
    
    // Transform response to match SearchResult interface
    const data = response.data;
    return {
      books: data.books || [],
      total: data.pagination?.totalItems || data.total || 0,
      hasMore: data.pagination ? data.pagination.currentPage < data.pagination.totalPages : false,
      page: data.pagination?.currentPage || data.page || 1
    };
  }

  // ISBN lookup
  async searchByIsbn(isbn: string): Promise<any> {
    const response = await this.api.get(`/api/books/search/isbn/${isbn}`);
    return response.data;
  }

  // Categories methods
  async getCategories(): Promise<Category[]> {
    // In development mode, return mock data
    if (process.env.NODE_ENV === 'development' && !process.env.REACT_APP_API_BASE_URL) {
      return this.getMockCategories();
    }
    
    const response = await this.api.get('/api/categories');
    return response.data.categories || response.data;
  }

  async getCategory(id: number): Promise<Category> {
    const response = await this.api.get(`/api/categories/${id}`);
    return response.data;
  }

  async createCategory(categoryData: { name: string }): Promise<Category> {
    const response = await this.api.post('/api/categories', categoryData);
    return response.data;
  }

  // Authors methods
  async getAuthors(): Promise<Author[]> {
    // In development mode, return mock data
    if (process.env.NODE_ENV === 'development' && !process.env.REACT_APP_API_BASE_URL) {
      return this.getMockAuthors();
    }
    
    const response = await this.api.get('/api/authors');
    return response.data.authors || response.data;
  }

  async searchAuthors(searchTerm: string): Promise<Author[]> {
    if (!searchTerm.trim()) {
      return [];
    }
    
    // In development mode, return filtered mock data
    if (process.env.NODE_ENV === 'development' && !process.env.REACT_APP_API_BASE_URL) {
      const mockAuthors = await this.getMockAuthors();
      return mockAuthors.filter(author => 
        author.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        author.surname.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    const response = await this.api.get(`/api/authors?search=${encodeURIComponent(searchTerm.trim())}`);
    return response.data.authors || response.data;
  }

  async getAuthor(id: number): Promise<Author> {
    const response = await this.api.get(`/api/authors/${id}`);
    return response.data;
  }

  async createAuthor(authorData: { name: string; surname: string; nationality?: string }): Promise<Author> {
    const response = await this.api.post('/api/authors', authorData);
    return response.data;
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

export const apiService = new ApiService();

// Legacy export for compatibility
export const bookAPI = {
  searchBooks: apiService.searchBooks.bind(apiService),
  searchByIsbn: apiService.searchByIsbn.bind(apiService),
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