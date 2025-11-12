// ================================================================
// src/models/interfaces/ModelInterfaces.ts
// ================================================================

import { CreationOptional } from 'sequelize';
import { BaseModelAttributes } from '../base/BaseModel';
import { IdBaseModelAttributes } from '../base/IdBaseModel';

// Author interfaces
export interface AuthorAttributes
  extends Omit<IdBaseModelAttributes, 'id' | 'creationDate' | 'updateDate'> {
  id: CreationOptional<number>;
  name: string;
  surname: string;
  nationality?: string | null;
  creationDate: CreationOptional<Date>;
  updateDate?: CreationOptional<Date | undefined>;
}

export interface AuthorCreationAttributes {
  name: string;
  surname: string;
  nationality?: string | null;
  updateDate?: Date | undefined;
}

// Category interfaces
export interface CategoryAttributes
  extends Omit<IdBaseModelAttributes, 'id' | 'creationDate' | 'updateDate'> {
  id: CreationOptional<number>;
  name: string;
  creationDate: CreationOptional<Date>;
  updateDate?: CreationOptional<Date | undefined>;
}

export interface CategoryCreationAttributes {
  name: string;
  updateDate?: Date | undefined;
}

// Book interfaces
export interface BookAttributes
  extends Omit<IdBaseModelAttributes, 'id' | 'creationDate' | 'updateDate'> {
  id: CreationOptional<number>;
  isbnCode: string;
  title: string;
  editionNumber?: number | undefined;
  editionDate?: Date | undefined;
  status?: BookStatus | undefined;
  notes?: string | undefined;
  userId?: number | undefined;
  creationDate: CreationOptional<Date>;
  updateDate?: CreationOptional<Date | undefined>;
}

export interface BookCreationAttributes {
  isbnCode: string;
  title: string;
  editionNumber?: number | undefined;
  editionDate?: Date | undefined;
  status?: BookStatus | undefined;
  notes?: string | undefined;
  userId?: number | undefined;
  updateDate?: Date | undefined;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BookUpdateAttributes
  extends Omit<Partial<BookAttributes>, 'id' | 'creationDate'> {}

// Junction table interfaces
export interface BookAuthorAttributes extends BaseModelAttributes {
  bookId: number;
  authorId: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BookAuthorCreationAttributes
  extends Omit<BookAuthorAttributes, 'creationDate' | 'updateDate'> {}

export interface BookCategoryAttributes extends BaseModelAttributes {
  bookId: number;
  categoryId: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BookCategoryCreationAttributes
  extends Omit<BookCategoryAttributes, 'creationDate' | 'updateDate'> {}

// Enums and types
export type BookStatus = 'reading' | 'paused' | 'finished';

// Response interfaces with associations
export interface BookWithAssociations extends BookAttributes {
  authors?: AuthorAttributes[];
  categories?: CategoryAttributes[];
}

export interface AuthorWithBooks extends AuthorAttributes {
  books?: BookAttributes[];
}

export interface CategoryWithBooks extends CategoryAttributes {
  books?: BookAttributes[];
}

// Database operation interfaces
export interface FindOptions {
  page?: number;
  limit?: number;
  include?: string[];
  where?: Record<string, unknown>;
  order?: Array<[string, 'ASC' | 'DESC']>;
}

export interface CreateBookWithAssociations {
  book: BookCreationAttributes;
  authors?: AuthorCreationAttributes[];
  categories?: CategoryCreationAttributes[];
}

export interface UpdateBookWithAssociations {
  book: BookUpdateAttributes;
  authors?: AuthorCreationAttributes[];
  categories?: CategoryCreationAttributes[];
}

// User interfaces
export type UserRole = 'user' | 'admin';

export interface UserAttributes extends IdBaseModelAttributes {
  email: string;
  name: string;
  surname: string;
  isActive: boolean;
  role: UserRole;
}

export interface UserCreationAttributes {
  email: string;
  name: string;
  surname: string;
  isActive: boolean;
  role?: UserRole;
  updateDate?: Date | undefined;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UserUpdateAttributes
  extends Omit<Partial<UserAttributes>, 'id' | 'creationDate'> {}

// Authentication interface for middleware context
export interface AuthUser {
  userId: number; // Database user ID (primary key)
  email: string; // For logging/debugging
  provider: string; // Auth provider used
  providerUserId?: string; // External auth system ID
  isNewUser?: boolean; // Helpful for onboarding flows
  userModel?: any; // Cached user model from auth middleware to avoid duplicate query
}
