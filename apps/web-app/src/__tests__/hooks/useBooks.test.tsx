import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { ApiProvider } from '../../contexts/ApiContext';
import { useBooks } from '../../hooks/useBooks';
import type { ApiService } from '../../services/api';

const seededBook = {
  id: 1,
  title: 'Seeded Book',
  isbnCode: '9780000000001',
  status: 'reading' as const,
  creationDate: '2024-01-01T00:00:00Z',
  updateDate: '2024-01-01T00:00:00Z',
};

const clearedStatusBook = {
  ...seededBook,
  status: null,
  updateDate: '2024-01-02T00:00:00Z',
};

const mockGetBooks = vi.fn();
const mockCreateBook = vi.fn();
const mockUpdateBook = vi.fn();
const mockDeleteBook = vi.fn();
const mockUpdateBookStatus = vi.fn();

const mockApiService = {
  getBooks: mockGetBooks,
  createBook: mockCreateBook,
  updateBook: mockUpdateBook,
  deleteBook: mockDeleteBook,
  updateBookStatus: mockUpdateBookStatus,
} as unknown as ApiService;

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ApiProvider apiService={mockApiService}>{children}</ApiProvider>
);

describe('useBooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('allows clearing a book status without throwing', async () => {
    mockCreateBook.mockResolvedValue(seededBook);
    mockUpdateBook.mockResolvedValue(clearedStatusBook);

    const { result } = renderHook(() => useBooks({ autoLoad: false }), { wrapper });

    await act(async () => {
      await result.current.createBook({
        title: seededBook.title,
        isbnCode: seededBook.isbnCode,
      });
    });

    await act(async () => {
      await expect(result.current.updateBookStatus(seededBook.id, null)).resolves.toEqual(clearedStatusBook);
    });

    expect(mockUpdateBook).toHaveBeenCalledWith(seededBook.id, { status: null });
    expect(mockUpdateBookStatus).not.toHaveBeenCalled();
    expect(result.current.books).toEqual([clearedStatusBook]);
  });
});
