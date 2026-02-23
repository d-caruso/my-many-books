// ================================================================
// domain/entities/Book.ts
// Domain-level representation of a book (DB-agnostic)
// ================================================================

import { BookStatus } from '@/models/interfaces/ModelInterfaces';
import { BaseEntity } from './BaseEntity';

export interface BookAuthorSummary {
  id: number;
  name: string;
  surname?: string;
}

export interface BookCategorySummary {
  id: number;
  name: string;
}

export interface BookEntity extends BaseEntity<number> {
  isbnCode: string;
  title: string;
  editionNumber?: number;
  editionDate?: string;
  status?: BookStatus;
  notes?: string;
  userId?: number;
  creationDate: Date;
  updateDate?: Date;
  authors?: BookAuthorSummary[];
  categories?: BookCategorySummary[];
}
