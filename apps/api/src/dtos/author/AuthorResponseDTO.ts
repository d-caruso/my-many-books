import { AuthorEntity } from '../../repositories/author/AuthorRepository.types';

export interface AuthorResponseDTO {
  id: number;
  name: string;
  surname: string;
  nationality?: string | null;
  userId: number;
  creationDate?: Date;
  updateDate?: Date;
}

export const toAuthorResponseDTO = (author: AuthorEntity): AuthorResponseDTO => {
  const dto: AuthorResponseDTO = {
    id: author.id,
    name: author.name,
    surname: author.surname,
    userId: author.userId,
  };

  if (author.nationality !== undefined) {
    dto.nationality = author.nationality;
  }
  if (author.creationDate) {
    dto.creationDate = author.creationDate;
  }
  if (author.updateDate) {
    dto.updateDate = author.updateDate;
  }

  return dto;
};
