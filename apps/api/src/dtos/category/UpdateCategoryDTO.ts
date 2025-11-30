import { plainToInstance } from 'class-transformer';
import { IsOptional, IsString, Length, validateSync } from 'class-validator';
import { UpdateCategoryInput } from '../../services/category/CategoryService';

export class UpdateCategoryDTO {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  static from(body: unknown): UpdateCategoryDTO {
    return plainToInstance(UpdateCategoryDTO, body ?? {});
  }

  static validate(dto: UpdateCategoryDTO): string[] {
    const validationErrors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });
    return validationErrors.flatMap(error => Object.values(error.constraints || {}));
  }

  toServiceInput(): UpdateCategoryInput {
    const input: UpdateCategoryInput = {};
    if (this.name !== undefined) {
      input.name = this.name;
    }
    return input;
  }
}
