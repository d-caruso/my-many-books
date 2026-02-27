/**
 * AuthorSearchService - Service for searching authors with FULLTEXT or LIKE fallback
 *
 * This service extends the generic FullTextSearchService to provide
 * author-specific search functionality.
 *
 * Features:
 * - MySQL FULLTEXT search with relevance scoring
 * - LIKE fallback when FULLTEXT is disabled
 * - Pinned results always appear first
 * - Multi-field sorting with tie-breaker
 * - sortBy validation against Author.SORTABLE_FIELD_VALUES
 */

import { injectable, inject } from 'inversify';
import { RESOURCE_TYPES, SORT_DIRECTIONS } from '@my-many-books/shared-types';
import { Author } from '../../models/Author';
import { AuthorEntity } from '../../domain/entities/Author';
import { SequelizeAuthorAdapter } from '../../repositories/author/adapters/SequelizeAuthorAdapter';
import { SearchSettingsService } from '../SearchSettingsService';
import { TYPES } from '../../container/types';
import { FullTextSearchService } from './FullTextSearchService';
import { BaseSearchOptions, SortField, SearchResult } from './ISearchable';
import { AuthorSearchResultDTO, toAuthorSearchResultDTO } from '../../dtos/author/AuthorSearchResultDTO';
import { SearchConfig } from './SearchConfig';

/**
 * Author search options - extends BaseSearchOptions
 */
export type AuthorSearchOptions = BaseSearchOptions;

@injectable()
export class AuthorSearchService extends FullTextSearchService<AuthorEntity> {
  constructor(
    @inject(TYPES.SearchSettingsService) searchSettingsService: SearchSettingsService
  ) {
    super(
      RESOURCE_TYPES.AUTHOR,
      Author.SORTABLE_FIELD_VALUES,
      new SequelizeAuthorAdapter(),
      searchSettingsService
    );

    // Register search configuration using constants
    SearchConfig.register({
      resourceType: RESOURCE_TYPES.AUTHOR,
      sortableFields: Author.SORTABLE_FIELD_VALUES,
      defaultSortField: 'surname',
      defaultSortDirection: SORT_DIRECTIONS.ASC,
      supportsFulltext: true,
    });
  }

  /**
   * Search authors with FULLTEXT or LIKE fallback
   * Returns AuthorSearchResultDTO for API responses
   */
  async search(options: AuthorSearchOptions): Promise<{
    results: AuthorSearchResultDTO[];
    total: number;
  }> {
    const { results, total } = await this.performSearch(options);

    // Convert SearchResult<AuthorEntity> to AuthorSearchResultDTO
    const dtoResults = results.map(toAuthorSearchResultDTO);

    return {
      results: dtoResults,
      total,
    };
  }

  /**
   * Convert AuthorEntity to SearchResult (internal format)
   */
  protected toSearchResult(
    author: AuthorEntity,
    meta: { isPinned: boolean; relevanceScore?: number }
  ): SearchResult<AuthorEntity> {
    return {
      id: author.id,
      userId: author.userId,
      creationDate: author.creationDate,
      updateDate: author.updateDate,
      isPinned: meta.isPinned,
      relevanceScore: meta.relevanceScore,
      data: author,
    };
  }

  /**
   * Get default sort when no sortBy is specified
   * Default: surname ASC, name ASC
   */
  protected getDefaultSort(): SortField[] {
    return [
      { field: 'surname', direction: SORT_DIRECTIONS.ASC },
      { field: 'name', direction: SORT_DIRECTIONS.ASC },
    ];
  }
}
