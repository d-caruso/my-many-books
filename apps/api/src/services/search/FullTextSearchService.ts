/**
 * FullTextSearchService - Generic base class for full-text search
 *
 * This generic service provides reusable full-text search functionality for any
 * searchable resource (Book, Author, Category, etc).
 *
 * Features:
 * - MySQL FULLTEXT search with relevance scoring
 * - LIKE fallback when FULLTEXT is disabled
 * - Pinned results always appear first
 * - Multi-field sorting with cascading
 * - Deterministic pagination with tie-breaker
 * - Validation against model's SORTABLE_FIELD_VALUES
 *
 * Usage:
 * ```typescript
 * class BookSearchService extends FullTextSearchService<Book> {
 *   constructor(searchSettingsService: SearchSettingsService) {
 *     super(
 *       RESOURCE_TYPES.BOOK,
 *       Book.SORTABLE_FIELD_VALUES,
 *       new SequelizeBookAdapter(),
 *       searchSettingsService
 *     );
 *   }
 * }
 * ```
 */

import { getLogger, type AppLogger } from '@my-many-books/shared-logging';
import { ResourceType, SortDirection, SORT_DIRECTIONS } from '@my-many-books/shared-types';
import { SearchSettingsService } from '../SearchSettingsService';
import { BaseSearchOptions, SortField, ISearchAdapter, SearchResult } from './ISearchable';

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Generic full-text search service
 * @template T - The resource model type (Book, Author, Category, etc)
 */
export abstract class FullTextSearchService<T extends { id: number }> {
  protected logger: AppLogger;

  constructor(
    protected readonly resourceType: ResourceType,
    protected readonly sortableFields: readonly string[],
    protected readonly adapter: ISearchAdapter<T>,
    protected readonly searchSettingsService: SearchSettingsService
  ) {
    this.logger = getLogger();
  }

  /**
   * Perform search with FULLTEXT or LIKE fallback
   * Child classes should call this from their public search() method
   * and can transform the results as needed
   */
  protected async performSearch(options: BaseSearchOptions): Promise<{
    results: SearchResult<T>[];
    total: number;
  }> {
    // Normalize sortBy to array for consistent handling
    const sortFields = this.normalizeSortFields(options.sortBy, options.sortOrder);

    // Validate all sortBy fields against SORTABLE_FIELD_VALUES
    for (const sortField of sortFields) {
      if (!this.sortableFields.includes(sortField.field)) {
        throw new Error(
          `Invalid sortBy field: ${sortField.field}. Must be one of: ${this.sortableFields.join(', ')}`
        );
      }
    }

    const limit = Math.min(options.limit ?? 20, 100);
    const offset = Math.max(options.offset ?? 0, 0);

    // Check if FULLTEXT is enabled
    const fulltextEnabled = await this.searchSettingsService.isFulltextEnabled();

    // Fetch pinned results
    const pinnedResults = await this.adapter.findPinned(options.userId);
    const pinnedIds = new Set(pinnedResults.map(p => p.resourceId));

    // Perform search
    let searchResults: T[];
    let total: number;
    let relevanceScores = new Map<number, number>();

    if (fulltextEnabled) {
      this.logger.debug(`Using FULLTEXT search for ${this.resourceType}`);
      const result = await this.adapter.searchFulltext(
        options.query,
        options.userId,
        limit,
        offset
      );
      searchResults = result.rows;
      total = result.total;
      relevanceScores = result.relevanceScores;
    } else {
      this.logger.debug(`Using LIKE search for ${this.resourceType} (FULLTEXT disabled)`);
      const result = await this.adapter.searchLike(
        options.query,
        options.userId,
        limit,
        offset
      );
      searchResults = result.rows;
      total = result.total;
    }

    // Convert to SearchResult and separate pinned/regular
    const pinnedItems: SearchResult<T>[] = [];
    const regularItems: SearchResult<T>[] = [];

    for (const item of searchResults) {
      const result = this.toSearchResult(item, {
        isPinned: pinnedIds.has(item.id),
        relevanceScore: relevanceScores.get(item.id),
      });

      if (pinnedIds.has(item.id)) {
        pinnedItems.push(result);
      } else {
        regularItems.push(result);
      }
    }

    // Sort pinned by priority
    pinnedItems.sort((a, b) => {
      const priorityA = pinnedResults.find(p => p.resourceId === a.id)?.priority ?? 999;
      const priorityB = pinnedResults.find(p => p.resourceId === b.id)?.priority ?? 999;
      return priorityA - priorityB;
    });

    // Sort regular results by sortBy/sortOrder or relevance
    if (sortFields.length > 0) {
      this.sortResults(regularItems, sortFields);
    } else if (fulltextEnabled && relevanceScores.size > 0) {
      // For relevance-based sorting (no explicit sortBy), add stable secondary sort
      this.sortByRelevanceWithSecondarySort(regularItems);
    } else {
      // Empty query or no FULLTEXT - use default sort
      this.sortResults(regularItems, this.getDefaultSort());
    }

    return {
      results: [...pinnedItems, ...regularItems],
      total,
    };
  }

  /**
   * Convert raw model to SearchResult
   * Override this method to customize how the model is converted
   */
  protected abstract toSearchResult(
    item: T,
    meta: { isPinned: boolean; relevanceScore?: number }
  ): SearchResult<T>;

  /**
   * Get default sort when no sortBy is specified
   * Override this method to customize default sort
   */
  protected abstract getDefaultSort(): SortField[];

  /**
   * Normalize sortBy to array of SortField objects
   */
  protected normalizeSortFields(
    sortBy?: string | string[],
    sortOrder: SortDirection = SORT_DIRECTIONS.ASC
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
   * Uses updateDate DESC as secondary sort, then id ASC as final tie-breaker
   */
  protected sortByRelevanceWithSecondarySort(results: SearchResult<T>[]): void {
    results.sort((a, b) => {
      const aScore = a.relevanceScore ?? 0;
      const bScore = b.relevanceScore ?? 0;

      // Primary sort: relevance score (descending - higher is better)
      if (aScore !== bScore) {
        return bScore - aScore;
      }

      // Secondary sort: updateDate (descending - newer first)
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
  protected sortResults(results: SearchResult<T>[], sortFields: SortField[]): void {
    results.sort((a, b) => {
      // Try each sort field in order
      for (const { field, direction } of sortFields) {
        // Access nested data properties
        const aVal = this.getFieldValue(a, field);
        const bVal = this.getFieldValue(b, field);

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
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          comparison = aVal.localeCompare(bVal);
        } else if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else if (aVal instanceof Date && bVal instanceof Date) {
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

  /**
   * Get field value from SearchResult, checking both top-level and data property
   */
  protected getFieldValue(result: SearchResult<T>, field: string): string | number | Date | undefined {
    if (field === 'id') return result.id;
    if (field === 'userId') return result.userId;
    if (field === 'creationDate') return result.creationDate;
    if (field === 'updateDate') return result.updateDate;
    if (field === 'relevanceScore') return result.relevanceScore;

    if (isObjectRecord(result.data) && field in result.data) {
      const dataRecord = result.data as Record<string, unknown>;
      const val = dataRecord[field];
      if (typeof val === 'string' || typeof val === 'number' || val instanceof Date) {
        return val;
      }
    }

    return undefined;
  }
}
