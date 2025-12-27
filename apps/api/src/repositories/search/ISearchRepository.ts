/**
 * ISearchRepository - Interface for search operations
 *
 * Defines methods for FULLTEXT search, LIKE search, and pinned results
 */

import { ResourceType, SortDirection } from '@my-many-books/shared-types';

export interface SearchOptions {
  query: string;
  sortBy?: string;
  sortOrder?: SortDirection;
  limit?: number;
  offset?: number;
  userId?: number;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  relevanceScores?: Map<number, number>;
}

export interface PinnedResult {
  resourceId: number;
  priority: number;
}

/**
 * Generic search repository interface
 */
export interface ISearchRepository<T> {
  /**
   * Search using MySQL FULLTEXT index with MATCH...AGAINST
   * Returns relevance scores for sorting
   */
  searchFulltext(options: SearchOptions): Promise<SearchResult<T>>;

  /**
   * Search using LIKE operator (fallback when FULLTEXT is disabled)
   */
  searchLike(options: SearchOptions): Promise<SearchResult<T>>;

  /**
   * Find pinned results for this resource type
   * Returns items that should always appear first in search results
   */
  findPinned(resourceType: ResourceType, userId?: number): Promise<PinnedResult[]>;
}
