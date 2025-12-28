import { SearchResult } from '../../services/search/ISearchable';
import { CategoryEntity } from '../../domain/entities/Category';

export interface CategorySearchResultDTO {
  id: number;
  name: string;
  userId?: number;
  creationDate?: Date;
  updateDate?: Date;
  isPinned?: boolean;
  relevanceScore?: number;
}

export const toCategorySearchResultDTO = (result: SearchResult<CategoryEntity>): CategorySearchResultDTO => {
  return {
    id: result.id,
    name: result.data.name,
    userId: result.userId,
    creationDate: result.creationDate,
    updateDate: result.updateDate,
    isPinned: result.isPinned,
    relevanceScore: result.relevanceScore,
  };
};
