import { plainToInstance } from 'class-transformer';
import { UpdateCategoryInput } from '../../services/category/CategoryService';

export class UpdateCategoryDTO {
  name?: string;

  static from(body: unknown): UpdateCategoryDTO {
    return plainToInstance(UpdateCategoryDTO, body ?? {});
  }


  toServiceInput(): UpdateCategoryInput {
    const input: UpdateCategoryInput = {};
    if (this.name !== undefined) {
      input.name = this.name;
    }
    return input;
  }
}
