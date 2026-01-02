import { setupServer } from 'msw/node';
import { handlers, API_BASE_URL } from './mswHandlers';
import { UnwrappingFetchHttpClient } from './UnwrappingFetchHttpClient';
import { AuthorApi } from '../../author-api';
import { BookApi } from '../../book-api';
import { CategoryApi } from '../../category-api';
import { SettingsApi } from '../../settings-api';
import { UserApi } from '../../user-api';

const server = setupServer(...handlers);

describe('shared-api contract tests (MSW)', () => {
  const httpClient = new UnwrappingFetchHttpClient();

  const bookApi = new BookApi(httpClient, { baseURL: API_BASE_URL });
  const authorApi = new AuthorApi(httpClient, { baseURL: API_BASE_URL });
  const categoryApi = new CategoryApi(httpClient, { baseURL: API_BASE_URL });
  const settingsApi = new SettingsApi(httpClient, { baseURL: API_BASE_URL });
  const userApi = new UserApi(httpClient, { baseURL: API_BASE_URL });

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it('parses paginated books from API success envelope', async () => {
    const result = await bookApi.getBooks();
    expect(result.books?.[0]?.isbnCode).toBe('978-0-123-45678-9');
  });

  it('parses authors list from API success envelope', async () => {
    const result = await authorApi.getAuthors();
    expect(result).toHaveLength(1);
    expect(result[0]?.surname).toBe('Doe');
  });

  it('parses categories list from API success envelope', async () => {
    const result = await categoryApi.getCategories();
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Fiction');
  });

  it('parses settings list and converts date fields', async () => {
    const result = await settingsApi.getSettings();
    expect(result).toHaveLength(1);
    expect(result[0]?.key).toBe('ui.theme');
    expect(result[0]?.creationDate).toBeInstanceOf(Date);
    expect(result[0]?.lastSyncedAt).toBeInstanceOf(Date);
  });

  it('parses user profile from API success envelope', async () => {
    const result = await userApi.getCurrentUser();
    expect(result.email).toBe('user@example.com');
    expect(result.fullName).toBe('Jane Doe');
  });
});

