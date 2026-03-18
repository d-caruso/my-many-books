import { bookAPI } from '../../src/services/api';
import { mobileHooks, MOBILE_EVENTS } from '../../src/services/hooks/mobileHooks';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('../../src/services/api', () => jest.requireActual('../../src/services/api'));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

jest.mock('../../src/services/authService', () => ({
  authService: {
    getIdToken: jest.fn(),
    silentRefresh: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
  },
}));

jest.mock('../../src/services/OperationQueue', () => ({
  operationQueue: {
    enqueue: jest.fn(),
  },
}));

jest.mock('../../src/services/QueueExecutor', () => ({
  isRetriableError: jest.fn(() => false),
}));

jest.mock('../../src/services/hooks/mobileHooks', () => {
  const actual = jest.requireActual('../../src/services/hooks/eventsSchema');
  return {
    mobileHooks: {
      emit: jest.fn().mockResolvedValue(undefined),
    },
    MOBILE_EVENTS: actual.MOBILE_EVENTS,
  };
});

jest.mock('@my-many-books/shared-api/', () => {
  const books = {
    getBooks: jest.fn(),
    getBook: jest.fn(),
    createBook: jest.fn(),
    updateBook: jest.fn(),
    updateBookStatus: jest.fn(),
    deleteBook: jest.fn(),
    searchBooks: jest.fn(),
    searchByISBN: jest.fn(),
  };

  return {
    __mockBooksApi: books,
    createApiClient: jest.fn(() => ({
      books,
      users: {
        getCurrentUser: jest.fn(),
        updateProfile: jest.fn(),
        deleteAccount: jest.fn(),
      },
      authors: {
        getAuthors: jest.fn(),
        getAuthor: jest.fn(),
        createAuthor: jest.fn(),
        updateAuthor: jest.fn(),
        deleteAuthor: jest.fn(),
      },
      categories: {
        getCategories: jest.fn(),
        getCategory: jest.fn(),
        createCategory: jest.fn(),
        updateCategory: jest.fn(),
        deleteCategory: jest.fn(),
      },
      admin: {
        getAdminStats: jest.fn(),
        getAdminUsers: jest.fn(),
        updateAdminUser: jest.fn(),
        deleteAdminUser: jest.fn(),
        getAdminBooks: jest.fn(),
        updateAdminBook: jest.fn(),
        deleteAdminBook: jest.fn(),
      },
    })),
  };
});

const { __mockBooksApi: mockBooksApi } = jest.requireMock('@my-many-books/shared-api/') as {
  __mockBooksApi: {
    createBook: jest.Mock;
    updateBook: jest.Mock;
    updateBookStatus: jest.Mock;
    deleteBook: jest.Mock;
  };
};

const mockMobileHooks = mobileHooks as jest.Mocked<typeof mobileHooks>;

describe('bookAPI hookey lifecycle emits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('emits create lifecycle events for active book creation', async () => {
    const createdBook = {
      id: 11,
      title: 'Hooked Book',
      status: 'reading',
      updateDate: '2026-03-18T10:00:00.000Z',
    };
    mockBooksApi.createBook.mockResolvedValue(createdBook);

    await expect(
      bookAPI.createBook({
        title: 'Hooked Book',
        status: 'reading',
        isbnCode: '',
        _tempId: 'temp-11',
      } as never)
    ).resolves.toEqual(createdBook);

    const [beforeEvent, beforePayload] = mockMobileHooks.emit.mock.calls[0];
    const [afterEvent, afterPayload] = mockMobileHooks.emit.mock.calls[1];
    const beforeOperation = beforePayload as { operationId: string };

    expect(beforeEvent).toBe(MOBILE_EVENTS.BOOK.CREATE.BEFORE);
    expect(afterEvent).toBe(MOBILE_EVENTS.BOOK.CREATE.AFTER);
    expect(beforePayload).toEqual(
      expect.objectContaining({
        operationId: expect.stringMatching(/^op_\d+_[a-z0-9]+$/),
        resourceType: 'book',
        metadata: expect.objectContaining({
          title: 'Hooked Book',
          status: 'reading',
          tempId: 'temp-11',
        }),
      })
    );
    expect(afterPayload).toEqual(
      expect.objectContaining({
        operationId: beforeOperation.operationId,
        resourceType: 'book',
        result: { book: createdBook },
      })
    );
  });

  it('emits update lifecycle events for active book updates', async () => {
    const updatedBook = {
      id: 15,
      title: 'Updated Title',
      status: 'completed',
      updateDate: '2026-03-18T11:00:00.000Z',
    };
    mockBooksApi.updateBook.mockResolvedValue(updatedBook);

    await expect(
      bookAPI.updateBook('15', { title: 'Updated Title' })
    ).resolves.toEqual(updatedBook);

    expect(mockMobileHooks.emit).toHaveBeenNthCalledWith(
      1,
      MOBILE_EVENTS.BOOK.UPDATE.BEFORE,
      expect.objectContaining({
        resourceType: 'book',
        metadata: expect.objectContaining({
          bookId: '15',
          changes: { title: 'Updated Title' },
        }),
      })
    );
    expect(mockMobileHooks.emit).toHaveBeenNthCalledWith(
      2,
      MOBILE_EVENTS.BOOK.UPDATE.AFTER,
      expect.objectContaining({
        resourceType: 'book',
        result: { book: updatedBook },
      })
    );
  });

  it('emits update failure events for active status updates', async () => {
    const error = new Error('status failed');
    mockBooksApi.updateBookStatus.mockRejectedValue(error);

    await expect(bookAPI.updateBookStatus(44, 'paused' as never)).rejects.toThrow('status failed');

    expect(mockMobileHooks.emit).toHaveBeenNthCalledWith(
      1,
      MOBILE_EVENTS.BOOK.UPDATE.BEFORE,
      expect.objectContaining({
        resourceType: 'book',
        metadata: expect.objectContaining({
          bookId: 44,
          changes: { status: 'paused' },
        }),
      })
    );
    expect(mockMobileHooks.emit).toHaveBeenNthCalledWith(
      2,
      MOBILE_EVENTS.BOOK.UPDATE.FAILURE,
      expect.objectContaining({
        resourceType: 'book',
        error: 'status failed',
      })
    );
  });

  it('emits delete lifecycle events for active book deletion', async () => {
    mockBooksApi.deleteBook.mockResolvedValue(undefined);

    await expect(bookAPI.deleteBook('22')).resolves.toBeUndefined();

    expect(mockMobileHooks.emit).toHaveBeenNthCalledWith(
      1,
      MOBILE_EVENTS.BOOK.DELETE.BEFORE,
      expect.objectContaining({
        resourceType: 'book',
        metadata: { bookId: '22' },
      })
    );
    expect(mockMobileHooks.emit).toHaveBeenNthCalledWith(
      2,
      MOBILE_EVENTS.BOOK.DELETE.AFTER,
      expect.objectContaining({
        resourceType: 'book',
      })
    );
  });
});
