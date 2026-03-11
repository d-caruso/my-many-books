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
 * - sortBy validation against shared search sort constants
 */

import { injectable, inject } from 'inversify';
import {
  RESOURCE_TYPES,
  SEARCH_SORT_BY_FIELDS,
  SEARCH_SORT_BY_FIELD_VALUES,
  SORT_DIRECTIONS,
  type SearchSortByField,
} from '@my-many-books/shared-types';
import { BookEntity } from '../../domain/entities/Book';
import type { Repository as BookRepositoryContract } from '../../repositories/book/Repository';
import { SearchSettingsService } from '../SearchSettingsService';
import { TYPES } from '../../container/types';
import { FullTextSearchService } from './FullTextSearchService';
import { BaseSearchOptions, SortField, SearchResult } from './ISearchable';
import { BookSearchResultDTO, toBookSearchResultDTO } from '../../dtos/book/BookSearchResultDTO';
import { SearchConfig } from './SearchConfig';

@injectable()
export class BookSearchService extends FullTextSearchService<BookEntity> {
  constructor(
    @inject(TYPES.BookRepository) private readonly bookRepository: BookRepositoryContract,
    @inject(TYPES.SearchSettingsService) searchSettingsService: SearchSettingsService
  ) {
    super(
      RESOURCE_TYPES.BOOK,
      SEARCH_SORT_BY_FIELD_VALUES,
      bookRepository,
      searchSettingsService
    );

    // Register search configuration using constants
    SearchConfig.register({
      resourceType: RESOURCE_TYPES.BOOK,
      sortableFields: SEARCH_SORT_BY_FIELD_VALUES,
      defaultSortField: SEARCH_SORT_BY_FIELDS.TITLE,
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
    const explicitSortField = this.resolveExplicitSortField(options.sortBy);
    const { results, total } = explicitSortField
      ? await this.performExplicitSortSearch({
          ...options,
          sortBy: explicitSortField,
        })
      : await this.performSearch(options);

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
    return [{ field: SEARCH_SORT_BY_FIELDS.TITLE, direction: SORT_DIRECTIONS.ASC }];
  }

  protected override getFieldValue(
    result: SearchResult<BookEntity>,
    field: string
  ): string | number | Date | undefined {
    switch (field) {
      case SEARCH_SORT_BY_FIELDS.AUTHOR: {
        const author = result.data.authors?.[0];
        if (!author) {
          return '';
        }
        return `${author.surname ?? ''}\u0000${author.name}`;
      }
      case SEARCH_SORT_BY_FIELDS.CREATED_AT:
        return result.creationDate;
      case SEARCH_SORT_BY_FIELDS.UPDATED_AT:
        return result.updateDate;
      default:
        return super.getFieldValue(result, field);
    }
  }

  private resolveExplicitSortField(sortBy?: string | string[]): SearchSortByField | undefined {
    if (Array.isArray(sortBy)) {
      if (sortBy.length !== 1) {
        return undefined;
      }
      return this.resolveExplicitSortField(sortBy[0]);
    }

    if (!sortBy) {
      return undefined;
    }

    return SEARCH_SORT_BY_FIELD_VALUES.includes(sortBy as SearchSortByField)
      ? (sortBy as SearchSortByField)
      : undefined;
  }

  private async performExplicitSortSearch(
    options: BaseSearchOptions & { sortBy: SearchSortByField }
  ): Promise<{
    results: SearchResult<BookEntity>[];
    total: number;
  }> {
    const limit = Math.min(options.limit ?? 20, 100);
    const offset = Math.max(options.offset ?? 0, 0);
    const sortFields = this.normalizeSortFields(options.sortBy, options.sortOrder);
    const pinnedResults = await this.bookRepository.findPinned(options.userId);
    const pinnedIds = new Set(pinnedResults.map(p => p.resourceId));
    const fulltextEnabled = await this.searchSettingsService.isFulltextEnabled();

    const searchResult = fulltextEnabled
      ? await this.bookRepository.searchFulltextSorted({
          query: options.query,
          userId: options.userId,
          sortBy: options.sortBy,
          sortOrder: options.sortOrder,
          limit,
          offset,
        })
      : await this.bookRepository.searchLikeSorted({
          query: options.query,
          userId: options.userId,
          sortBy: options.sortBy,
          sortOrder: options.sortOrder,
          limit,
          offset,
        });
    const relevanceScores =
      'relevanceScores' in searchResult && searchResult.relevanceScores instanceof Map
        ? searchResult.relevanceScores
        : undefined;

    const pinnedItems: SearchResult<BookEntity>[] = [];
    const regularItems: SearchResult<BookEntity>[] = [];

    for (const item of searchResult.rows) {
      const result = this.toSearchResult(item, {
        isPinned: pinnedIds.has(item.id),
        relevanceScore: relevanceScores?.get(item.id),
      });

      if (result.isPinned) {
        pinnedItems.push(result);
      } else {
        regularItems.push(result);
      }
    }

    pinnedItems.sort((a, b) => {
      const priorityA = pinnedResults.find(p => p.resourceId === a.id)?.priority ?? 999;
      const priorityB = pinnedResults.find(p => p.resourceId === b.id)?.priority ?? 999;
      return priorityA - priorityB;
    });

    this.sortResults(regularItems, sortFields);

    return {
      results: [...pinnedItems, ...regularItems],
      total: searchResult.total,
    };
  }
}
