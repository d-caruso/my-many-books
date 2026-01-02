import { UserEntity } from '../../repositories/user/UserRepositoryTypes';

export interface UserResponseDTO {
  id: number;
  email: string;
  name: string;
  surname: string;
<<<<<<< Updated upstream
  isActive: boolean;
  role: string;
  creationDate: Date;
  updateDate: Date;
=======
  fullName: string;
  isActive: boolean;
  role: string;
  createdAt: Date;
  updatedAt: Date;
>>>>>>> Stashed changes
}

export const toUserResponseDTO = (user: UserEntity): UserResponseDTO => {
  const dto: UserResponseDTO = {
    id: user.id,
    email: user.email,
    name: user.name,
    surname: user.surname,
    isActive: Boolean(user.isActive),
    role: user.role,
<<<<<<< Updated upstream
    creationDate: user.creationDate,
    updateDate: user.updateDate ?? user.creationDate,
=======
    createdAt: user.creationDate,
    updatedAt: user.updateDate ?? user.creationDate,
    fullName: `${user.name} ${user.surname}`.trim(),
>>>>>>> Stashed changes
  };

  return dto;
};
