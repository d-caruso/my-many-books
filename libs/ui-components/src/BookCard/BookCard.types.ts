/**
 * BookCard component types - platform agnostic
 */

import { Book, BookStatus } from '@my-many-books/shared-types';
export type { BookCardData } from '@my-many-books/shared-utils';

export interface BookCardProps {
  book: Book;
  onEdit?: (book: Book) => void;
  onDelete?: (bookId: number) => void;
  onStatusChange?: (bookId: number, status: BookStatus) => void;
  onPress?: (book: Book) => void;
  showActions?: boolean;
  compact?: boolean;
  testID?: string;
}