import { SearchResult } from '../../services/search/ISearchable';
import { AuthorEntity } from '../../domain/entities/Author';

/**
 * Author search result DTO for API responses
 * Flat structure optimized for JSON serialization
 */
export interface AuthorSearchResultDTO {
  id: number;
  name: string;
  surname: string;
  nationality?: string | null;
  userId?: number;
  creationDate?: Date;
  updateDate?: Date;
  isPinned?: boolean;
  relevanceScore?: number;
}

/**
 * Convert SearchResult<AuthorEntity> to AuthorSearchResultDTO
 * Flattens the nested structure for API responses
 */
export const toAuthorSearchResultDTO = (result: SearchResult<AuthorEntity>): AuthorSearchResultDTO => {
  return {
    id: result.id,
    name: result.data.name,
    surname: result.data.surname,
    nationality: result.data.nationality,
    userId: result.userId,
    creationDate: result.creationDate,
    updateDate: result.updateDate,
    isPinned: result.isPinned,
    relevanceScore: result.relevanceScore,
  };
};
