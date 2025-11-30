import { plainToInstance } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  validateSync,
} from 'class-validator';
import { BOOK_STATUS } from '@/utils/constants';
import type { BookStatus } from '@/models/interfaces/ModelInterfaces';
import { UpdateBookInput } from '../../services/book/BookService';

export class UpdateBookDTO {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(10, 20)
  isbnCode?: string;

  @IsOptional()
  editionNumber?: number;

  @IsOptional()
  @IsDateString()
  editionDate?: string | null;

  @IsOptional()
  @IsEnum(BOOK_STATUS)
  status?: BookStatus;

  @IsOptional()
  @IsString()
  @Length(0, 5000)
  notes?: string;

  @IsOptional()
  @IsArray()
  authorIds?: number[];

  @IsOptional()
  @IsArray()
  categoryIds?: number[];

  static from(body: unknown): UpdateBookDTO {
    return plainToInstance(UpdateBookDTO, body ?? {});
  }

  static validate(dto: UpdateBookDTO): string[] {
    const validationErrors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });
    return validationErrors.flatMap(error => Object.values(error.constraints || {}));
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

    return input;
  }
}
