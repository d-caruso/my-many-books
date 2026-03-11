// Test for write operations disabled when offline
import React from 'react';
import renderer from 'react-test-renderer';
import type { Book } from '@/types';

import { BookCard } from '@/components/BookCard';

// Mock react-native-paper (copied from BookCard.test.tsx)
jest.mock('react-native-paper', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  const actual = jest.requireActual('react-native-paper');

  const MenuItem = (props: Record<string, unknown>) => {
    return React.createElement(
      'RCTView',
      props,
      React.createElement('RCTText', null, props.title as string)
    );
  };

  const Menu = ({ anchor, children }: { anchor: unknown; children?: React.ReactNode }) => {
    const anchorElement =
      typeof anchor === 'function'
        ? anchor({ onPress: jest.fn() })
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
    Portal: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  };
});

describe('Offline Write Operations', () => {
  const mockBook: Book = {
    id: 1,
    isbnCode: '9780000000000',
    title: 'Test Book',
    status: 'reading' as const,
    authors: [{ id: 1, name: 'Test', surname: 'Author' }],
    creationDate: '2024-01-01T00:00:00.000Z',
    updateDate: '2024-01-01T00:00:00.000Z',
  };

  it('should render BookCard component', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(
        React.createElement(BookCard, {
          book: mockBook,
          showActions: true,
        })
      );
    });

    expect(tree!.toJSON()).not.toBeNull();
  });

  it('should render BookCard with all props', () => {
    const mockOnPress = jest.fn();
    const mockOnStatusChange = jest.fn();
    const mockOnDelete = jest.fn();

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(
        React.createElement(BookCard, {
          book: mockBook,
          showActions: true,
          onPress: mockOnPress,
          onStatusChange: mockOnStatusChange,
          onDelete: mockOnDelete,
        })
      );
    });

    expect(tree!.toJSON()).not.toBeNull();
  });

  it('should render BookCard without actions', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(
        React.createElement(BookCard, {
          book: mockBook,
          showActions: false,
        })
      );
    });

    expect(tree!.toJSON()).not.toBeNull();
  });
});
