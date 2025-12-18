// ================================================================
// domain/entities/Category.ts
// Domain-level representation of a category (DB-agnostic)
// ================================================================

import { BaseEntity } from './BaseEntity';

export interface CategoryBookSummary {
  id: number;
  title: string;
}

export interface CategoryEntity extends BaseEntity<number> {
  name: string;
  userId: number;
  creationDate: Date;
  updateDate?: Date;
  books?: CategoryBookSummary[];
}
