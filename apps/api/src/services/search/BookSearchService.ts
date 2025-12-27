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

export interface BookSearchOptions {
  query: string;
  userId?: number;
  sortBy?: string;
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
    // Validate sortBy against Book.SORTABLE_FIELD_VALUES
    if (options.sortBy && !Book.SORTABLE_FIELD_VALUES.includes(options.sortBy as any)) {
      throw new Error(
        `Invalid sortBy field: ${options.sortBy}. Must be one of: ${Book.SORTABLE_FIELD_VALUES.join(', ')}`
      );
    }

    // Validate sortOrder
    if (options.sortOrder && !['asc', 'desc'].includes(options.sortOrder)) {
      throw new Error(`Invalid sortOrder: ${options.sortOrder}. Must be 'asc' or 'desc'`);
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
    if (options.sortBy) {
      this.sortResults(regularBooks, options.sortBy, options.sortOrder ?? SORT_DIRECTIONS.ASC);
    }

    return {
      results: [...pinnedBooks, ...regularBooks],
      total,
    };
  }

  /**
   * Sort results by field and direction with tie-breaker
   * Uses id as tie-breaker for deterministic pagination
   */
  private sortResults(
    results: BookSearchResult[],
    sortBy: string,
    sortOrder: 'asc' | 'desc'
  ): void {
    results.sort((a, b) => {
      const aVal = (a as any)[sortBy];
      const bVal = (b as any)[sortBy];

      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      let comparison = 0;
      if (typeof aVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number') {
        comparison = aVal - bVal;
      } else if (aVal instanceof Date) {
        comparison = aVal.getTime() - bVal.getTime();
      }

      // Apply sort direction
      const directedComparison = sortOrder === SORT_DIRECTIONS.DESC ? -comparison : comparison;

      // Tie-breaker: if primary sort values are equal, sort by id (ascending for deterministic pagination)
      if (directedComparison === 0) {
        return a.id - b.id;
      }

      return directedComparison;
    });
  }
}
