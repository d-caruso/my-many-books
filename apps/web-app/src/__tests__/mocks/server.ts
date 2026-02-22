/**
 * MSW server setup for HTTP layer mocking
 * Industry standard approach for API testing
 */

import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import type { Book, Author, Category, User, PaginatedResponse } from '@my-many-books/shared-types';

import { MOBILE_ANALYTICS_PROCESSING_STATUS, USER_RESPONSE_FIELDS } from '@my-many-books/shared-types';
import { API_BASE_PATH } from '../utils/apiBasePath';

const now = new Date().toISOString();

const mockBooks: Book[] = [
  {
    id: 1,
    title: 'The Great Gatsby',
    isbnCode: '9780743273565',
    status: 'finished',
    userId: 1,
    authors: [
      {
        id: 1,
        name: 'F. Scott',
        surname: 'Fitzgerald',
      },
    ],
    categories: [
      {
        id: 1,
        name: 'Fiction',
      },
    ],
    creationDate: '2024-01-15T10:00:00Z',
    updateDate: '2024-01-15T10:00:00Z',
  },
];

const mockCategories: Category[] = [
  { id: 1, name: 'Fiction', creationDate: '2024-01-01T00:00:00Z', updateDate: '2024-01-01T00:00:00Z' },
  { id: 2, name: 'Non-Fiction', creationDate: '2024-01-01T00:00:00Z', updateDate: '2024-01-01T00:00:00Z' },
];

const mockAuthors: Author[] = [
  { id: 1, name: 'F. Scott', surname: 'Fitzgerald', nationality: 'American', creationDate: '2024-01-01T00:00:00Z', updateDate: '2024-01-01T00:00:00Z' },
  { id: 2, name: 'Harper', surname: 'Lee', nationality: 'American', creationDate: '2024-01-01T00:00:00Z', updateDate: '2024-01-01T00:00:00Z' },
];

const mockUser: User = {
  id: 1,
  email: 'test@example.com',
  name: 'Test',
  surname: 'User',
  isActive: true,
  role: 'user',
  creationDate: now,
  updateDate: now,
};

const mockUserResponse = {
  id: 1,
  email: 'test@example.com',
  name: 'Test',
  surname: 'User',
  [USER_RESPONSE_FIELDS.FULL_NAME]: 'Test User',
  isActive: true,
  role: 'user',
  [USER_RESPONSE_FIELDS.CREATED_AT]: now,
  [USER_RESPONSE_FIELDS.UPDATED_AT]: now,
};

type MobileHooksState = {
  listeners: Record<string, { enabled: boolean }>;
  categories: Record<string, { enabled: boolean }>;
  availableEvents: string[];
  mappings: Record<string, string[]>;
  actionSettings: Record<string, unknown>;
  actionTypes: Record<string, any>;
  listenerSettings: Record<string, unknown>;
  emergency: Record<string, any>;
  health: Record<string, any>;
  analyticsStats: Record<string, any>;
  recentEvents: Array<Record<string, any>>;
};

