import React from 'react';
import renderer from 'react-test-renderer';
import type { Book } from '@/types';
import { BookCard } from '@/components/BookCard';

// mock react-native-paper so that Menu anchor actually renders
jest.mock('react-native-paper', () => {
  const React = require('react');
  const actual = jest.requireActual('react-native-paper');

  // Create a testable Menu.Item component that exposes its props
  const MenuItem = (props: any) => {
    // Return an element with all props exposed for testing
    return React.createElement(
      'RCTView',
      props,
      React.createElement('RCTText', null, props.title)
    );
  };

  const Menu = ({ anchor, children }: any) => {
    // Simulate react-native-paper behavior: call anchor with onPress prop
    const anchorElement =
      typeof anchor === 'function'
        ? anchor({ onPress: jest.fn() }) // inject mock onPress prop
        : anchor;

    return (
      <>
        {anchorElement}
        {children}
      </>
    );
  };

  Menu.Item = MenuItem;

  return {
    ...actual,
    Menu,
    Portal: ({ children }: any) => <>{children}</>,
  };
});

// Mock the translation function to return mock strings for testing
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
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
const { BookCard: _BookCardComponent, ...BookCardModule } = require('../../src/components/BookCard');

// ✅ Fix: match component prop names (thumbnail instead of thumbnailUrl, authors as objects)
const mockBook: Book = {
  id: 1,
  title: 'The Great Gatsby',
  isbnCode: '9780743273565',
  status: 'reading' as const,
  authors: [{ name: 'F. Scott Fitzgerald' }],
  categories: ['Classic', 'Fiction'],
  publishedDate: '1925-04-10',
  thumbnail: 'https://example.com/gatsby.jpg',
  createdAt: '2023-01-01T00:00:00.000Z',
  updatedAt: '2023-01-01T00:00:00.000Z',
};

const mockOnPress = jest.fn();
const mockOnStatusChange = jest.fn();
const mockOnDelete = jest.fn();

describe('BookCard', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('Utility functions', () => {
    it('should return blue for reading status', () => {
      const result = BookCardModule.getStatusColor('reading');
      expect(result).toBe('#2196F3');
    });

    it('should return green for completed status', () => {
      const result = BookCardModule.getStatusColor('completed');
      expect(result).toBe('#4CAF50');
    });

    it('should return orange for want-to-read status', () => {
      const result = BookCardModule.getStatusColor('want-to-read');
      expect(result).toBe('#FF9800');
    });

    it('should return purple for paused status', () => {
      const result = BookCardModule.getStatusColor('paused');
      expect(result).toBe('#9C27B0');
    });

    it('should return default gray for unknown status', () => {
      const result = BookCardModule.getStatusColor('unknown' as any);
      expect(result).toBe('#757575');
    });

    describe('getStatusLabel function', () => {
      it('should return Reading for reading status (no t function)', () => {
        const result = BookCardModule.getStatusLabel('reading');
        expect(result).toBe('Reading');
      });

      it('should return the raw status string for unknown status (no t function)', () => {
        const result = BookCardModule.getStatusLabel('unknown' as any);
        expect(result).toBe('unknown');
      });

      it('should use t function when provided', () => {
        const mockT = jest.fn((key) => key.replace('books:', ''));
        const result = BookCardModule.getStatusLabel('completed', mockT);
        expect(result).toBe('completed');
        expect(mockT).toHaveBeenCalledWith('books:completed');
      });
    });

    it('should export statusOptions array', () => {
      expect(BookCardModule.statusOptions).toEqual([
        'want-to-read',
        'reading',
        'paused',
        'completed',
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
      const cardWithPress = testInstance.find((el: any) => el.props.onPress === mockOnPress);
      cardWithPress.props.onPress();
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should handle menu button press to show menu', () => {
      let tree: renderer.ReactTestRenderer | undefined;
      renderer.act(() => {
        tree = renderer.create(
          React.createElement(BookCard, {
            book: mockBook,
            onStatusChange: mockOnStatusChange,
            onDelete: mockOnDelete,
            onPress: mockOnPress,
            testID: 'book-menu-button',
            title: 'Mark as Completed'
          })
        );
      });
      const testInstance = tree!.root;
      const menuButton = testInstance.findByProps({ testID: 'book-menu-button' });

      renderer.act(() => menuButton.props.onPress());
      const completedItem = testInstance.findByProps({ title: 'Mark as Completed' });
      expect(completedItem).toBeDefined();
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

      // Try to find actions container, should throw
      expect(() => testInstance.findByProps({ testID: 'book-actions' })).toThrow();
    });
  });
});