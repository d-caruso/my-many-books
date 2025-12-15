import { plainToInstance } from 'class-transformer';
import { CreateAuthorInput } from '../../services/author/AuthorService';

export class CreateAuthorDTO {
  name!: string;

  surname!: string;

  nationality?: string | null;

  static from(body: unknown): CreateAuthorDTO {
    return plainToInstance(CreateAuthorDTO, body ?? {});
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
