import { http, HttpResponse } from 'msw';
import { z } from 'zod';
import {
  AppSettingsArraySchema,
  AuthorSchema,
  BookSchema,
  CategorySchema,
  UserProfileSchema,
  createPaginatedResponseSchema,
  LoginResponseSchema,
  RegisterResponseSchema,
  RefreshResponseSchema,
  GoogleOAuthUrlSchema,
  HealthResponseSchema,
} from '@my-many-books/shared-types';
import { expect } from '@jest/globals';

export const API_BASE_URL = 'http://localhost';

const successResponseSchema = <S extends z.ZodTypeAny>(schema: S) =>
  z.object({
    success: z.literal(true),
    data: schema,
    message: z.string().optional(),
  });

const PaginatedBooksSchema = createPaginatedResponseSchema(BookSchema);

const iso = (value: string) => new Date(value).toISOString();

const book = BookSchema.parse({
  id: 1,
  title: 'Contract Book',
  isbnCode: '978-0-123-45678-9',
  status: 'reading',
  notes: 'Contract note',
  userId: 1,
  authors: [{ id: 1, name: 'Ada', surname: 'Lovelace' }],
  categories: [{ id: 1, name: 'Tech' }],
  creationDate: iso('2024-01-01T00:00:00.000Z'),
  updateDate: iso('2024-01-02T00:00:00.000Z'),
});

const booksData = PaginatedBooksSchema.parse({
  books: [book],
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 1,
    itemsPerPage: 10,
  },
});

const booksResponse = successResponseSchema(PaginatedBooksSchema).parse({
  success: true,
  data: booksData,
});

const authorsData = AuthorSchema.array().parse([
  {
    id: 1,
    name: 'John',
    surname: 'Doe',
    nationality: null,
    userId: 1,
    creationDate: iso('2024-01-01T00:00:00.000Z'),
    updateDate: iso('2024-01-02T00:00:00.000Z'),
  },
]);

const authorsResponse = successResponseSchema(AuthorSchema.array()).parse({
  success: true,
  data: authorsData,
});

const categoriesData = CategorySchema.array().parse([
  {
    id: 1,
    name: 'Fiction',
    userId: 1,
    creationDate: iso('2024-01-01T00:00:00.000Z'),
    updateDate: iso('2024-01-02T00:00:00.000Z'),
    books: [{ id: 10, title: 'Contract Book' }],
  },
]);

const categoriesResponse = successResponseSchema(CategorySchema.array()).parse({
  success: true,
  data: categoriesData,
});

const settingsData = AppSettingsArraySchema.parse([
  {
    key: 'ui.theme',
    value: '"dark"',
    category: 'ui',
    type: 'string',
    defaultValue: '"light"',
    description: 'Theme preference',
    active: true,
    deleted: false,
    lastSyncedAt: iso('2024-01-02T00:00:00.000Z'),
    creationDate: iso('2024-01-01T00:00:00.000Z'),
    updateDate: iso('2024-01-03T00:00:00.000Z'),
  },
]);

const settingsResponse = successResponseSchema(AppSettingsArraySchema).parse({
  success: true,
  data: settingsData,
});

const userProfileData = UserProfileSchema.parse({
  id: 1,
  email: 'user@example.com',
  name: 'Jane',
  surname: 'Doe',
  fullName: 'Jane Doe',
  isActive: true,
  role: 'user',
  createdAt: iso('2024-01-01T00:00:00.000Z'),
  updatedAt: iso('2024-01-02T00:00:00.000Z'),
});

const userProfileResponse = successResponseSchema(UserProfileSchema).parse({
  success: true,
  data: userProfileData,
});

const loginResponse = successResponseSchema(LoginResponseSchema).parse({
  success: true,
  data: {
    accessToken: 'access-token-123',
    idToken: 'id-token-456',
    expiresIn: 3600,
    user: {
      id: 1,
      email: 'user@example.com',
      name: 'Jane',
      surname: 'Doe',
      role: 'user',
      isActive: true,
    },
  },
});

const registerResponse = successResponseSchema(RegisterResponseSchema).parse({
  success: true,
  data: { requiresVerification: true },
  message: 'Registration successful. Please verify your email.',
});

const refreshResponse = successResponseSchema(RefreshResponseSchema).parse({
  success: true,
  data: {
    accessToken: 'new-access-token',
    idToken: 'new-id-token',
    expiresIn: 3600,
  },
});

const logoutResponse = { success: true as const, data: null, message: 'Logout successful' };

const healthResponse = successResponseSchema(HealthResponseSchema).parse({
  success: true,
  data: {
    status: 'healthy',
    timestamp: iso('2024-01-01T00:00:00.000Z'),
    version: '1.0.0',
    environment: 'test',
  },
});

