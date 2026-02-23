import { CategoryEntity } from '../../repositories/category/CategoryRepositoryTypes';

export interface CategoryResponseDTO {
  id: number;
  name: string;
  translationKey?: string | null;
  userId: number;
  creationDate?: Date;
  updateDate?: Date;
  books?: Array<{ id: number; title: string }> | undefined;
}

export const toCategoryResponseDTO = (category: CategoryEntity): CategoryResponseDTO => {
  const dto: CategoryResponseDTO = {
    id: category.id,
    name: category.name,
    translationKey: category.translationKey ?? null,
    userId: category.userId,
  };

  if (category.creationDate) {
    dto.creationDate = category.creationDate;
  }

  if (category.updateDate) {
    dto.updateDate = category.updateDate;
  }

  if (category.books) {
    dto.books = category.books.map(book => ({ id: book.id, title: book.title }));
  }

  return dto;
};
