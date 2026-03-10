import i18n from 'i18next';
import type { HttpClient, ApiClientConfig } from '@my-many-books/shared-api';
import type { MobileHooksListenerSettings, MobileAnalyticsActionTypeBreakdown } from '@my-many-books/shared-types';
import { authService } from './authService';
import { env } from '../config/env';
import type {
  AuditLoggingStatus,
  FullTextSearchStatus,
  MobileAnalyticsStatsResponse,
  AdminPinnedSearchResult,
  AdminPinnedSearchResultsResponse,
  AdminPinnedSearchCreateRequest,
  AdminUsersResponse,
  AdminMobileHooksListenerSettingsResponse,
  AdminMobileHooksListenerSettingsUpdateResponse,
  AdminMobileHooksConfigListenersResponse,
  AdminMobileHooksConfigListenersUpdateRequest,
  AdminMobileHooksConfigListenersUpdateResponse,
  AdminMobileHooksActionsConfigMappingsResponse,
  AdminMobileHooksActionsConfigMappingsUpdateRequest,
  AdminMobileHooksActionsConfigMappingsUpdateResponse,
  AdminMobileHooksActionsConfigTestRequest,
  AdminMobileHooksActionsConfigTestResponse,
  AdminMobileHooksActionTypesResponse,
  AdminMobileHooksActionTypeSettingsUpdateRequest,
  AdminMobileHooksActionTypeSettingsUpdateResponse,
  AdminMobileHooksActionTypeTestRequest,
  AdminMobileHooksActionTypeTestResponse,
  AdminMobileHooksEmergencyStatusResponse,
  AdminMobileHooksEmergencyStatusUpdateRequest,
  AdminMobileHooksEmergencyStatusUpdateResponse,
  AdminMobileHooksHealthResponse,
  AdminMobileHooksRecentEventsResponse,
  AdminHookSummary,
  AdminHookStats,
  AdminDashboardStats,
  AdminHookExecution,
  AdminHookExecutionResponse,
} from './admin-types';
import type { ResourceType } from '@my-many-books/shared-types';

export class AdminApiService {
  protected httpClient: HttpClient;
  protected apiConfig: ApiClientConfig;

  constructor(httpClient: HttpClient, apiConfig: ApiClientConfig) {
    this.httpClient = httpClient;
    this.apiConfig = apiConfig;
  }

  private buildAdminUrl(endpoint: string): string {
    const baseURL = env.API_BASE_URL;
    const cleanBaseURL = baseURL.replace(/\/$/, '');
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${cleanBaseURL}${normalizedEndpoint}`;
  }

  protected buildUrl(path: string): string {
    const base = this.apiConfig.baseURL.replace(/\/$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${normalizedPath}`;
  }

  private extractApiErrorMessage(errorData: unknown, fallback: string): string {
    if (!errorData || typeof errorData !== 'object') {
      return fallback;
    }

    const maybeError = (errorData as { error?: unknown }).error;
    if (typeof maybeError === 'string' && maybeError.length > 0) {
      return maybeError;
    }

    if (
      maybeError &&
      typeof maybeError === 'object' &&
      'message' in maybeError &&
      typeof (maybeError as Record<string, unknown>).message === 'string'
    ) {
      return (maybeError as Record<string, unknown>).message as string;
    }

    return fallback;
  }

  private unwrapSuccessEnvelope<T>(
    payload: unknown
  ): { data: T; pagination?: Record<string, unknown> } {
    if (
      payload &&
      typeof payload === 'object' &&
      'success' in payload &&
      (payload as { success?: unknown }).success === true &&
      'data' in payload
    ) {
      const typedPayload = payload as { data: T; pagination?: unknown };
      const result: { data: T; pagination?: Record<string, unknown> } = {
        data: typedPayload.data,
      };

      if (typedPayload.pagination && typeof typedPayload.pagination === 'object') {
        result.pagination = typedPayload.pagination as Record<string, unknown>;
      }

      return result;
    }

    throw new Error(
      i18n.t('common:errors.invalid_response_envelope', {
        defaultValue: 'Invalid API success envelope',
      })
    );
  }

