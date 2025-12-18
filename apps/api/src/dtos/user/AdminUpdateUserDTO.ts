import { plainToInstance } from 'class-transformer';
import { UpdateUserInput } from '../../services/user/AdminUserService';
import { UserRole } from '../../models/interfaces/ModelInterfaces';

export class AdminUpdateUserDTO {
  name?: string;

  surname?: string;

  email?: string;

  isActive?: boolean;

  role?: UserRole;

  static from(body: unknown): AdminUpdateUserDTO {
    return plainToInstance(AdminUpdateUserDTO, body ?? {});
  }


  toServiceInput(): UpdateUserInput {
    const input: UpdateUserInput = {};
    if (this.name !== undefined) input.name = this.name;
    if (this.surname !== undefined) input.surname = this.surname;
    if (this.email !== undefined) input.email = this.email;
    if (this.isActive !== undefined) input.isActive = this.isActive;
    if (this.role !== undefined) input.role = this.role;
    return input;
  }
}
