import { UserEntity } from '../../repositories/user/UserRepositoryTypes';

export interface UserResponseDTO {
  id: number;
  email: string;
  name: string;
  surname: string;
  fullName: string;
  isActive: boolean;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export const toUserResponseDTO = (user: UserEntity): UserResponseDTO => {
  const dto: UserResponseDTO = {
    id: user.id,
    email: user.email,
    name: user.name,
    surname: user.surname,
    isActive: Boolean(user.isActive),
    role: user.role,
    createdAt: user.creationDate,
    updatedAt: user.updateDate ?? user.creationDate,
    fullName: `${user.name} ${user.surname}`.trim(),
  };

  return dto;
};
