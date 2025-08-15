/**
 * BookCard component types - platform agnostic
 */

import { Book, BookStatus } from '@my-many-books/shared-types';

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

export interface BookCardData {
  id: number;
  title: string;
  authors: string;
  status?: BookStatus;
  categories: string[];
  isbn?: string;
  editionInfo?: string;
}