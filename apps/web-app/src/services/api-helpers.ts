import { BookFormData as WebBookFormData } from '../components/Book/BookForm';
import type { BookFormData as SharedBookFormData, UserProfile, User } from '@my-many-books/shared-types';

export type CreateBookInput = WebBookFormData | SharedBookFormData;
export type UpdateBookInput = Partial<WebBookFormData> | Partial<SharedBookFormData>;

export const isDevelopmentWithoutApiConfig = (): boolean =>
  import.meta.env.MODE === 'development' &&
  !(import.meta.env.VITE_API_ORIGIN || import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL);

export const extractAuthorIds = (data: CreateBookInput | UpdateBookInput): number[] | undefined => {
  if ('selectedAuthors' in data && Array.isArray(data.selectedAuthors)) {
    return data.selectedAuthors.map(author => author.id);
  }
  if ('authorIds' in data && Array.isArray(data.authorIds)) {
    return data.authorIds;
  }
  return undefined;
};

export const extractCategoryIds = (data: CreateBookInput | UpdateBookInput): number[] | undefined => {
  if ('selectedCategories' in data && Array.isArray(data.selectedCategories)) {
    return data.selectedCategories;
  }
  if ('categoryIds' in data && Array.isArray(data.categoryIds)) {
    return data.categoryIds;
  }
  return undefined;
};

export const sanitizeString = (value?: string | null): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const mapUserProfileToUser = (profile: UserProfile): User => ({
  id: profile.id,
  email: profile.email,
  name: profile.name,
  surname: profile.surname,
  isActive: profile.isActive,
  role: profile.role,
  creationDate: profile.createdAt,
  updateDate: profile.updatedAt,
});
