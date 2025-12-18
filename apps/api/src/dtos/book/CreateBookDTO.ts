import { plainToInstance } from 'class-transformer';
import type { BookStatus } from '@/models/interfaces/ModelInterfaces';
import { CreateBookInput } from '../../services/book/BookService';

export class CreateBookDTO {
  title!: string;
  isbnCode!: string;
  editionNumber?: number;
  editionDate?: string | null;
  status?: BookStatus;
  notes?: string;
  authorIds?: number[];
  categoryIds?: number[];

  static from(body: unknown): CreateBookDTO {
    return plainToInstance(CreateBookDTO, body ?? {});
  }

  toServiceInput(): CreateBookInput {
    const input: CreateBookInput = {
      title: this.title,
      isbnCode: this.isbnCode,
    };

    if (this.editionNumber !== undefined) input.editionNumber = this.editionNumber;
    if (this.editionDate !== undefined) input.editionDate = this.editionDate;
    if (this.status !== undefined) input.status = this.status;
    if (this.notes !== undefined) input.notes = this.notes;
    if (this.authorIds !== undefined) input.authorIds = this.authorIds;
    if (this.categoryIds !== undefined) input.categoryIds = this.categoryIds;

    return input;
  }
}
