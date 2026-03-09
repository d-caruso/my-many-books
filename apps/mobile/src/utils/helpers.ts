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

export const sortBooks = (books: Book[], sortBy: 'title' | 'author' | 'date'): Book[] => {
  return [...books].sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'author':
        const authorA = a.authors[0]?.name || 'Unknown';
        const authorB = b.authors[0]?.name || 'Unknown';
        return authorA.localeCompare(authorB);
      case 'date':
        return new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime();
      default:
        return 0;
    }
  });
};

export const filterBooks = (books: Book[], filters: {
  status?: Book['status'];
  category?: string;
  author?: string;
}): Book[] => {
  return books.filter(book => {
    if (filters.status && book.status !== filters.status) {
      return false;
    }

    if (filters.category && !book.categories.some(cat => cat.name === filters.category)) {
      return false;
    }

    if (filters.author && !book.authors.some(author =>
      author.name.toLowerCase().includes(filters.author!.toLowerCase())
    )) {
      return false;
    }

    return true;
  });
};

export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

