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

export const getStatusLabel = (status: Book['status']): string => {
  switch (status) {
    case 'want-to-read':
      return 'Want to Read';
    case 'reading':
      return 'Reading';
    case 'completed':
      return 'Completed';
    default:
      return 'Unknown';
  }
};

export const getStatusColor = (status: Book['status']): string => {
  switch (status) {
    case 'want-to-read':
      return '#2196F3'; // Blue
    case 'reading':
      return '#FF9800'; // Orange
    case 'completed':
      return '#4CAF50'; // Green
    default:
      return '#757575'; // Gray
  }
};

export const validateISBN = (isbn: string): boolean => {
  if (!isbn || typeof isbn !== 'string') return false;
  
  // Remove hyphens and spaces
  const cleanISBN = isbn.replace(/[-\s]/g, '');
  
  // Check if it's all digits
  if (!/^\d+$/.test(cleanISBN)) return false;
  
  // Check length (ISBN-10 or ISBN-13)
  if (cleanISBN.length === 10) {
    return validateISBN10(cleanISBN);
  } else if (cleanISBN.length === 13) {
    return validateISBN13(cleanISBN);
  }
  
  return false;
};

const validateISBN10 = (isbn: string): boolean => {
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(isbn[i]) * (10 - i);
  }
  
  const checkDigit = isbn[9];
  const calculatedCheck = (11 - (sum % 11)) % 11;
  const expectedCheck = checkDigit === 'X' ? 10 : parseInt(checkDigit);
  
  return calculatedCheck === expectedCheck;
};

const validateISBN13 = (isbn: string): boolean => {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(isbn[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  
  const checkDigit = parseInt(isbn[12]);
  const calculatedCheck = (10 - (sum % 10)) % 10;
  
  return calculatedCheck === checkDigit;
};

export const truncateText = (text: string, limit: number): string => {
  if (!text || typeof text !== 'string') return '';
  
  if (text.length <= limit) return text;
  
  return text.substring(0, limit) + '...';
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

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
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
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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
