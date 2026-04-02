import { plainToInstance } from 'class-transformer';
import type { BookStatus } from '@/models/interfaces/ModelInterfaces';
import { UpdateBookInput } from '../../services/book/BookService';

export class UpdateBookDTO {
  title?: string;
  isbnCode?: string;
  editionNumber?: number;
  editionDate?: string | null;
  status?: BookStatus;
  notes?: string;
  authorIds?: number[];
  categoryIds?: number[];
  coverImageUrlMedium?: string | null;
  coverImageUrlLarge?: string | null;

  static from(body: unknown): UpdateBookDTO {
    return plainToInstance(UpdateBookDTO, body ?? {});
  }

  toServiceInput(): UpdateBookInput {
    const input: UpdateBookInput = {};

    if (this.title !== undefined) input.title = this.title;
    if (this.isbnCode !== undefined) input.isbnCode = this.isbnCode;
    if (this.editionNumber !== undefined) input.editionNumber = this.editionNumber;
    if (this.editionDate !== undefined) input.editionDate = this.editionDate;
    if (this.status !== undefined) input.status = this.status;
    if (this.notes !== undefined) input.notes = this.notes;
    if (this.authorIds !== undefined) input.authorIds = this.authorIds;
    if (this.categoryIds !== undefined) input.categoryIds = this.categoryIds;
    if (this.coverImageUrlMedium !== undefined) input.coverImageUrlMedium = this.coverImageUrlMedium;
    if (this.coverImageUrlLarge !== undefined) input.coverImageUrlLarge = this.coverImageUrlLarge;

    return input;
  }
}
