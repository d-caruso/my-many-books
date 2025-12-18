import { plainToInstance } from 'class-transformer';
import { UpdateUserProfileInput } from '../../services/user/UserService';

export class UpdateUserDTO {
  name!: string;
  surname!: string;

  static from(body: unknown): UpdateUserDTO {
    return plainToInstance(UpdateUserDTO, body ?? {});
  }

  toServiceInput(): UpdateUserProfileInput {
    return {
      name: this.name,
      surname: this.surname,
    };
  }
}
