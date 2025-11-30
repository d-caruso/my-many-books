import { plainToInstance } from 'class-transformer';
import { IsOptional, IsString, Length, validateSync } from 'class-validator';
import { UpdateAuthorInput } from '../../services/author/AuthorService';

export class UpdateAuthorDTO {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  surname?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  nationality?: string | null;

  static from(body: unknown): UpdateAuthorDTO {
    return plainToInstance(UpdateAuthorDTO, body ?? {});
  }

  static validate(dto: UpdateAuthorDTO): string[] {
    const validationErrors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });
    return validationErrors.flatMap(error => Object.values(error.constraints || {}));
  }

  toServiceInput(): UpdateAuthorInput {
    const input: UpdateAuthorInput = {};

    if (this.name !== undefined) input.name = this.name;
    if (this.surname !== undefined) input.surname = this.surname;
    if (this.nationality !== undefined) input.nationality = this.nationality;

    return input;
  }
}
