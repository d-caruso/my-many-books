import { plainToInstance } from 'class-transformer';
import { IsNotEmpty, IsString, Length, validateSync } from 'class-validator';
import { CreateCategoryInput } from '../../services/category/CategoryService';

export class CreateCategoryDTO {
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  name!: string;

  static from(body: unknown): CreateCategoryDTO {
    return plainToInstance(CreateCategoryDTO, body ?? {});
  }

  static validate(dto: CreateCategoryDTO): string[] {
    const validationErrors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });
    return validationErrors.flatMap(error => Object.values(error.constraints || {}));
  }

  toServiceInput(): CreateCategoryInput {
    return {
      name: this.name,
    };
  }
}