const createMobileHooksState = (): MobileHooksState => ({
  listeners: {
    'error.unhandled': { enabled: true },
    'user.created': { enabled: false },
  },
  categories: {
    errors: { enabled: true },
  },
  availableEvents: ['error.unhandled', 'user.created'],
  mappings: {
    'error.unhandled': ['email'],
    'user.created': ['webhook'],
  },
  actionSettings: {},
  actionTypes: {
    email: {
      description: 'Email notifications',
      enabled: true,
      configured: true,
      warnings: [],
      settings: { enabled: true, rate_limit_minutes: 10 },
    },
    webhook: {
      description: 'Webhook handler',
      enabled: true,
      configured: true,
      warnings: [],
      settings: { enabled: true, endpoint: 'https://hooks.example.com' },
    },
  },
  listenerSettings: {
    analyticsEnabled: true,
    errorReportingEnabled: true,
    offlineStorageEnabled: true,
    performanceMonitoringEnabled: true,
    batchUploadInterval: 300,
    maxOfflineEvents: 1000,
  },
  emergency: {
    enabled: true,
    disabledAt: null,
    disabledReason: null,
  },
  health: {
    status: 'healthy',
    healthScore: 100,
    checks: {
      settingsLoaded: true,
      emergencyEnabled: true,
      analyticsActive: true,
      errorReportingActive: true,
      offlineStorageActive: true,
      performanceMonitoringActive: true,
    },
    timestamp: now,
  },
  analyticsStats: {
    eventsProcessedToday: 5,
    eventsProcessedTotal: 50,
    failedEventsTotal: 2,
    errorRate: 0.04,
    avgProcessingTimeMs: 42,
    topEventTypes: [{ eventType: 'error.unhandled', count: 5 }],
    eventTypeBreakdown: [
      {
        eventType: 'error.unhandled',
        attempted: 5,
        successful: 4,
        failed: 1,
        successRate: 0.8,
        errorRate: 0.2,
      },
    ],
    lastProcessed: now,
    systemStatus: 'healthy',
    timeSeries: [
      {
        bucketStart: now,
        processed: 4,
        failed: 1,
        total: 5,
      },
    ],
    actionTypeBreakdown: [
      {
        actionType: 'email',
        attempted: 5,
        successful: 4,
        failed: 1,
        successRate: 0.8,
        errorRate: 0.2,
      },
    ],
    generatedAt: now,
  },
  recentEvents: [
    {
      eventId: 'evt-1',
      eventType: 'error.unhandled',
      processingStatus: MOBILE_ANALYTICS_PROCESSING_STATUS.PROCESSED,
      processingError: null,
      createdAt: now,
      actionExecutions: [
        {
          actionType: 'email',
          status: 'success',
          executedAt: now,
        },
      ],
    },
  ],
});

let mobileHooksState = createMobileHooksState();
export const resetMobileHooksState = () => {
  mobileHooksState = createMobileHooksState();
};

const buildListenersResponse = () => ({
  data: {
    listeners: mobileHooksState.listeners,
    categories: mobileHooksState.categories,
    availableEvents: mobileHooksState.availableEvents,
    lastUpdated: new Date().toISOString(),
  },
});

const buildMappingsPayload = () => ({
  actions: mobileHooksState.mappings,
  actionSettings: mobileHooksState.actionSettings,
  availableEvents: mobileHooksState.availableEvents,
  lastUpdated: new Date().toISOString(),
});

const buildMappingsResponse = () => ({
  data: buildMappingsPayload(),
});

const buildMappingsUpdateResponse = () => ({
  data: {
    config: buildMappingsPayload(),
    updated: ['actions'],
    lastUpdated: new Date().toISOString(),
  },
});

const buildRecentEventsResponse = ({ limit }: { limit?: number }) => ({
  data: {
    events: mobileHooksState.recentEvents.slice(0, limit ?? mobileHooksState.recentEvents.length),
  },
});

const buildActionTypesResponse = () => ({
  data: {
    actions: mobileHooksState.actionTypes,
  },
});

const buildListenerSettingsResponse = () => ({
  data: {
    settings: mobileHooksState.listenerSettings,
    lastUpdated: new Date().toISOString(),
    version: '1.0.0',
  },
});

