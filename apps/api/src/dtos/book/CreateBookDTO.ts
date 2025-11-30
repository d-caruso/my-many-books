import { plainToInstance } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  validateSync,
} from 'class-validator';
import { BOOK_STATUS } from '@/utils/constants';
import { CreateBookInput } from '../../services/book/BookService';

export class CreateBookDTO {
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 20)
  isbnCode!: string;

  @IsOptional()
  editionNumber?: number;

  @IsOptional()
  @IsDateString()
  editionDate?: string | null;

  @IsOptional()
  @IsEnum(BOOK_STATUS)
  status?: string;

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

  static from(body: unknown): CreateBookDTO {
    return plainToInstance(CreateBookDTO, body ?? {});
  }

  static validate(dto: CreateBookDTO): string[] {
    const validationErrors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });
    return validationErrors.flatMap(error =>
      Object.values(error.constraints || {})
    );
  }

  toServiceInput(): CreateBookInput {
    const input: CreateBookInput = {
      title: this.title,
      isbnCode: this.isbnCode,
    };

    if (this.editionNumber !== undefined) input.editionNumber = this.editionNumber;
    if (this.editionDate !== undefined) input.editionDate = this.editionDate;
    if (this.status !== undefined) input.status = this.status as any;
    if (this.notes !== undefined) input.notes = this.notes;
    if (this.authorIds !== undefined) input.authorIds = this.authorIds;
    if (this.categoryIds !== undefined) input.categoryIds = this.categoryIds;

    return input;
  }
}