  private async fetchAdminData<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = this.buildAdminUrl(endpoint);
    const token = await authService.getIdToken();

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        this.extractApiErrorMessage(errorData, `HTTP ${response.status}: ${response.statusText}`)
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const payload = await response.json().catch(() => null);
    return this.unwrapSuccessEnvelope<T>(payload).data;
  }

  private async fetchAdminPayload<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T; pagination?: Record<string, unknown> }> {
    const url = this.buildAdminUrl(endpoint);
    const token = await authService.getIdToken();

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        this.extractApiErrorMessage(errorData, `HTTP ${response.status}: ${response.statusText}`)
      );
    }

    if (response.status === 204) {
      return { data: undefined as T };
    }

    const payload = await response.json().catch(() => null);
    return this.unwrapSuccessEnvelope<T>(payload);
  }

  // Admin stats
  async getAdminStats(): Promise<AdminDashboardStats> {
    return this.fetchAdminData('/admin/stats/summary');
  }

  async getMobileAnalyticsStats(signal?: AbortSignal): Promise<MobileAnalyticsStatsResponse> {
    return this.fetchAdminData('/admin/mobile-analytics/stats', { signal });
  }

  async getHookActionStats(signal?: AbortSignal): Promise<{ actionTypeBreakdown: MobileAnalyticsActionTypeBreakdown[] }> {
    return this.fetchAdminData('/admin/mobile-hooks/analytics/stats', { signal });
  }

  // Admin hooks
  async getAdminHooks(): Promise<{ hooks: AdminHookSummary[]; total?: number }> {
    return this.fetchAdminData('/admin/hooks');
  }

  async getAdminHookStats(): Promise<AdminHookStats> {
    return this.fetchAdminData('/admin/hooks/stats/summary');
  }

  async reloadAdminHooks(): Promise<void> {
    await this.fetchAdminData('/admin/hooks/reload', { method: 'POST' });
  }

  async createAdminHook(data: {
    name: string;
    description: string;
    eventPattern: string;
    actionType: string;
    actionConfig: Record<string, unknown>;
    priority: number;
    isActive: boolean;
  }): Promise<AdminHookSummary> {
    return this.fetchAdminData('/admin/hooks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAdminHook(
    hookId: number,
    data: {
      name: string;
      description: string;
      eventPattern: string;
      actionType: string;
      actionConfig: Record<string, unknown>;
      priority: number;
      isActive: boolean;
    }
  ): Promise<AdminHookSummary> {
    return this.fetchAdminData(`/admin/hooks/${hookId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getAdminHookExecutions(params: {
    hookId?: number;
    success?: boolean;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  }): Promise<AdminHookExecutionResponse> {
    const query = new URLSearchParams();
    if (params.success !== undefined) query.append('success', String(params.success));
    if (params.from) query.append('from', params.from);
    if (params.to) query.append('to', params.to);
    if (params.page !== undefined) query.append('page', params.page.toString());
    if (params.pageSize !== undefined) query.append('limit', params.pageSize.toString());
    const queryString = query.toString() ? `?${query.toString()}` : '';

    const endpoint = params.hookId
      ? `/admin/hooks/${params.hookId}/executions${queryString}`
      : `/admin/hooks/executions/recent${queryString}`;

    const payload = await this.fetchAdminPayload<{ executions: AdminHookExecution[] }>(endpoint);
    const pagination = payload.pagination as
      | { totalItems?: number; currentPage?: number; itemsPerPage?: number }
      | undefined;

    return {
      executions: payload.data?.executions || [],
      total: pagination?.totalItems ?? payload.data?.executions?.length ?? 0,
      page: pagination?.currentPage ?? params.page ?? 1,
      pageSize: pagination?.itemsPerPage ?? params.pageSize ?? payload.data?.executions?.length ?? 0,
    };
  }

  // Admin mobile hooks
  async getAdminMobileHooksListenerSettings(): Promise<AdminMobileHooksListenerSettingsResponse> {
    return this.fetchAdminData('/admin/mobile-hooks/settings/listeners');
  }

  async updateAdminMobileHooksListenerSettings(
    settings: Partial<MobileHooksListenerSettings>
  ): Promise<AdminMobileHooksListenerSettingsUpdateResponse> {
    return this.fetchAdminData('/admin/mobile-hooks/settings/listeners', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async getAdminMobileHooksConfigListeners(
    signal?: AbortSignal
  ): Promise<AdminMobileHooksConfigListenersResponse> {
    return this.fetchAdminData('/admin/mobile-hooks/config/listeners', { signal });
  }

  async getAdminMobileHooksActionsConfigMappings(): Promise<AdminMobileHooksActionsConfigMappingsResponse> {
    return this.fetchAdminData('/admin/mobile-hooks/actions-config/mappings');
  }

  async updateAdminMobileHooksConfigListeners(
    listeners: AdminMobileHooksConfigListenersUpdateRequest
  ): Promise<AdminMobileHooksConfigListenersUpdateResponse> {
    return this.fetchAdminData('/admin/mobile-hooks/config/listeners', {
      method: 'PUT',
      body: JSON.stringify(listeners),
    });
  }

  async updateAdminMobileHooksActionsConfigMappings(
    request: AdminMobileHooksActionsConfigMappingsUpdateRequest
  ): Promise<AdminMobileHooksActionsConfigMappingsUpdateResponse> {
    return this.fetchAdminData('/admin/mobile-hooks/actions-config/mappings', {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  }

  async testAdminMobileHooksActionsConfig(
    request: AdminMobileHooksActionsConfigTestRequest = {}
  ): Promise<AdminMobileHooksActionsConfigTestResponse> {
    return this.fetchAdminData('/admin/mobile-hooks/actions-config/test', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getAdminMobileHooksActionTypes(): Promise<AdminMobileHooksActionTypesResponse> {
    return this.fetchAdminData('/admin/mobile-hooks/actions-config/types');
  }

  async updateAdminMobileHooksActionTypeSettings(
    actionType: string,
    settings: AdminMobileHooksActionTypeSettingsUpdateRequest
  ): Promise<AdminMobileHooksActionTypeSettingsUpdateResponse> {
    const payload = await this.fetchAdminData<Record<string, unknown>>(
      `/admin/mobile-hooks/actions-config/types/${encodeURIComponent(actionType)}`,
      {
        method: 'PUT',
        body: JSON.stringify(settings),
      }
    );

    return {
      actionType: (payload.actionType ?? payload.action_type ?? actionType) as string,
      settings: payload.settings as Record<string, unknown>,
      updated: payload.updated as string[],
      lastUpdated: payload.lastUpdated as string,
    };
  }

  async testAdminMobileHooksActionType(
    actionType: string,
    request: Omit<AdminMobileHooksActionTypeTestRequest, 'actionType'> = {}
  ): Promise<AdminMobileHooksActionTypeTestResponse> {
    return this.fetchAdminData(
      `/admin/mobile-hooks/actions-config/types/${encodeURIComponent(actionType)}/test`,
      {
        method: 'POST',
        body: JSON.stringify({ actionType, ...request }),
      }
    );
  }

  async getAdminMobileHooksEmergencyStatus(): Promise<AdminMobileHooksEmergencyStatusResponse> {
    return this.fetchAdminData('/admin/mobile-hooks/emergency');
  }

  async updateAdminMobileHooksEmergencyStatus(
    request: AdminMobileHooksEmergencyStatusUpdateRequest
  ): Promise<AdminMobileHooksEmergencyStatusUpdateResponse> {
    return this.fetchAdminData('/admin/mobile-hooks/emergency', {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  }

  async getAdminMobileHooksHealth(): Promise<AdminMobileHooksHealthResponse> {
    return this.fetchAdminData('/admin/mobile-hooks/health');
  }

  async getAdminMobileHooksRecentEvents(
    limit: number = 50,
    signal?: AbortSignal
  ): Promise<AdminMobileHooksRecentEventsResponse> {
    const safeLimit = Math.min(200, Math.max(1, Math.floor(limit)));
    return this.fetchAdminData(
      `/admin/mobile-hooks/analytics/events/recent?limit=${encodeURIComponent(safeLimit)}`,
      { signal }
    );
  }

  // Admin search pinned results
  async getAdminPinnedSearchResults(
    resourceType?: ResourceType
  ): Promise<AdminPinnedSearchResultsResponse> {
    const queryParams = new URLSearchParams();
    if (resourceType) {
      queryParams.append('resource_type', resourceType);
    }
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/admin/search/pinned?${queryString}` : '/admin/search/pinned';
    return this.fetchAdminData(endpoint);
  }

  async createAdminPinnedSearchResult(
    request: AdminPinnedSearchCreateRequest
  ): Promise<AdminPinnedSearchResult> {
    return this.fetchAdminData('/admin/search/pinned', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async updateAdminPinnedSearchPriority(
    id: number,
    priority: number
  ): Promise<AdminPinnedSearchResult> {
    return this.fetchAdminData(`/admin/search/pinned/${id}/priority`, {
      method: 'PATCH',
      body: JSON.stringify({ priority }),
    });
  }

  async deleteAdminPinnedSearchResult(id: number): Promise<void> {
    await this.fetchAdminData(`/admin/search/pinned/${id}`, {
      method: 'DELETE',
    });
  }

  // Admin users
  async getAdminUsers(
    page: number = 1,
    limit: number = 10,
    search?: string
  ): Promise<AdminUsersResponse> {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) {
      queryParams.append('search', search);
    }
    const payload = await this.fetchAdminPayload<Pick<AdminUsersResponse, 'users'>>(
      `/admin/users?${queryParams.toString()}`
    );
    const pagination = payload.pagination as AdminUsersResponse['pagination'] | undefined;

    return {
      users: payload.data?.users || [],
      pagination: pagination
        ? {
            ...pagination,
            total: pagination.total ?? pagination.totalItems,
          }
        : undefined,
    };
  }

  async getAdminUser(id: number): Promise<unknown> {
    return this.fetchAdminData(`/admin/users/${id}`);
  }

  async updateAdminUser(id: number, userData: unknown): Promise<unknown> {
    return this.fetchAdminData(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteAdminUser(id: number): Promise<unknown> {
    return this.fetchAdminData(`/admin/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Admin books
  async getAdminBooks<TResponse = unknown>(
    page: number = 1,
    limit: number = 10,
    search?: string,
    userId?: number
  ): Promise<TResponse> {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) {
      queryParams.append('search', search);
    }
    if (userId) {
      queryParams.append('userId', userId.toString());
    }
    return this.fetchAdminData(`/admin/books?${queryParams.toString()}`);
  }

  async getAdminBook(id: number): Promise<unknown> {
    return this.fetchAdminData(`/admin/books/${id}`);
  }

  async updateAdminBook(id: number, bookData: unknown): Promise<unknown> {
    return this.fetchAdminData(`/admin/books/${id}`, {
      method: 'PUT',
      body: JSON.stringify(bookData),
    });
  }

  async deleteAdminBook(id: number): Promise<unknown> {
    return this.fetchAdminData(`/admin/books/${id}`, {
      method: 'DELETE',
    });
  }

  // Admin config
  async getAuditLoggingStatus(): Promise<AuditLoggingStatus> {
    return this.httpClient.get<AuditLoggingStatus>(this.buildUrl('/admin/settings/audit-logging'));
  }

  async updateAuditLoggingStatus(enabled: boolean): Promise<AuditLoggingStatus> {
    return this.httpClient.patch<AuditLoggingStatus>(this.buildUrl('/admin/settings/audit-logging'), {
      enabled,
    });
  }

  async getFullTextSearchStatus(): Promise<FullTextSearchStatus> {
    return this.httpClient.get<FullTextSearchStatus>(this.buildUrl('/admin/settings/search/status'));
  }

  async updateFullTextSearchStatus(settings: {
    enabled?: boolean;
    sortableFields?: string[];
    defaultSort?: string;
  }): Promise<FullTextSearchStatus> {
    return this.httpClient.patch<FullTextSearchStatus>(this.buildUrl('/admin/settings/search'), settings);
  }
}
