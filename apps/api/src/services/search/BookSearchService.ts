/**
 * BookSearchService - Service for searching books with FULLTEXT or LIKE fallback
 *
 * Features:
 * - MySQL FULLTEXT search with relevance scoring
 * - LIKE fallback when FULLTEXT is disabled
 * - Pinned results always appear first
 * - Field weighting (title > notes)
 * - sortBy validation against Book.SORTABLE_FIELD_VALUES
 */

import { injectable, inject } from 'inversify';
import { getLogger, type AppLogger } from '@my-many-books/shared-logging';
import { SORT_DIRECTIONS } from '@my-many-books/shared-types';
import { Book } from '../../models/Book';
import { SequelizeBookAdapter } from '../../repositories/book/adapters/SequelizeBookAdapter';
import { SearchSettingsService } from '../SearchSettingsService';
import { TYPES } from '../../container/types';

export interface SortField {
  field: string;
  direction: 'asc' | 'desc';
}

export interface BookSearchOptions {
  query: string;
  userId?: number;
  sortBy?: string | string[]; // Support single field or array of fields
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface BookSearchResult {
  id: number;
  title: string;
  isbnCode: string;
  status?: string;
  notes?: string;
  userId?: number;
  creationDate?: Date;
  updateDate?: Date;
  isPinned?: boolean;
  relevanceScore?: number;
}

@injectable()
export class BookSearchService {
  private logger: AppLogger;
  private bookAdapter: SequelizeBookAdapter;
  private searchSettingsService: SearchSettingsService;

  constructor(
    @inject(TYPES.SearchSettingsService) searchSettingsService: SearchSettingsService
  ) {
    this.logger = getLogger();
    this.bookAdapter = new SequelizeBookAdapter();
    this.searchSettingsService = searchSettingsService;
  }

  /**
   * Search books with FULLTEXT or LIKE fallback
   */
  async search(options: BookSearchOptions): Promise<{
    results: BookSearchResult[];
    total: number;
  }> {
    // Normalize sortBy to array for consistent handling
    const sortFields = this.normalizeSortFields(options.sortBy, options.sortOrder);

    // Validate all sortBy fields against Book.SORTABLE_FIELD_VALUES
    for (const sortField of sortFields) {
      if (!Book.SORTABLE_FIELD_VALUES.includes(sortField.field as any)) {
        throw new Error(
          `Invalid sortBy field: ${sortField.field}. Must be one of: ${Book.SORTABLE_FIELD_VALUES.join(', ')}`
        );
      }
    }

    const limit = Math.min(options.limit ?? 20, 100);
    const offset = Math.max(options.offset ?? 0, 0);

    // Check if FULLTEXT is enabled
    const fulltextEnabled = await this.searchSettingsService.isFulltextEnabled();

    // Fetch pinned results
    const pinnedResults = await this.bookAdapter.findPinned(options.userId);
    const pinnedIds = new Set(pinnedResults.map(p => p.resourceId));

    // Perform search
    let searchResults: any[];
    let total: number;
    let relevanceScores = new Map<number, number>();

    if (fulltextEnabled) {
      this.logger.debug('Using FULLTEXT search');
      const result = await this.bookAdapter.searchFulltext(
        options.query,
        options.userId,
        limit,
        offset
      );
      searchResults = result.rows;
      total = result.total;
      relevanceScores = result.relevanceScores;
    } else {
      this.logger.debug('Using LIKE search (FULLTEXT disabled)');
      const result = await this.bookAdapter.searchLike(
        options.query,
        options.userId,
        limit,
        offset
      );
      searchResults = result.rows;
      total = result.total;
    }

    // Merge pinned + regular results
    const pinnedBooks: BookSearchResult[] = [];
    const regularBooks: BookSearchResult[] = [];

    for (const book of searchResults) {
      const result: BookSearchResult = {
        id: book.id,
        title: book.title,
        isbnCode: book.isbnCode,
        status: book.status,
        notes: book.notes,
        userId: book.userId,
        creationDate: book.creationDate,
        updateDate: book.updateDate,
        isPinned: pinnedIds.has(book.id),
        relevanceScore: relevanceScores.get(book.id),
      };

      if (pinnedIds.has(book.id)) {
        pinnedBooks.push(result);
      } else {
        regularBooks.push(result);
      }
    }

    // Sort pinned by priority
    pinnedBooks.sort((a, b) => {
      const priorityA = pinnedResults.find(p => p.resourceId === a.id)?.priority ?? 999;
      const priorityB = pinnedResults.find(p => p.resourceId === b.id)?.priority ?? 999;
      return priorityA - priorityB;
    });

    // Sort regular results by sortBy/sortOrder or relevance
    if (sortFields.length > 0) {
      this.sortResults(regularBooks, sortFields);
    } else if (fulltextEnabled && relevanceScores.size > 0) {
      // For relevance-based sorting (no explicit sortBy), add stable secondary sort
      this.sortByRelevanceWithSecondarySort(regularBooks);
    } else {
      // Empty query or no FULLTEXT - use default sort (title ASC)
      this.sortResults(regularBooks, [
        { field: 'title', direction: SORT_DIRECTIONS.ASC },
      ]);
    }

    return {
      results: [...pinnedBooks, ...regularBooks],
      total,
    };
  }

