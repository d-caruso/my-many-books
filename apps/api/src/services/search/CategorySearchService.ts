/**
 * CategorySearchService - Service for searching categories with FULLTEXT or LIKE fallback
 */

import { injectable, inject } from 'inversify';
import { RESOURCE_TYPES, SORT_DIRECTIONS } from '@my-many-books/shared-types';
import { Category } from '../../models/Category';
import { CategoryEntity } from '../../domain/entities/Category';
import { SequelizeCategoryAdapter } from '../../repositories/category/adapters/SequelizeCategoryAdapter';
import { SearchSettingsService } from '../SearchSettingsService';
import { TYPES } from '../../container/types';
import { FullTextSearchService } from './FullTextSearchService';
import { BaseSearchOptions, SortField, SearchResult } from './ISearchable';
import { CategorySearchResultDTO, toCategorySearchResultDTO } from '../../dtos/category/CategorySearchResultDTO';
import { SearchConfig } from './SearchConfig';

export interface CategorySearchOptions extends BaseSearchOptions {}

@injectable()
export class CategorySearchService extends FullTextSearchService<CategoryEntity> {
  constructor(
    @inject(TYPES.SearchSettingsService) searchSettingsService: SearchSettingsService
  ) {
    super(
      RESOURCE_TYPES.CATEGORY,
      Category.SORTABLE_FIELD_VALUES,
      new SequelizeCategoryAdapter(),
      searchSettingsService
    );

    SearchConfig.register({
      resourceType: RESOURCE_TYPES.CATEGORY,
      sortableFields: Category.SORTABLE_FIELD_VALUES,
      defaultSortField: 'name',
      defaultSortDirection: SORT_DIRECTIONS.ASC,
      supportsFulltext: true,
    });
  }

  async search(options: CategorySearchOptions): Promise<{
    results: CategorySearchResultDTO[];
    total: number;
  }> {
    const { results, total } = await this.performSearch(options);
    const dtoResults = results.map(toCategorySearchResultDTO);

    return {
      results: dtoResults,
      total,
    };
  }

  protected toSearchResult(
    category: CategoryEntity,
    meta: { isPinned: boolean; relevanceScore?: number }
  ): SearchResult<CategoryEntity> {
    return {
      id: category.id,
      userId: category.userId,
      creationDate: category.creationDate,
      updateDate: category.updateDate,
      isPinned: meta.isPinned,
      relevanceScore: meta.relevanceScore,
      data: category,
    };
  }

  protected getDefaultSort(): SortField[] {
    return [{ field: 'name', direction: SORT_DIRECTIONS.ASC }];
  }
}
