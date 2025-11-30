import { BookEntity } from '../../repositories/book/BookRepository.types';

export interface BookResponseDTO {
  id?: number;
  title: string;
  isbnCode: string;
  editionNumber?: number;
  editionDate?: Date | null;
  status?: string;
  notes?: string;
  userId?: number;
  authors?: Array<{ id: number; name: string; surname?: string }>;
  categories?: Array<{ id: number; name: string }>;
}

export const toBookResponseDTO = (book: BookEntity): BookResponseDTO => {
  const dto: BookResponseDTO = {
    id: book.id,
    title: book.title,
    isbnCode: book.isbnCode,
  };

  if (book.editionNumber !== undefined) dto.editionNumber = book.editionNumber;
  dto.editionDate = book.editionDate ?? null;
  if (book.status !== undefined) dto.status = book.status;
  if (book.notes !== undefined) dto.notes = book.notes;
  if (book.userId !== undefined) dto.userId = book.userId;
  if (book.authors) dto.authors = book.authors;
  if (book.categories) dto.categories = book.categories;

  return dto;
};
