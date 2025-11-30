import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  validateSync,
} from 'class-validator';
import { UpdateUserInput } from '../../services/user/AdminUserService';
import { USER_ROLES } from '@my-many-books/shared-auth';

export class AdminUpdateUserDTO {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  surname?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(Object.values(USER_ROLES))
  role?: string;

  static from(body: unknown): AdminUpdateUserDTO {
    return plainToInstance(AdminUpdateUserDTO, body ?? {});
  }

  static validate(dto: AdminUpdateUserDTO): string[] {
    const validationErrors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: true });
    return validationErrors.flatMap(error => Object.values(error.constraints || {}));
  }

  toServiceInput(): UpdateUserInput {
    const input: UpdateUserInput = {};
    if (this.name !== undefined) input.name = this.name;
    if (this.surname !== undefined) input.surname = this.surname;
    if (this.email !== undefined) input.email = this.email;
    if (this.isActive !== undefined) input.isActive = this.isActive;
    if (this.role !== undefined) input.role = this.role as any;
    return input;
  }
}