export const handlers = [
  // Books endpoints
  http.get(`*${API_BASE_PATH}/books`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    const response: PaginatedResponse<Book> = {
      books: mockBooks,
      pagination: {
        currentPage: page,
        totalPages: 1,
        totalItems: mockBooks.length,
        itemsPerPage: limit,
      },
    };

    return HttpResponse.json(response);
  }),

  http.get(`*${API_BASE_PATH}/books/:id`, ({ params }) => {
    const id = parseInt(params.id as string);
    const book = mockBooks.find((b) => b.id === id);
    if (!book) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(book);
  }),

  http.post(`*${API_BASE_PATH}/books`, async ({ request }) => {
    const bookData = (await request.json()) as any;
    const newBook: Book = {
      id: Date.now(),
      ...bookData,
      userId: 1,
      authors: [],
      categories: [],
      creationDate: new Date().toISOString(),
      updateDate: new Date().toISOString(),
    };
    return HttpResponse.json(newBook);
  }),

  http.put(`*${API_BASE_PATH}/books/:id`, async ({ params, request }) => {
    const id = parseInt(params.id as string);
    const updateData = (await request.json()) as any;
    const existingBook = mockBooks.find((b) => b.id === id);

    if (!existingBook) {
      return new HttpResponse(null, { status: 404 });
    }

    const updatedBook: Book = {
      ...existingBook,
      ...updateData,
      updateDate: new Date().toISOString(),
    };

    return HttpResponse.json(updatedBook);
  }),

  http.delete(`*${API_BASE_PATH}/books/:id`, ({ params }) => {
    const id = parseInt(params.id as string);
    const bookIndex = mockBooks.findIndex((b) => b.id === id);
    if (bookIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({ success: true });
  }),

  // Categories endpoints
  http.get(`*${API_BASE_PATH}/categories`, () => HttpResponse.json(mockCategories)),
  http.get(`*${API_BASE_PATH}/categories/:id`, ({ params }) => {
    const id = parseInt(params.id as string);
    const category = mockCategories.find((c) => c.id === id);
    if (!category) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(category);
  }),
  http.post(`*${API_BASE_PATH}/categories`, async ({ request }) => {
    const categoryData = (await request.json()) as any;
    const newCategory: Category = {
      id: Date.now(),
      ...categoryData,
      creationDate: new Date().toISOString(),
      updateDate: new Date().toISOString(),
    };
    return HttpResponse.json(newCategory);
  }),

  // Authors endpoints
  http.get(`*${API_BASE_PATH}/authors`, () => HttpResponse.json(mockAuthors)),
  http.get(`*${API_BASE_PATH}/authors/:id`, ({ params }) => {
    const id = parseInt(params.id as string);
    const author = mockAuthors.find((a) => a.id === id);
    if (!author) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(author);
  }),
  http.post(`*${API_BASE_PATH}/authors`, async ({ request }) => {
    const authorData = (await request.json()) as any;
    const newAuthor: Author = {
      id: Date.now(),
      ...authorData,
      creationDate: new Date().toISOString(),
      updateDate: new Date().toISOString(),
    };
    return HttpResponse.json(newAuthor);
  }),

  // Users endpoints
  http.get(`*${API_BASE_PATH}/users`, () => HttpResponse.json(mockUserResponse)),
  http.put(`*${API_BASE_PATH}/users`, async ({ request }) => {
    const updateData = (await request.json()) as Partial<typeof mockUserResponse>;
    const updatedUserResponse = {
      ...mockUserResponse,
      ...updateData,
      [USER_RESPONSE_FIELDS.UPDATED_AT]: new Date().toISOString(),
      [USER_RESPONSE_FIELDS.FULL_NAME]: updateData.name && updateData.surname ? `${updateData.name} ${updateData.surname}`.trim() : mockUserResponse[USER_RESPONSE_FIELDS.FULL_NAME],
    };
    return HttpResponse.json(updatedUserResponse);
  }),

  // Search endpoints
  http.get(`*${API_BASE_PATH}/books/search/isbn/:isbn`, ({ params }) => {
    const book = mockBooks.find((b) => b.isbnCode === params.isbn);
    if (!book) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({ source: 'local', book });
  }),
  http.get(`*${API_BASE_PATH}/books/search`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q');
    const status = url.searchParams.get('status');

    let filteredBooks = mockBooks;
    if (q) {
      filteredBooks = filteredBooks.filter((book) => book.title.toLowerCase().includes(q.toLowerCase()));
    }
    if (status) {
      filteredBooks = filteredBooks.filter((book) => book.status === status);
    }

    return HttpResponse.json({
      books: filteredBooks,
      total: filteredBooks.length,
      hasMore: false,
      page: 1,
    });
  }),
  http.get(`*${API_BASE_PATH}/authors/search`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q');

    let filteredAuthors = mockAuthors;
    if (q) {
      filteredAuthors = mockAuthors.filter(
        (a) => a.name.toLowerCase().includes(q.toLowerCase()) || a.surname.toLowerCase().includes(q.toLowerCase())
      );
    }

    return HttpResponse.json(filteredAuthors);
  }),

  // Mobile hooks APIs
  http.get(`*${API_BASE_PATH}/admin/mobile-hooks/config/listeners`, () => HttpResponse.json(buildListenersResponse())),
  http.put(`*${API_BASE_PATH}/admin/mobile-hooks/config/listeners`, async ({ request }) => {
    const payload = (await request.json()) as Record<string, any>;
    if (payload.listeners) {
      Object.assign(mobileHooksState.listeners, payload.listeners);
    }
    if (payload.categories) {
      Object.assign(mobileHooksState.categories, payload.categories);
    }
    return HttpResponse.json({
      data: {
        updated: [
          ...Object.keys(payload.listeners ?? {}).map((key) => `listeners.${key}.enabled`),
          ...Object.keys(payload.categories ?? {}).map((key) => `categories.${key}.enabled`),
        ],
        lastUpdated: new Date().toISOString(),
      },
    });
  }),
  http.get(`*${API_BASE_PATH}/admin/mobile-hooks/actions-config/mappings`, () => HttpResponse.json(buildMappingsResponse())),
  http.put(`*${API_BASE_PATH}/admin/mobile-hooks/actions-config/mappings`, async ({ request }) => {
    const payload = (await request.json()) as Record<string, any>;
    if (payload.actions) {
      mobileHooksState.mappings = payload.actions;
    }
    return HttpResponse.json(buildMappingsUpdateResponse());
  }),
  http.post(`*${API_BASE_PATH}/admin/mobile-hooks/actions-config/test`, () =>
    HttpResponse.json({ data: { executed: true } })
  ),
  http.get(`*${API_BASE_PATH}/admin/mobile-hooks/actions-config/types`, () => HttpResponse.json(buildActionTypesResponse())),
  http.put(`*${API_BASE_PATH}/admin/mobile-hooks/actions-config/types/:actionType`, async ({ params, request }) => {
    const actionType = params.actionType as string;
    const settings = await request.json();
    mobileHooksState.actionTypes[actionType] = {
      ...mobileHooksState.actionTypes[actionType],
      settings,
    };
    return HttpResponse.json({
      data: {
        actionType,
        settings,
        updated: ['settings'],
        lastUpdated: new Date().toISOString(),
      },
    });
  }),
  http.post(`*${API_BASE_PATH}/admin/mobile-hooks/actions-config/types/:actionType/test`, ({ params }) =>
    HttpResponse.json({ data: { actionType: params.actionType, status: 'success' } })
  ),
  http.get(`*${API_BASE_PATH}/admin/mobile-hooks/settings/listeners`, () => HttpResponse.json(buildListenerSettingsResponse())),
  http.put(`*${API_BASE_PATH}/admin/mobile-hooks/settings/listeners`, async ({ request }) => {
    const updates = (await request.json()) as Record<string, unknown>;
    mobileHooksState.listenerSettings = {
      ...mobileHooksState.listenerSettings,
      ...updates,
    };
    return HttpResponse.json(buildListenerSettingsResponse());
  }),
  http.get(`*${API_BASE_PATH}/admin/mobile-hooks/emergency`, () => HttpResponse.json({ data: mobileHooksState.emergency })),
  http.put(`*${API_BASE_PATH}/admin/mobile-hooks/emergency`, async ({ request }) => {
    const updates = (await request.json()) as Record<string, unknown>;
    mobileHooksState.emergency = {
      ...mobileHooksState.emergency,
      ...updates,
    };
    return HttpResponse.json({ data: mobileHooksState.emergency });
  }),
  http.get(`*${API_BASE_PATH}/admin/mobile-hooks/health`, () =>
    HttpResponse.json({ data: { ...mobileHooksState.health, timestamp: new Date().toISOString() } })
  ),
  http.get(`*${API_BASE_PATH}/admin/mobile-hooks/analytics/events/recent`, ({ request }) => {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') ?? '50');
    return HttpResponse.json(buildRecentEventsResponse({ limit }));
  }),
  http.get(`*${API_BASE_PATH}/admin/mobile-analytics/stats`, () => HttpResponse.json({ data: mobileHooksState.analyticsStats })),
];

export const server = setupServer(...handlers);
