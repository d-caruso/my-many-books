import { plainToInstance } from 'class-transformer';
import { IsNotEmpty, IsString, Length, validateSync } from 'class-validator';
import { UpdateUserProfileInput } from '../../services/user/UserService';

export class UpdateUserDTO {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  surname!: string;

  static from(body: unknown): UpdateUserDTO {
    return plainToInstance(UpdateUserDTO, body ?? {});
  }

  static validate(dto: UpdateUserDTO): string[] {
    const validationErrors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });
    return validationErrors.flatMap(error => Object.values(error.constraints || {}));
  }

  toServiceInput(): UpdateUserProfileInput {
    return {
      name: this.name,
      surname: this.surname,
    };
  }
}
