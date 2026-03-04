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

  it('parses login response from auth success envelope', async () => {
    const result = await httpClient.post<{ accessToken: string; idToken: string; user: { email: string } }>(
      `${API_BASE_URL}/auth/login`,
      { email: 'user@example.com', password: 'password' }
    );
    expect(result.accessToken).toBe('access-token-123');
    expect(result.user.email).toBe('user@example.com');
  });

  it('parses register response from auth success envelope', async () => {
    const result = await httpClient.post<{ requiresVerification: boolean }>(
      `${API_BASE_URL}/auth/register`,
      { email: 'user@example.com', password: 'pw', name: 'Jane', surname: 'Doe' }
    );
    expect(result.requiresVerification).toBe(true);
  });

  it('parses refresh response from auth success envelope', async () => {
    const result = await httpClient.post<{ accessToken: string; idToken: string; expiresIn: number }>(
      `${API_BASE_URL}/auth/refresh`
    );
    expect(typeof result.accessToken).toBe('string');
    expect(typeof result.expiresIn).toBe('number');
  });

  it('parses logout response from auth success envelope', async () => {
    const result = await httpClient.post<null>(`${API_BASE_URL}/auth/logout`);
    expect(result).toBeNull();
  });

  it('parses health response from success envelope', async () => {
    const result = await httpClient.get<{ status: string; version: string }>(`${API_BASE_URL}/health`);
    expect(result.status).toBe('healthy');
    expect(typeof result.version).toBe('string');
  });

  it('parses Google OAuth start (mobile) response from success envelope', async () => {
    const result = await httpClient.get<{ authorizeUrl: string; state: string }>(
      `${API_BASE_URL}/auth/google/start`,
      { params: { platform: 'mobile', redirectUri: 'myapp://auth', codeChallenge: 'abc' } }
    );
    expect(typeof result.authorizeUrl).toBe('string');
    expect(typeof result.state).toBe('string');
  });

  it('parses Google mobile/start response from success envelope', async () => {
    const result = await httpClient.post<{ authorizeUrl: string; state: string }>(
      `${API_BASE_URL}/auth/google/mobile/start`,
      { redirectUri: 'myapp://auth', codeVerifier: 'verifier' }
    );
    expect(typeof result.authorizeUrl).toBe('string');
    expect(typeof result.state).toBe('string');
  });

  it('parses Google mobile/exchange response from auth success envelope', async () => {
    const result = await httpClient.post<{ accessToken: string; user: { email: string } }>(
      `${API_BASE_URL}/auth/google/mobile/exchange`,
      { code: 'code', state: 'state', redirectUri: 'myapp://auth', codeVerifier: 'verifier' }
    );
    expect(typeof result.accessToken).toBe('string');
    expect(result.user.email).toBe('user@example.com');
  });
});

