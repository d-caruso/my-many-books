import { Book } from '@/types';

export const formatDate = (dateString: string): string => {
  try {
    if (!dateString) return 'Invalid Date';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Invalid Date';
  }
};


export const generateBookId = (): string => {
  return `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const sanitizeSearchQuery = (query: string): string => {
  if (!query || typeof query !== 'string') return '';
  
  return query
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, '')
    .replace(/\s+/g, ' ');
};

export const groupBooksByStatus = (books: Book[]): Record<Book['status'], Book[]> => {
  return books.reduce((acc, book) => {
    if (!acc[book.status]) {
      acc[book.status] = [];
    }
    acc[book.status].push(book);
    return acc;
  }, {} as Record<Book['status'], Book[]>);
};

export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
