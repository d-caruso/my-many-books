import { UserEntity } from '../../repositories/user/UserRepositoryTypes';

export interface UserResponseDTO {
  id: number;
  email: string;
  name: string;
  surname: string;
  isActive: boolean;
  role: string;
  creationDate: Date;
  updateDate: Date;
}

export const toUserResponseDTO = (user: UserEntity): UserResponseDTO => {
  const dto: UserResponseDTO = {
    id: user.id,
    email: user.email,
    name: user.name,
    surname: user.surname,
    isActive: Boolean(user.isActive),
    role: user.role,
    creationDate: user.creationDate,
    updateDate: user.updateDate ?? user.creationDate,
  };

  return dto;
};
