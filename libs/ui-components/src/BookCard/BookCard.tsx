/**
 * Platform-agnostic BookCard component
 * Contains business logic and data formatting.
 * Platform-specific rendering should be implemented separately.
 */

import React from 'react';
import { BookCardProps } from './BookCard.types';
import { formatBookCardData, getStatusColor, getStatusLabel, truncateText } from './BookCard.logic';

export const BookCard: React.FC<BookCardProps> = ({
  book,
  onEdit,
  onDelete,
  onStatusChange,
  onPress,
  showActions = true,
  compact = false,
  testID,
}) => {
  const cardData = formatBookCardData(book);

  const handleEdit = () => onEdit?.(book);
  const handleDelete = () => onDelete?.(book.id);
  const handleStatusChange = (newStatus: typeof book.status) => {
    if (newStatus) {
      onStatusChange?.(book.id, newStatus);
    }
  };
  const handlePress = () => onPress?.(book);

  // This is a base implementation that provides the structure.
  // Platform-specific implementations should override the rendering.
  const cardContent = {
    title: compact ? truncateText(cardData.title, 30) : cardData.title,
    authors: compact ? truncateText(cardData.authors, 25) : cardData.authors,
    status: cardData.status ? {
      label: getStatusLabel(cardData.status),
      color: getStatusColor(cardData.status),
    } : undefined,
    categories: cardData.categories.slice(0, compact ? 1 : 2),
    isbn: cardData.isbn,
    editionInfo: cardData.editionInfo,
    actions: showActions ? {
      onEdit: handleEdit,
      onDelete: handleDelete,
      onStatusChange: handleStatusChange,
    } : undefined,
    onPress: handlePress,
    testID,
  };

  // Base implementation - platform-specific components should override this
  return React.createElement(
    'div',
    {
      'data-testid': testID,
      onClick: handlePress,
      style: {
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: 16,
        backgroundColor: '#ffffff',
        cursor: 'pointer',
      },
    },
    React.createElement('h3', { style: { margin: 0, marginBottom: 8 } }, cardContent.title),
    React.createElement('p', { style: { margin: 0, color: '#6b7280' } }, cardContent.authors),
    cardContent.status && React.createElement(
      'span',
      { 
        style: { 
          display: 'inline-block',
          padding: '4px 8px',
          borderRadius: 4,
          backgroundColor: cardContent.status.color,
          color: 'white',
          fontSize: 12,
          marginTop: 8,
        }
      },
      cardContent.status.label
    )
  );
};

// Export the business logic for platform-specific implementations
export { formatBookCardData, getStatusColor, getStatusLabel, truncateText } from './BookCard.logic';
export type { BookCardProps, BookCardData } from './BookCard.types';