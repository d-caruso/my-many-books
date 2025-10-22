import React, { useState } from 'react';
import { Book, Author, Category } from '../../types';

interface BookDetailsProps {
  book: Book;
  onEdit?: (book: Book) => void;
  onDelete?: (bookId: number) => void;
  onStatusChange?: (bookId: number, status: Book['status']) => void;
  onClose?: () => void;
  loading?: boolean;
}

export const BookDetails: React.FC<BookDetailsProps> = ({
  book,
  onEdit,
  onDelete,
  onStatusChange,
  onClose,
  loading = false
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const formatAuthors = (authors?: Author[]) => {
    if (!authors || authors.length === 0) return 'Unknown Author';
    return authors.map(author => 
      typeof author === 'string' ? author : `${author.name} ${author.surname}`
    ).join(', ');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'finished':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'reading':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-secondary-100 text-text-muted border-secondary-200';
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'reading':
        return 'Reading';
      case 'paused':
        return 'Paused';
      case 'finished':
        return 'Finished';
      default:
        return 'No Status';
    }
  };

  const handleStatusChange = (newStatus: Book['status']) => {
    if (onStatusChange) {
      onStatusChange(book.id, newStatus);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(book.id);
      setShowDeleteConfirm(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="bg-surface rounded-lg shadow-lg border border-secondary-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-primary-50 border-b border-secondary-200 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text-primary">Book Details</h2>
        
        <div className="flex items-center space-x-2">
          {onEdit && (
            <button
              onClick={() => onEdit(book)}
              className="p-2 text-text-muted hover:text-primary-500 transition-colors"
              title="Edit book"
              disabled={loading}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          
          {onDelete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-text-muted hover:text-semantic-error transition-colors"
              title="Delete book"
              disabled={loading}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-secondary transition-colors"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Book Cover */}
          <div className="lg:col-span-1">
            <div className="aspect-[3/4] bg-secondary-100 rounded-lg flex items-center justify-center text-text-muted">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>

          {/* Book Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title and Authors */}
            <div>
              <h1 className="text-2xl font-bold text-text-primary mb-2">{book.title}</h1>
              <p className="text-lg text-text-secondary mb-4">
                by {formatAuthors(book.authors)}
              </p>
              
              {/* Status Badge */}
              {book.status && (
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(book.status)}`}>
                  {formatStatus(book.status)}
                </div>
              )}
            </div>

            {/* Book Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ISBN */}
              <div>
                <h3 className="text-sm font-medium text-text-secondary mb-1">ISBN</h3>
                <p className="text-text-primary font-mono">{book.isbnCode}</p>
              </div>

              {/* Edition */}
              {book.editionNumber && (
                <div>
                  <h3 className="text-sm font-medium text-text-secondary mb-1">Edition</h3>
                  <p className="text-text-primary">{book.editionNumber}</p>
                </div>
              )}

              {/* Edition Date */}
              {book.editionDate && (
                <div>
                  <h3 className="text-sm font-medium text-text-secondary mb-1">Edition Date</h3>
                  <p className="text-text-primary">{formatDate(book.editionDate)}</p>
                </div>
              )}

              {/* Added Date */}
              <div>
                <h3 className="text-sm font-medium text-text-secondary mb-1">Added</h3>
                <p className="text-text-primary">{formatDate(book.creationDate)}</p>
              </div>

              {/* Last Updated */}
              {book.updateDate !== book.creationDate && (
                <div>
                  <h3 className="text-sm font-medium text-text-secondary mb-1">Last Updated</h3>
                  <p className="text-text-primary">{formatDate(book.updateDate)}</p>
                </div>
              )}
            </div>

            {/* Categories */}
            {book.categories && book.categories.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-text-secondary mb-2">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {book.categories.map((category: Category) => (
                    <span
                      key={category.id}
                      className="px-3 py-1 bg-primary-100 text-primary-700 text-sm rounded-full"
                    >
                      {category.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Status Change */}
            {onStatusChange && (
              <div>
                <h3 className="text-sm font-medium text-text-secondary mb-2">Update Reading Status</h3>
                <select
                  value={book.status || ''}
                  onChange={(e) => handleStatusChange(e.target.value as Book['status'])}
                  className="px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background text-text-primary"
                  disabled={loading}
                >
                  <option value="">No Status</option>
                  <option value="reading">Reading</option>
                  <option value="paused">Paused</option>
                  <option value="finished">Finished</option>
                </select>
              </div>
            )}

            {/* Notes */}
            {book.notes && (
              <div>
                <h3 className="text-sm font-medium text-text-secondary mb-2">Notes</h3>
                <div className="bg-secondary-50 rounded-lg p-4">
                  <p className="text-text-primary whitespace-pre-wrap">{book.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg shadow-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-semantic-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-text-primary">Delete Book</h3>
                  <p className="text-text-secondary">Are you sure you want to delete "{book.title}"? This action cannot be undone.</p>
                </div>
              </div>
              
              <div className="flex space-x-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-secondary-300 text-text-secondary rounded-lg hover:bg-secondary-50 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-semantic-error text-white rounded-lg hover:bg-red-600 transition-colors"
                  disabled={loading}
                >
                  {loading ? 'Deleting...' : 'Delete Book'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};