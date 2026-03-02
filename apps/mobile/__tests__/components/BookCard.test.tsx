import React from 'react';
import renderer from 'react-test-renderer';
import type { Book } from '@/types';
import { BookCard } from '@/components/BookCard';
import { BOOK_STATUS } from '@my-many-books/shared-types';

// Mock the translation function to return mock strings for testing
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key.includes('books:mark_as_status') && options?.status) {
        return `Mark as ${options.status}`;
      }

      const translations: Record<string, string> = {
        'books:reading': 'Reading',
        'books:completed': 'Completed',
        'books:want_to-read': 'Want to Read',
        'books:paused': 'Paused',
        'delete': 'Delete Book',
      };
      return translations[key] || key;
    },
  }),
}));

// Keep destructure for util coverage
const { BookCard: _BookCardComponent, ...BookCardModule } = jest.requireActual('../../src/components/BookCard');

// ✅ Fix: match component prop names (thumbnail instead of thumbnailUrl, authors as objects)
const mockBook: Book = {
  id: 1,
  title: 'The Great Gatsby',
  isbnCode: '9780743273565',
  status: BOOK_STATUS.READING,
  authors: [{ id: 1, name: 'F. Scott', surname: 'Fitzgerald' }],
  categories: [{ id: 1, name: 'Classic' }, { id: 2, name: 'Fiction' }],
  creationDate: '2023-01-01T00:00:00.000Z',
  updateDate: '2023-01-01T00:00:00.000Z',
};

const mockOnPress = jest.fn();
const mockOnStatusChange = jest.fn();
const mockOnDelete = jest.fn();

describe('BookCard', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('Utility functions', () => {
    it('should return blue for reading status', () => {
      const result = BookCardModule.getStatusColor(BOOK_STATUS.READING);
      expect(result).toBe('#2196F3');
    });

    it('should return green for finished status', () => {
      const result = BookCardModule.getStatusColor(BOOK_STATUS.FINISHED);
      expect(result).toBe('#4CAF50');
    });

    it('should return default gray for unknown status', () => {
      const result = BookCardModule.getStatusColor('want-to-read' as 'reading' | 'finished' | 'paused');
      expect(result).toBe('#757575');
    });

    it('should return purple for paused status', () => {
      const result = BookCardModule.getStatusColor(BOOK_STATUS.PAUSED);
      expect(result).toBe('#9C27B0');
    });

    it('should return default gray for truly unknown status', () => {
      const result = BookCardModule.getStatusColor('unknown' as 'reading' | 'finished' | 'paused');
      expect(result).toBe('#757575');
    });

    describe('getStatusLabel function', () => {
      it('should return Reading for reading status (no t function)', () => {
        const result = BookCardModule.getStatusLabel(BOOK_STATUS.READING);
        expect(result).toBe(BOOK_STATUS.READING);
      });

      it('should return the raw status string for unknown status (no t function)', () => {
        const result = BookCardModule.getStatusLabel('unknown' as 'reading' | 'finished' | 'paused');
        expect(result).toBe('unknown');
      });

      it('should use t function when provided', () => {
        const mockT = jest.fn((key) => key.replace('books:', ''));
        const result = BookCardModule.getStatusLabel(BOOK_STATUS.FINISHED, mockT);
        expect(result).toBe('completed');
        expect(mockT).toHaveBeenCalledWith('books:completed');
      });
    });

    it('should export statusOptions array', () => {
      expect(BookCardModule.statusOptions).toEqual([
        BOOK_STATUS.READING,
        BOOK_STATUS.PAUSED,
        BOOK_STATUS.FINISHED,
      ]);
    });
  });

  describe('BookCard component', () => {
    it('should render BookCard component successfully', () => {
      let tree: renderer.ReactTestRenderer | undefined;
      renderer.act(() => {
        tree = renderer.create(
          React.createElement(BookCard, {
            book: mockBook,
            onPress: mockOnPress,
            onStatusChange: mockOnStatusChange,
            onDelete: mockOnDelete,
          })
        );
      });

      expect(tree).toBeDefined();
      const testInstance = tree!.root;
      expect(testInstance.findByProps({ children: 'The Great Gatsby' })).toBeDefined();
    });

    it('should handle card press event', () => {
      let tree: renderer.ReactTestRenderer | undefined;
      renderer.act(() => {
        tree = renderer.create(
          React.createElement(BookCard, {
            book: mockBook,
            onPress: mockOnPress,
            onStatusChange: mockOnStatusChange,
            onDelete: mockOnDelete,
          })
        );
      });
      const testInstance = tree!.root;
      const cardWithPress = testInstance.find((el: { props?: { onPress?: () => void } }) => el.props?.onPress === mockOnPress);
      cardWithPress.props.onPress();
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should render actions menu when actions are enabled', () => {
      let tree: renderer.ReactTestRenderer | undefined;
      renderer.act(() => {
        tree = renderer.create(
          React.createElement(BookCard, {
            book: mockBook,
            onStatusChange: mockOnStatusChange,
            onDelete: mockOnDelete,
            onPress: mockOnPress,
            showActions: true,
          })
        );
      });
      const testInstance = tree!.root;
      const actionsContainer = testInstance.findByProps({ 'data-testid': 'book-actions' });
      expect(actionsContainer).toBeDefined();
    });

    it('should not render menu button when showActions is false', () => {
      let tree: renderer.ReactTestRenderer | undefined;
      renderer.act(() => {
        tree = renderer.create(
          React.createElement(BookCard, {
            book: mockBook,
            showActions: false,
          })
        );
      });
      const testInstance = tree!.root;
      expect(() => testInstance.findByProps({ 'data-testid': 'book-actions' })).toThrow();
    });
  });
});
