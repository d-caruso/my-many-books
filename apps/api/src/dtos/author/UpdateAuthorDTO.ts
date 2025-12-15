import { plainToInstance } from 'class-transformer';
import { UpdateAuthorInput } from '../../services/author/AuthorService';

export class UpdateAuthorDTO {
  name?: string;

  surname?: string;

  nationality?: string | null;

  static from(body: unknown): UpdateAuthorDTO {
    return plainToInstance(UpdateAuthorDTO, body ?? {});
  }


  toServiceInput(): UpdateAuthorInput {
    const input: UpdateAuthorInput = {};

    if (this.name !== undefined) input.name = this.name;
    if (this.surname !== undefined) input.surname = this.surname;
    if (this.nationality !== undefined) input.nationality = this.nationality;

    return input;
  }
}
