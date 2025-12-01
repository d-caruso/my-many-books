// ================================================================
// domain/entities/User.ts
// Domain-level representation of a user (DB-agnostic)
// ================================================================

import { BaseEntity } from './BaseEntity';
import { UserRole } from '@/models/interfaces/ModelInterfaces';

export interface UserEntity extends BaseEntity<number> {
  email: string;
  name: string;
  surname: string;
  isActive: boolean;
  role: UserRole;
  creationDate: Date;
  updateDate?: Date;
}
