import React from 'react';
import { Book } from '../../types';

interface BookSearchResultsProps {
  books: Book[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  onLoadMore: () => void;
  onBookSelect: (book: Book) => void;
}

export const BookSearchResults: React.FC<BookSearchResultsProps> = ({
  books,
  loading,
  error,
  totalCount,
  hasMore,
  onLoadMore,
  onBookSelect
}) => {
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-600 mb-2">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-red-800 mb-1">Search Error</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!loading && books.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-text-muted mb-4">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-text-primary mb-2">No books found</h3>
        <p className="text-text-secondary">Try adjusting your search terms or filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results header */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-text-secondary">
            Showing {books.length} of {totalCount} book{totalCount !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Book grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {books.map((book) => (
          <BookCard 
            key={book.id} 
            book={book} 
            onClick={() => onBookSelect(book)} 
          />
        ))}
      </div>

      {/* Load more button */}
      {hasMore && (
        <div className="text-center">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:bg-secondary-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Loading...</span>
              </div>
            ) : (
              'Load More Books'
            )}
          </button>
        </div>
      )}

      {/* Loading indicator for initial load */}
      {loading && books.length === 0 && (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">Searching for books...</p>
        </div>
      )}
    </div>
  );
};

interface BookCardProps {
  book: Book;
  onClick: () => void;
}

const BookCard: React.FC<BookCardProps> = ({ book, onClick }) => {
  const formatAuthors = (authors?: any[]) => {
    if (!authors || authors.length === 0) return 'Unknown Author';
    return authors.map(author => 
      typeof author === 'string' ? author : author.name
    ).join(', ');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'finished':
        return 'bg-green-100 text-green-800';
      case 'in progress':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-secondary-100 text-text-muted';
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'in progress':
        return 'In Progress';
      case 'paused':
        return 'Paused';
      case 'finished':
        return 'Finished';
      default:
        return status;
    }
  };

  return (
    <div 
      onClick={onClick}
      className="bg-surface rounded-lg shadow-sm border border-secondary-200 hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
    >
      {/* Book cover */}
      <div className="aspect-[3/4] bg-secondary-100 relative">
        <div className="w-full h-full flex items-center justify-center text-text-muted">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        
        {/* Status badge */}
        {book.status && (
          <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(book.status)}`}>
            {formatStatus(book.status)}
          </div>
        )}
      </div>

      {/* Book details */}
      <div className="p-4">
        <h3 className="font-semibold text-text-primary mb-1 line-clamp-2" title={book.title}>
          {book.title}
        </h3>
        
        <p className="text-text-secondary text-sm mb-2 line-clamp-1" title={formatAuthors(book.authors)}>
          {formatAuthors(book.authors)}
        </p>

        {/* Edition info */}
        <div className="flex items-center justify-between text-xs text-text-muted mb-2">
          {book.editionNumber && (
            <span>Edition {book.editionNumber}</span>
          )}
          {book.editionDate && (
            <span>{new Date(book.editionDate).getFullYear()}</span>
          )}
        </div>

        {/* Categories */}
        {book.categories && book.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {book.categories.slice(0, 2).map((category) => (
              <span 
                key={category.id}
                className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full"
              >
                {category.name}
              </span>
            ))}
            {book.categories.length > 2 && (
              <span className="text-xs text-text-muted">+{book.categories.length - 2} more</span>
            )}
          </div>
        )}

        {/* ISBN */}
        {book.isbnCode && (
          <div className="mt-2 text-xs text-text-muted font-mono">
            ISBN: {book.isbnCode}
          </div>
        )}
      </div>
    </div>
  );
};