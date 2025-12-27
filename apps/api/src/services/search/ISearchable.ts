/**
 * ISearchable - Interface for resources that support full-text search
 *
 * This interface defines the contract for any resource (Book, Author, Category)
 * that needs to support:
 * - Full-text search with MySQL FULLTEXT or LIKE fallback
 * - Relevance scoring
 * - Pinned results
 * - Multi-field sorting with tie-breaker
 */

import { ResourceType, SortDirection } from '@my-many-books/shared-types';

/**
 * Sort field with direction
 */
export interface SortField {
  field: string;
  direction: SortDirection;
}

/**
 * Base search options for any searchable resource
 */
export interface BaseSearchOptions {
  query: string;
  userId?: number;
  sortBy?: string | string[]; // Support single field or array of fields
  sortOrder?: SortDirection;
  limit?: number;
  offset?: number;
}

/**
 * Generic search result with relevance scoring and pinning
 */
export interface SearchResult<T = any> {
  /** Resource ID */
  id: number;
  /** User ID (for user-specific resources) */
  userId?: number;
  /** Creation timestamp */
  creationDate?: Date;
  /** Last update timestamp */
  updateDate?: Date;
  /** Whether this result is pinned */
  isPinned?: boolean;
  /** Relevance score from FULLTEXT search (0-100, higher is better) */
  relevanceScore?: number;
  /** Resource-specific data */
  data: T;
}

/**
 * Interface for searchable resources
 * Implement this interface on models that support full-text search
 */
export interface ISearchable {
  /** Resource type from RESOURCE_TYPES constant */
  readonly resourceType: ResourceType;

  /** Array of valid sortable field names */
  readonly SORTABLE_FIELD_VALUES: readonly string[];

  /**
   * Validate if a field name is sortable
   * @param field - Field name to validate
   * @returns true if field is sortable
   */
  isSortableField(field: string): boolean;
}

/**
 * Search repository adapter interface
 * Implement this to provide data access for search operations
 */
export interface ISearchAdapter<T> {
  /**
   * Search using MySQL FULLTEXT
   * @param query - Search query string
   * @param userId - Optional user ID for user-specific results
   * @param limit - Max results to return
   * @param offset - Pagination offset
   * @returns Search results with relevance scores
   */
  searchFulltext(
    query: string,
    userId?: number,
    limit?: number,
    offset?: number
  ): Promise<{
    rows: T[];
    total: number;
    relevanceScores: Map<number, number>;
  }>;

  /**
   * Search using LIKE fallback (when FULLTEXT is disabled)
   * @param query - Search query string
   * @param userId - Optional user ID for user-specific results
   * @param limit - Max results to return
   * @param offset - Pagination offset
   * @returns Search results without relevance scores
   */
  searchLike(
    query: string,
    userId?: number,
    limit?: number,
    offset?: number
  ): Promise<{
    rows: T[];
    total: number;
  }>;

  /**
   * Find pinned results for this resource type
   * @param userId - User ID
   * @returns Pinned results with priority ordering
   */
  findPinned(userId?: number): Promise<Array<{
    resourceId: number;
    priority: number;
  }>>;
}
