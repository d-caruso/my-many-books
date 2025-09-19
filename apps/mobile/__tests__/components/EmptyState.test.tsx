import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EmptyState } from '@/components/EmptyState';

describe('EmptyState', () => {
  it('should render title and description', () => {
    const { getByText } = render(
      <EmptyState
        icon="book"
        title="No books"
        description="Add your first book to get started"
      />
    );

    expect(getByText('No books')).toBeTruthy();
    expect(getByText('Add your first book to get started')).toBeTruthy();
  });

  it('should render action button when provided', () => {
    const mockOnAction = jest.fn();
    const { getByText } = render(
      <EmptyState
        icon="book"
        title="No books"
        description="Add your first book to get started"
        actionText="Add Book"
        onAction={mockOnAction}
      />
    );

    const actionButton = getByText('Add Book');
    expect(actionButton).toBeTruthy();
    
    fireEvent.press(actionButton);
    expect(mockOnAction).toHaveBeenCalledTimes(1);
  });

  it('should not render action button when not provided', () => {
    const { queryByText } = render(
      <EmptyState
        icon="book"
        title="No books"
        description="Add your first book to get started"
      />
    );

    expect(queryByText('Add Book')).toBeNull();
  });

  it('should handle different icons', () => {
    const { getByText } = render(
      <EmptyState
        icon="magnify"
        title="No search results"
        description="Try a different search term"
      />
    );

    expect(getByText('No search results')).toBeTruthy();
  });

  it('should render without action when actionText provided but no onAction', () => {
    const { queryByText } = render(
      <EmptyState
        icon="book"
        title="No books"
        description="Add your first book to get started"
        actionText="Add Book"
      />
    );

    expect(queryByText('Add Book')).toBeNull();
  });

  it('should render without action when onAction provided but no actionText', () => {
    const mockOnAction = jest.fn();
    const { queryByText } = render(
      <EmptyState
        icon="book"
        title="No books"
        description="Add your first book to get started"
        onAction={mockOnAction}
      />
    );

    // Should not render any button text since actionText is not provided
    expect(queryByText('Add Book')).toBeNull();
  });

  it('should handle long descriptions', () => {
    const longDescription = 'This is a very long description that should wrap properly and display correctly in the empty state component';
    
    const { getByText } = render(
      <EmptyState
        icon="book"
        title="No books"
        description={longDescription}
      />
    );

    expect(getByText(longDescription)).toBeTruthy();
  });

  it('should handle empty strings', () => {
    const { getByText } = render(
      <EmptyState
        icon="book"
        title=""
        description=""
      />
    );

    // Should render empty text nodes
    expect(getByText('')).toBeTruthy();
  });
});