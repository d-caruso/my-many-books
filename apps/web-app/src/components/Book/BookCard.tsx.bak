import React from 'react';
import { Book } from '../../types';

interface BookCardProps {
  book: Book;
  onEdit?: (book: Book) => void;
  onDelete?: (bookId: number) => void;
  onStatusChange?: (bookId: number, status: Book['status']) => void;
  onClick?: (book: Book) => void;
  showActions?: boolean;
  compact?: boolean;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  onEdit,
  onDelete,
  onStatusChange,
  onClick,
  showActions = true,
  compact = false
}) => {
  const formatAuthors = (authors?: any[]) => {
    if (!authors || authors.length === 0) return 'Unknown Author';
    return authors.map(author => 
      typeof author === 'string' ? author : `${author.name} ${author.surname}`
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

  const handleStatusChange = (newStatus: Book['status']) => {
    if (onStatusChange && newStatus) {
      onStatusChange(book.id, newStatus);
    }
  };

  if (compact) {
    return (
      <div 
        className={`bg-surface rounded-lg shadow-sm border border-secondary-200 p-4 hover:shadow-md transition-shadow ${
          onClick ? 'cursor-pointer' : ''
        }`}
        onClick={() => onClick?.(book)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-text-primary truncate" title={book.title}>
              {book.title}
            </h3>
            <p className="text-sm text-text-secondary truncate" title={formatAuthors(book.authors)}>
              {formatAuthors(book.authors)}
            </p>
            {book.status && (
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getStatusColor(book.status)}`}>
                {formatStatus(book.status)}
              </span>
            )}
          </div>
          
          {showActions && (
            <div className="ml-4 flex space-x-2">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(book);
                  }}
                  className="text-text-muted hover:text-primary-500 transition-colors"
                  title="Edit book"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Are you sure you want to delete "${book.title}"?`)) {
                      onDelete(book.id);
                    }
                  }}
                  className="text-text-muted hover:text-semantic-error transition-colors"
                  title="Delete book"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`bg-surface rounded-lg shadow-sm border border-secondary-200 overflow-hidden hover:shadow-md transition-shadow ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={() => onClick?.(book)}
    >
      {/* Book cover placeholder */}
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

        {/* Actions overlay */}
        {showActions && (
          <div className="absolute top-2 left-2 opacity-0 hover:opacity-100 transition-opacity">
            <div className="flex space-x-1">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(book);
                  }}
                  className="bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-75 transition-all"
                  title="Edit book"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Are you sure you want to delete "${book.title}"?`)) {
                      onDelete(book.id);
                    }
                  }}
                  className="bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-red-500 transition-all"
                  title="Delete book"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Book details */}
      <div className="p-3 sm:p-4">
        <h3 className="font-semibold text-text-primary mb-1 line-clamp-2 text-sm sm:text-base leading-tight" title={book.title}>
          {book.title}
        </h3>
        
        <p className="text-text-secondary text-xs sm:text-sm mb-2 line-clamp-1" title={formatAuthors(book.authors)}>
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
          <div className="flex flex-wrap gap-1 mb-3">
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

        {/* Status change dropdown */}
        {onStatusChange && (
          <div className="mb-3">
            <select
              value={book.status || ''}
              onChange={(e) => handleStatusChange(e.target.value as Book['status'])}
              onClick={(e) => e.stopPropagation()}
              className="text-xs border border-secondary-300 rounded px-2 py-2 bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 touch-manipulation w-full min-h-[44px] sm:min-h-[auto] sm:py-1"
            >
              <option value="">No Status</option>
              <option value="in progress">In Progress</option>
              <option value="paused">Paused</option>
              <option value="finished">Finished</option>
            </select>
          </div>
        )}

        {/* Notes preview */}
        {book.notes && (
          <div className="mb-2">
            <p className="text-xs text-text-muted line-clamp-2" title={book.notes}>
              {book.notes}
            </p>
          </div>
        )}

        {/* ISBN */}
        {book.isbnCode && (
          <div className="text-xs text-text-muted font-mono">
            ISBN: {book.isbnCode}
          </div>
        )}
      </div>
    </div>
  );
};