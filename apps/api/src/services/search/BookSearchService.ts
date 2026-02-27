/**
 * BookSearchService - Service for searching books with FULLTEXT or LIKE fallback
 *
 * This service extends the generic FullTextSearchService to provide
 * book-specific search functionality.
 *
 * Features:
 * - MySQL FULLTEXT search with relevance scoring
 * - LIKE fallback when FULLTEXT is disabled
 * - Pinned results always appear first
 * - Field weighting (title > notes)
 * - Multi-field sorting with tie-breaker
 * - sortBy validation against Book.SORTABLE_FIELD_VALUES
 */

import { injectable, inject } from 'inversify';
import { RESOURCE_TYPES, SORT_DIRECTIONS } from '@my-many-books/shared-types';
import { Book } from '../../models/Book';
import { BookEntity } from '../../domain/entities/Book';
import { SequelizeBookAdapter } from '../../repositories/book/adapters/SequelizeBookAdapter';
import { SearchSettingsService } from '../SearchSettingsService';
import { TYPES } from '../../container/types';
import { FullTextSearchService } from './FullTextSearchService';
import { BaseSearchOptions, SortField, SearchResult } from './ISearchable';
import { BookSearchResultDTO, toBookSearchResultDTO } from '../../dtos/book/BookSearchResultDTO';
import { SearchConfig } from './SearchConfig';

@injectable()
export class BookSearchService extends FullTextSearchService<BookEntity> {
  constructor(
    @inject(TYPES.SearchSettingsService) searchSettingsService: SearchSettingsService
  ) {
    super(
      RESOURCE_TYPES.BOOK,
      Book.SORTABLE_FIELD_VALUES,
      new SequelizeBookAdapter(),
      searchSettingsService
    );

    // Register search configuration using constants
    SearchConfig.register({
      resourceType: RESOURCE_TYPES.BOOK,
      sortableFields: Book.SORTABLE_FIELD_VALUES,
      defaultSortField: 'title',
      defaultSortDirection: SORT_DIRECTIONS.ASC,
      supportsFulltext: true,
    });
  }

  /**
   * Search books with FULLTEXT or LIKE fallback
   * Returns BookSearchResultDTO for API responses
   */
  async search(options: BaseSearchOptions): Promise<{
    results: BookSearchResultDTO[];
    total: number;
  }> {
    const { results, total } = await this.performSearch(options);

    // Convert SearchResult<BookEntity> to BookSearchResultDTO
    const dtoResults = results.map(toBookSearchResultDTO);

    return {
      results: dtoResults,
      total,
    };
  }

  /**
   * Convert BookEntity to SearchResult (internal format)
   */
  protected toSearchResult(
    book: BookEntity,
    meta: { isPinned: boolean; relevanceScore?: number }
  ): SearchResult<BookEntity> {
    return {
      id: book.id,
      userId: book.userId,
      creationDate: book.creationDate,
      updateDate: book.updateDate,
      isPinned: meta.isPinned,
      relevanceScore: meta.relevanceScore,
      data: book,
    };
  }

  /**
   * Get default sort when no sortBy is specified
   * Default: title ASC
   */
  protected getDefaultSort(): SortField[] {
    return [{ field: 'title', direction: SORT_DIRECTIONS.ASC }];
  }
}
