import { SearchResult } from '../../services/search/ISearchable';
import { BookEntity } from '../../domain/entities/Book';

/**
 * Book search result DTO for API responses
 * Flat structure optimized for JSON serialization
 */
export interface BookSearchResultDTO {
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

/**
 * Convert SearchResult<BookEntity> to BookSearchResultDTO
 * Flattens the nested structure for API responses
 */
export const toBookSearchResultDTO = (result: SearchResult<BookEntity>): BookSearchResultDTO => {
  return {
    id: result.id,
    title: result.data.title,
    isbnCode: result.data.isbnCode,
    status: result.data.status,
    notes: result.data.notes,
    userId: result.userId,
    creationDate: result.creationDate,
    updateDate: result.updateDate,
    isPinned: result.isPinned,
    relevanceScore: result.relevanceScore,
  };
};
