import * as http from 'http';
import { IncomingMessage, ServerResponse } from 'http';
import { AddressInfo } from 'net';
import { createApiClient, HttpClient, RequestConfig, SettingsApi } from '../index';

type SuccessEnvelope<T> = { success: true; data: T };

function getItemOrThrow<T>(items: readonly T[], index: number, label: string): T {
  const item = items[index];
  if (!item) {
    throw new Error(`Expected ${label} at index ${index}`);
  }
  return item;
}

class UnwrappingFetchHttpClient implements HttpClient {
  private async request<T>(
    method: string,
    url: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    const requestUrl = new URL(url);
    if (config?.params) {
      for (const [key, value] of Object.entries(config.params)) {
        if (value === undefined || value === null) continue;
        requestUrl.searchParams.set(key, String(value));
      }
    }

    const controller = new AbortController();
    const timeoutMs = config?.timeout;
    const timeoutId =
      typeof timeoutMs === 'number' ? setTimeout(() => controller.abort(), timeoutMs) : null;

    try {
      const response = await fetch(requestUrl.toString(), {
        method,
        headers: config?.headers,
        body: data === undefined ? undefined : JSON.stringify(data),
        signal: controller.signal,
      });

      if (response.status === 204) {
        return undefined as T;
      }

      const text = await response.text();
      const payload = text ? JSON.parse(text) : undefined;

      if (!response.ok) {
        const error: any = new Error(`HTTP Error ${response.status}`);
        error.status = response.status;
        error.response = payload;
        throw error;
      }

      if (
        payload &&
        typeof payload === 'object' &&
        'success' in payload &&
        (payload as any).success === true &&
        'data' in payload &&
        (payload as any).data !== undefined
      ) {
        return (payload as SuccessEnvelope<T>).data;
      }

      return payload as T;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  get<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>('GET', url, undefined, config);
  }
  post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>('POST', url, data, config);
  }
  put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>('PUT', url, data, config);
  }
  patch<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>('PATCH', url, data, config);
  }
  delete<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>('DELETE', url, undefined, config);
  }
}

const readJsonBody = async (req: IncomingMessage): Promise<any> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const body = Buffer.concat(chunks).toString('utf8');
  return body ? JSON.parse(body) : undefined;
};

const json = (res: ServerResponse, status: number, payload: unknown): void => {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
};

describe('shared-api contract (success envelope)', () => {
  let server: http.Server;
  let baseURL: string;

  beforeAll(async () => {
    const now = new Date('2025-01-01T00:00:00.000Z').toISOString();
    let currentUser = {
      id: 1,
      email: 'user@example.com',
      name: 'Jane',
      surname: 'Doe',
      fullName: 'Jane Doe',
      isActive: true,
      role: 'user',
      createdAt: now,
      updatedAt: now,
    };

    const categories = [
      { id: 1, name: 'Fiction', creationDate: now, updateDate: now },
      { id: 2, name: 'Non-Fiction', creationDate: now, updateDate: now },
    ];

    const settings = [
      {
        key: 'app.theme',
        value: JSON.stringify('light'),
        category: 'ui',
        type: 'string',
        defaultValue: JSON.stringify('light'),
        active: true,
        deleted: false,
        creationDate: now,
        updateDate: now,
      },
    ];

    server = http.createServer(async (req, res) => {
      const method = req.method ?? 'GET';
      const url = new URL(req.url ?? '/', 'http://localhost');
      const path = url.pathname;

      if (method === 'GET' && path === '/users') {
        return json(res, 200, { success: true, data: currentUser });
      }

      if (method === 'PUT' && path === '/users') {
        const body = await readJsonBody(req);
        currentUser = {
          ...currentUser,
          ...body,
          updateDate: new Date('2025-01-02T00:00:00.000Z').toISOString(),
        };
        return json(res, 200, { success: true, data: currentUser });
      }

      if (method === 'GET' && path === '/categories') {
        return json(res, 200, { success: true, data: categories });
      }

      if (method === 'DELETE' && path.startsWith('/categories/')) {
        res.writeHead(204);
        return res.end();
      }

      if (method === 'GET' && path === '/settings') {
        return json(res, 200, { success: true, data: settings });
      }

      if (method === 'GET' && path.startsWith('/settings/')) {
        const key = decodeURIComponent(path.slice('/settings/'.length));
        const setting = settings.find(s => s.key === key);
        if (!setting) {
          return json(res, 404, { success: false, error: 'Not found' });
        }
        return json(res, 200, { success: true, data: setting });
      }

      return json(res, 404, { success: false, error: 'Not found' });
    });

    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address() as AddressInfo;
    baseURL = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('unwraps and validates the current user profile', async () => {
    const api = createApiClient(new UnwrappingFetchHttpClient(), { baseURL });
    const user = await api.users.getCurrentUser();
    expect(user.name).toBe('Jane');
    expect(user.surname).toBe('Doe');
    expect(user.createdAt).toBeTruthy();
    expect(user.updatedAt).toBeTruthy();
  });

  it('unwraps and validates categories', async () => {
    const api = createApiClient(new UnwrappingFetchHttpClient(), { baseURL });
    const result = await api.categories.getCategories();
    expect(result).toHaveLength(2);
    expect(getItemOrThrow(result, 0, 'category').name).toBe('Fiction');
  });

  it('unwraps settings and converts date fields', async () => {
    const settingsApi = new SettingsApi(new UnwrappingFetchHttpClient(), { baseURL });
    const result = await settingsApi.getSettings();
    expect(result).toHaveLength(1);
    const firstSetting = getItemOrThrow(result, 0, 'setting');
    expect(firstSetting.creationDate).toBeInstanceOf(Date);
    expect(firstSetting.updateDate).toBeInstanceOf(Date);
  });

  it('handles 204 deletes without a JSON body', async () => {
    const api = createApiClient(new UnwrappingFetchHttpClient(), { baseURL });
    await expect(api.categories.deleteCategory(1)).resolves.toBeUndefined();
  });
});
