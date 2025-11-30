import { UserEntity } from '../../repositories/user/UserRepository.types';

export interface UserResponseDTO {
  id: number;
  email: string;
  name?: string | null;
  surname?: string | null;
  fullName?: string;
  isActive: boolean;
  role: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const toUserResponseDTO = (user: UserEntity): UserResponseDTO => {
  const dto: UserResponseDTO = {
    id: user.id,
    email: user.email,
    name: user.name,
    surname: user.surname,
    isActive: Boolean(user.isActive),
    role: user.role,
  };

  if (user.creationDate) {
    dto.createdAt = user.creationDate;
  }

  if (user.updateDate) {
    dto.updatedAt = user.updateDate;
  }

  if (user.name || user.surname) {
    dto.fullName = `${user.name ?? ''} ${user.surname ?? ''}`.trim();
  }

  return dto;
};