const googleStartMobileResponse = successResponseSchema(GoogleOAuthUrlSchema).parse({
  success: true,
  data: { authorizeUrl: 'https://accounts.google.com/o/oauth2/auth?client_id=test', state: 'random-state' },
});

const googleMobileExchangeResponse = successResponseSchema(LoginResponseSchema).parse({
  success: true,
  data: {
    accessToken: 'access-token-123',
    idToken: 'id-token-456',
    expiresIn: 3600,
    user: {
      id: 1,
      email: 'user@example.com',
      name: 'Jane',
      surname: 'Doe',
      role: 'user',
      isActive: true,
    },
  },
});

export const contractFixtures = {
  booksResponse,
  authorsResponse,
  categoriesResponse,
  settingsResponse,
  userProfileResponse,
  loginResponse,
  registerResponse,
  refreshResponse,
  logoutResponse,
  healthResponse,
  googleStartMobileResponse,
  googleMobileExchangeResponse,
};

export const handlers = [
  http.get(`${API_BASE_URL}/books`, ({ request }) => {
    const url = new URL(request.url);
    expect(url.searchParams.get('includeAuthors')).toBe('true');
    expect(url.searchParams.get('includeCategories')).toBe('true');
    return HttpResponse.json(booksResponse);
  }),

  http.get(`${API_BASE_URL}/authors`, () => HttpResponse.json(authorsResponse)),

  http.get(`${API_BASE_URL}/categories`, () => HttpResponse.json(categoriesResponse)),

  http.get(`${API_BASE_URL}/settings`, () => HttpResponse.json(settingsResponse)),

  http.get(`${API_BASE_URL}/settings/admin`, () => HttpResponse.json(settingsResponse)),

  http.patch(`${API_BASE_URL}/settings/admin/:key`, async ({ request, params }) => {
    const body = (await request.json()) as { value?: unknown };
    if (!('value' in body)) {
      return HttpResponse.json({ error: 'Missing value' }, { status: 400 });
    }

    const updated = settingsData.map((s) =>
      s.key === params['key'] ? { ...s, value: JSON.stringify(body.value) } : s
    );

    const updatedSetting = updated.find((s) => s.key === params['key']);
    if (!updatedSetting) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const response = successResponseSchema(AppSettingsArraySchema.element).parse({
      success: true,
      data: updatedSetting,
    });

    return HttpResponse.json(response);
  }),

  http.patch(`${API_BASE_URL}/settings/admin/:key/toggle`, async ({ request, params }) => {
    const body = (await request.json()) as { active?: unknown };
    if (typeof body.active !== 'boolean') {
      return HttpResponse.json({ error: 'Invalid active' }, { status: 400 });
    }

    const updatedSetting = settingsData.find((s) => s.key === params['key']);
    if (!updatedSetting) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const response = successResponseSchema(AppSettingsArraySchema.element).parse({
      success: true,
      data: { ...updatedSetting, active: body.active },
    });

    return HttpResponse.json(response);
  }),

  http.get(`${API_BASE_URL}/users`, () => HttpResponse.json(userProfileResponse)),

  http.put(`${API_BASE_URL}/users`, async ({ request }) => {
    const body = (await request.json()) as Partial<{
      email: string;
      name: string;
      surname: string;
    }>;

    const updated = UserProfileSchema.parse({
      ...userProfileData,
      ...body,
      fullName: [body.name ?? userProfileData.name, body.surname ?? userProfileData.surname]
        .filter(Boolean)
        .join(' ')
        .trim(),
      updatedAt: iso('2024-01-03T00:00:00.000Z'),
    });

    const response = successResponseSchema(UserProfileSchema).parse({
      success: true,
      data: updated,
      message: 'User profile updated successfully',
    });

    return HttpResponse.json(response);
  }),

  http.delete(`${API_BASE_URL}/users`, () =>
    HttpResponse.json({ success: true, data: null, message: 'Account deleted successfully' })
  ),

  http.post(`${API_BASE_URL}/auth/login`, () => HttpResponse.json(loginResponse)),

  http.post(`${API_BASE_URL}/auth/register`, () => HttpResponse.json(registerResponse)),

  http.post(`${API_BASE_URL}/auth/refresh`, () => HttpResponse.json(refreshResponse)),

  http.post(`${API_BASE_URL}/auth/logout`, () => HttpResponse.json(logoutResponse)),

  http.get(`${API_BASE_URL}/health`, () => HttpResponse.json(healthResponse)),

  http.get(`${API_BASE_URL}/auth/google/start`, () => HttpResponse.json(googleStartMobileResponse)),

  http.post(`${API_BASE_URL}/auth/google/mobile/start`, () =>
    HttpResponse.json(googleStartMobileResponse)
  ),

  http.post(`${API_BASE_URL}/auth/google/mobile/exchange`, () =>
    HttpResponse.json(googleMobileExchangeResponse)
  ),
];
