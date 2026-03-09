import { rest } from 'msw';
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
  rest.get(`${API_BASE_URL}/books`, (req, res, ctx) => {
    expect(req.url.searchParams.get('includeAuthors')).toBe('true');
    expect(req.url.searchParams.get('includeCategories')).toBe('true');
    return res(ctx.json(booksResponse));
  }),

  rest.get(`${API_BASE_URL}/authors`, (_req, res, ctx) => res(ctx.json(authorsResponse))),

  rest.get(`${API_BASE_URL}/categories`, (_req, res, ctx) => res(ctx.json(categoriesResponse))),

  rest.get(`${API_BASE_URL}/settings`, (_req, res, ctx) => res(ctx.json(settingsResponse))),

  rest.get(`${API_BASE_URL}/settings/admin`, (_req, res, ctx) => res(ctx.json(settingsResponse))),

  rest.patch(`${API_BASE_URL}/settings/admin/:key`, async (req, res, ctx) => {
    const body = (await req.json()) as { value?: unknown };
    if (!('value' in body)) {
      return res(ctx.status(400), ctx.json({ error: 'Missing value' }));
    }

    const updated = settingsData.map((s) =>
      s.key === req.params['key'] ? { ...s, value: JSON.stringify(body.value) } : s
    );

    const updatedSetting = updated.find((s) => s.key === req.params['key']);
    if (!updatedSetting) {
      return res(ctx.status(404), ctx.json({ error: 'Not found' }));
    }

    const response = successResponseSchema(AppSettingsArraySchema.element).parse({
      success: true,
      data: updatedSetting,
    });

    return res(ctx.json(response));
  }),

  rest.patch(`${API_BASE_URL}/settings/admin/:key/toggle`, async (req, res, ctx) => {
      const body = (await req.json()) as { active?: unknown };
      if (typeof body.active !== 'boolean') {
        return res(ctx.status(400), ctx.json({ error: 'Invalid active' }));
      }

      const updatedSetting = settingsData.find((s) => s.key === req.params['key']);
      if (!updatedSetting) {
        return res(ctx.status(404), ctx.json({ error: 'Not found' }));
      }

      const response = successResponseSchema(AppSettingsArraySchema.element).parse({
        success: true,
        data: { ...updatedSetting, active: body.active },
      });

      return res(ctx.json(response));
    }),

  rest.get(`${API_BASE_URL}/users`, (_req, res, ctx) => res(ctx.json(userProfileResponse))),

  rest.put(`${API_BASE_URL}/users`, async (req, res, ctx) => {
    const body = (await req.json()) as Partial<{
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

    return res(ctx.json(response));
  }),

  rest.delete(`${API_BASE_URL}/users`, (_req, res, ctx) =>
    res(ctx.status(200), ctx.json({ success: true, data: null, message: 'Account deleted successfully' }))
  ),

  rest.post(`${API_BASE_URL}/auth/login`, (_req, res, ctx) => res(ctx.json(loginResponse))),

  rest.post(`${API_BASE_URL}/auth/register`, (_req, res, ctx) => res(ctx.json(registerResponse))),

  rest.post(`${API_BASE_URL}/auth/refresh`, (_req, res, ctx) => res(ctx.json(refreshResponse))),

  rest.post(`${API_BASE_URL}/auth/logout`, (_req, res, ctx) => res(ctx.json(logoutResponse))),

  rest.get(`${API_BASE_URL}/health`, (_req, res, ctx) => res(ctx.json(healthResponse))),

  rest.get(`${API_BASE_URL}/auth/google/start`, (_req, res, ctx) => res(ctx.json(googleStartMobileResponse))),

  rest.post(`${API_BASE_URL}/auth/google/mobile/start`, (_req, res, ctx) =>
    res(ctx.json(googleStartMobileResponse))
  ),

  rest.post(`${API_BASE_URL}/auth/google/mobile/exchange`, (_req, res, ctx) =>
    res(ctx.json(googleMobileExchangeResponse))
  ),
];