  /**
   * Normalize sortBy to array of SortField objects
   */
  private normalizeSortFields(
    sortBy?: string | string[],
    sortOrder: 'asc' | 'desc' = SORT_DIRECTIONS.ASC
  ): SortField[] {
    if (!sortBy) {
      return [];
    }

    const fields = Array.isArray(sortBy) ? sortBy : [sortBy];
    return fields.map(field => ({
      field,
      direction: sortOrder,
    }));
  }

  /**
   * Sort by relevance score with stable secondary sort
   * Uses updatedAt DESC as secondary sort, then id ASC as final tie-breaker
   */
  private sortByRelevanceWithSecondarySort(results: BookSearchResult[]): void {
    results.sort((a, b) => {
      const aScore = a.relevanceScore ?? 0;
      const bScore = b.relevanceScore ?? 0;

      // Primary sort: relevance score (descending - higher is better)
      if (aScore !== bScore) {
        return bScore - aScore;
      }

      // Secondary sort: updatedAt (descending - newer first)
      const aUpdated = a.updateDate ? new Date(a.updateDate).getTime() : 0;
      const bUpdated = b.updateDate ? new Date(b.updateDate).getTime() : 0;
      if (aUpdated !== bUpdated) {
        return bUpdated - aUpdated;
      }

      // Final tie-breaker: id (ascending for deterministic pagination)
      return a.id - b.id;
    });
  }

  /**
   * Sort results by multiple fields with tie-breaker
   * Uses id as final tie-breaker for deterministic pagination
   */
  private sortResults(results: BookSearchResult[], sortFields: SortField[]): void {
    results.sort((a, b) => {
      // Try each sort field in order
      for (const { field, direction } of sortFields) {
        const aVal = (a as any)[field];
        const bVal = (b as any)[field];

        // Handle null/undefined
        if (aVal === undefined || aVal === null) {
          if (bVal === undefined || bVal === null) continue; // Both null, try next field
          return 1; // a is null, b is not - a comes after
        }
        if (bVal === undefined || bVal === null) {
          return -1; // b is null, a is not - b comes after
        }

        // Compare values
        let comparison = 0;
        if (typeof aVal === 'string') {
          comparison = aVal.localeCompare(bVal);
        } else if (typeof aVal === 'number') {
          comparison = aVal - bVal;
        } else if (aVal instanceof Date) {
          comparison = aVal.getTime() - bVal.getTime();
        }

        // Apply sort direction
        const directedComparison = direction === SORT_DIRECTIONS.DESC ? -comparison : comparison;

        // If different, return the result
        if (directedComparison !== 0) {
          return directedComparison;
        }

        // Equal - continue to next sort field
      }

      // Tie-breaker: if all sort fields are equal, sort by id (ascending for deterministic pagination)
      return a.id - b.id;
    });
  }
}
