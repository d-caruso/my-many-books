/**
 * Search business logic manager - platform agnostic
 */

import { Book, Author, Category, SearchFilters, SearchResult } from '@my-many-books/shared-types';
import { normalizeISBN, validateISBN } from '@my-many-books/shared-utils';

export interface SearchAPI {
  searchBooks(filters: SearchFilters & { q?: string; page?: number; limit?: number }): Promise<SearchResult>;
  searchAuthors(query: string): Promise<Author[]>;
  getCategories(): Promise<Category[]>;
}

export class SearchManager {
  constructor(private api: SearchAPI) {}

  /**
   * Smart search that handles different types of queries
   */
  async smartSearch(query: string, filters: SearchFilters = {}): Promise<SearchResult> {
    const cleanQuery = query.trim();
    
    if (!cleanQuery && !this.hasActiveFilters(filters)) {
      return {
        books: [],
        total: 0,
        hasMore: false,
        page: 1
      };
    }

    // Check if query looks like an ISBN
    if (this.isISBNQuery(cleanQuery)) {
      return await this.searchByISBN(cleanQuery, filters);
    }

    // Regular text search
    return await this.api.searchBooks({
      q: cleanQuery,
      page: 1,
      limit: 20,
      ...filters
    });
  }

  /**
   * Search specifically by ISBN with validation
   */
  async searchByISBN(isbn: string, filters: SearchFilters = {}): Promise<SearchResult> {
    const normalizedISBN = normalizeISBN(isbn);
    const validation = validateISBN(normalizedISBN);

    if (!validation.isValid) {
      throw new Error(`Invalid ISBN format: ${isbn}. Please enter a valid 10 or 13 digit ISBN.`);
    }

    return await this.api.searchBooks({
      q: normalizedISBN,
      page: 1,
      limit: 20,
      ...filters
    });
  }

  /**
   * Advanced search with multiple criteria
   */
  async advancedSearch(criteria: {
    title?: string;
    author?: string;
    isbn?: string;
    category?: number;
    status?: Book['status'];
    yearFrom?: number;
    yearTo?: number;
  }): Promise<SearchResult> {
    const filters: SearchFilters = {};
    let queryParts: string[] = [];

    // Build query string
    if (criteria.title?.trim()) {
      queryParts.push(criteria.title.trim());
    }

    if (criteria.author?.trim()) {
      queryParts.push(criteria.author.trim());
    }

    if (criteria.isbn?.trim()) {
      const normalizedISBN = normalizeISBN(criteria.isbn);
      const validation = validateISBN(normalizedISBN);
      
      if (!validation.isValid) {
        throw new Error(`Invalid ISBN format: ${criteria.isbn}`);
      }
      
      queryParts.push(normalizedISBN);
    }

    // Set filters
    if (criteria.category) {
      filters.categoryId = criteria.category;
    }

    if (criteria.status) {
      filters.status = criteria.status;
    }

    const query = queryParts.join(' ');

    return await this.api.searchBooks({
      q: query,
      page: 1,
      limit: 20,
      ...filters
    });
  }

  /**
   * Get search suggestions for autocomplete
   */
  async getSearchSuggestions(query: string): Promise<{
    authors: Author[];
    categories: Category[];
    isISBN: boolean;
  }> {
    const cleanQuery = query.trim();
    
    if (cleanQuery.length < 2) {
      return {
        authors: [],
        categories: [],
        isISBN: false
      };
    }

    const [authors, categories] = await Promise.all([
      this.api.searchAuthors(cleanQuery).catch(() => []),
      this.api.getCategories().then(cats => 
        cats.filter(cat => 
          cat.name.toLowerCase().includes(cleanQuery.toLowerCase())
        )
      ).catch(() => [])
    ]);

    return {
      authors: authors.slice(0, 5), // Limit suggestions
      categories: categories.slice(0, 5),
      isISBN: this.isISBNQuery(cleanQuery)
    };
  }

  /**
   * Filter books by reading status
   */
  static filterBooksByStatus(books: Book[], status: Book['status']): Book[] {
    return books.filter(book => book.status === status);
  }

  /**
   * Sort books by different criteria
   */
  static sortBooks(books: Book[], sortBy: 'title' | 'author' | 'date-added' | 'status'): Book[] {
    return [...books].sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        
        case 'author':
          const authorA = a.authors?.[0] ? `${a.authors[0].surname} ${a.authors[0].name}` : '';
          const authorB = b.authors?.[0] ? `${b.authors[0].surname} ${b.authors[0].name}` : '';
          return authorA.localeCompare(authorB);
        
        case 'date-added':
          return new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime();
        
        case 'status':
          const statusOrder = { 'in progress': 0, 'paused': 1, 'finished': 2 };
          const statusA = statusOrder[a.status as keyof typeof statusOrder] ?? 3;
          const statusB = statusOrder[b.status as keyof typeof statusOrder] ?? 3;
          return statusA - statusB;
        
        default:
          return 0;
      }
    });
  }

  /**
   * Check if query looks like an ISBN
   */
  private isISBNQuery(query: string): boolean {
    const cleaned = normalizeISBN(query);
    return /^(\d{10}|\d{13})$/.test(cleaned);
  }

  /**
   * Check if search filters are active
   */
  private hasActiveFilters(filters: SearchFilters): boolean {
    return !!(filters.authorId || filters.categoryId || filters.status);
  }
}