import { plainToInstance } from 'class-transformer';
import { CreateCategoryInput } from '../../services/category/CategoryService';

export class CreateCategoryDTO {
  name!: string;

  static from(body: unknown): CreateCategoryDTO {
    return plainToInstance(CreateCategoryDTO, body ?? {});
  }


  toServiceInput(): CreateCategoryInput {
    return {
      name: this.name,
    };
  }
}
