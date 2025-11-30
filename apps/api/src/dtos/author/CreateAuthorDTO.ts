import { plainToInstance } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Length, validateSync } from 'class-validator';
import { CreateAuthorInput } from '../../services/author/AuthorService';

export class CreateAuthorDTO {
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  surname!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  nationality?: string | null;

  static from(body: unknown): CreateAuthorDTO {
    return plainToInstance(CreateAuthorDTO, body ?? {});
  }

  static validate(dto: CreateAuthorDTO): string[] {
    const validationErrors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });
    return validationErrors.flatMap(error => Object.values(error.constraints || {}));
  }

  toServiceInput(): CreateAuthorInput {
    const input: CreateAuthorInput = {
      name: this.name,
      surname: this.surname,
    };

    if (this.nationality !== undefined) {
      input.nationality = this.nationality;
    }

    return input;
  }
}
