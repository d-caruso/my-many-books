import { AuthManager, type AuthAPI, type RegisterData, type TokenStorage } from '../AuthManager';
import { BookManager, type BookAPI } from '../BookManager';
import { SearchManager, type SearchAPI } from '../SearchManager';
import type { AuthUser, Book, SearchResult, User } from '@my-many-books/shared-types';

const VALID_ISBN_13_WITH_DASHES = '978-0-451-52493-5';
const VALID_ISBN_13 = '9780451524935';

const createUser = (overrides: Partial<User> = {}): User => ({
  id: 1,
  email: 'user@example.com',
  name: 'Jane',
  surname: 'Doe',
  isActive: true,
  role: 'user',
  creationDate: new Date().toISOString(),
  updateDate: new Date().toISOString(),
  ...overrides,
});

const createBook = (overrides: Partial<Book> = {}): Book => ({
  id: 1,
  isbnCode: VALID_ISBN_13,
  title: '1984',
  status: 'reading',
  creationDate: new Date().toISOString(),
  updateDate: new Date().toISOString(),
  ...overrides,
});

const createSearchResult = (overrides: Partial<SearchResult> = {}): SearchResult => ({
  books: [createBook()],
  total: 1,
  hasMore: false,
  page: 1,
  ...overrides,
});

describe('shared-business manager integration', () => {
  it('supports a basic auth session flow (login → isAuthenticated → getCurrentUser → logout)', async () => {
    let token: string | null = null;

    const tokenStorage: TokenStorage = {
      getToken: () => token,
      setToken: (t: string) => {
        token = t;
      },
      removeToken: () => {
        token = null;
      },
    };

    const authUser: AuthUser = {
      userId: 1,
      email: 'user@example.com',
      provider: 'cognito',
    };

    const api: AuthAPI = {
      login: async (email: string, password: string) => {
        void password;
        return { user: { ...authUser, email }, token: 't1' };
      },
      register: async (userData: RegisterData) => {
        void userData;
        return { user: authUser, token: 't2' };
      },
      logout: async () => {
        throw new Error('Network down');
      },
      refreshToken: async () => ({ token: 't3' }),
      getCurrentUser: async () => createUser(),
    };


    const manager = new AuthManager(api, tokenStorage);

    await manager.login('USER@Example.com', 'Abcdef12');
    await expect(manager.isAuthenticated()).resolves.toBe(true);

    const user = await manager.getCurrentUser();
    expect(user?.email).toBe('user@example.com');

    await expect(manager.logout()).resolves.toBeUndefined();
    await expect(manager.isAuthenticated()).resolves.toBe(false);
    expect(token).toBeNull();
  });

  it('normalizes ISBN consistently between SearchManager and BookManager', async () => {
    const searchApi: jest.Mocked<SearchAPI> = {
      searchBooks: jest.fn().mockResolvedValue(createSearchResult()),
      searchAuthors: jest.fn().mockResolvedValue([]),
      getCategories: jest.fn().mockResolvedValue([]),
    };

    const bookApi: jest.Mocked<BookAPI> = {
      searchByISBN: jest.fn().mockResolvedValue(null),
      createBook: jest.fn().mockResolvedValue(createBook()),
      updateBook: jest.fn(),
      deleteBook: jest.fn(),
      updateBookStatus: jest.fn(),
    };

    const searchManager = new SearchManager(searchApi);
    const bookManager = new BookManager(bookApi);

    await searchManager.searchByISBN(VALID_ISBN_13_WITH_DASHES);
    await bookManager.addBookByISBN(VALID_ISBN_13_WITH_DASHES, { title: '1984' });

    expect(searchApi.searchBooks).toHaveBeenCalledWith(
      expect.objectContaining({ q: VALID_ISBN_13 })
    );
    expect(bookApi.searchByISBN).toHaveBeenCalledWith(VALID_ISBN_13);
    expect(bookApi.createBook).toHaveBeenCalledWith(
      expect.objectContaining({ isbnCode: VALID_ISBN_13 })
    );
  });

  it('refreshes token on 401 and keeps session consistent', async () => {
    let token: string | null = 'expired';

    const tokenStorage: TokenStorage = {
      getToken: () => token,
      setToken: (t: string) => {
        token = t;
      },
      removeToken: () => {
        token = null;
      },
    };

    const api: jest.Mocked<AuthAPI> = {
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn().mockResolvedValue({ token: 'fresh' }),
      getCurrentUser: jest
        .fn()
        .mockRejectedValueOnce({ status: 401 })
        .mockResolvedValueOnce(createUser()),
    };

    const manager = new AuthManager(api, tokenStorage);

    const user = await manager.getCurrentUser();

    expect(user).not.toBeNull();
    expect(api.refreshToken).toHaveBeenCalledTimes(1);
    expect(token).toBe('fresh');
  });
});
