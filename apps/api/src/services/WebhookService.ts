import axios, { AxiosInstance } from 'axios';
import { getLogger } from '@my-many-books/shared-logging';

interface WebhookExecutionResult {
  endpoint: string;
  success: boolean;
  status?: number;
  error?: string;
  responseTimeMs?: number;
}

export class WebhookService {
  private readonly axiosClient: AxiosInstance;
  private readonly allowlist: string[];
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly logger = getLogger();

  constructor() {
    this.timeoutMs = Number(process.env['WEBHOOK_TEST_TIMEOUT_MS'] ?? '5000');
    this.maxRetries = Number(process.env['WEBHOOK_TEST_RETRY_ATTEMPTS'] ?? '1');
    const hosts = process.env['WEBHOOK_TEST_ALLOWLIST_HOSTS'] ?? '';
    this.allowlist = hosts
      .split(',')
      .map(host => host.trim())
      .filter(Boolean);
    this.axiosClient = axios.create({
      timeout: this.timeoutMs,
      validateStatus: () => true,
    });
  }

  private isEndpointAllowed(endpoint: string): boolean {
    if (this.allowlist.length === 0) {
      return true;
    }

    try {
      const parsed = new URL(endpoint);
      return this.allowlist.includes(parsed.hostname);
    } catch (error) {
      this.logger.warn({ endpoint, err: error }, 'Webhook endpoint parse failed');
      return false;
    }
  }

  async executeTestEndpoints(
    endpoints: string[],
    payload: Record<string, unknown>
  ): Promise<WebhookExecutionResult[]> {
    const results: WebhookExecutionResult[] = [];

    for (const endpoint of endpoints) {
      if (!this.isEndpointAllowed(endpoint)) {
        results.push({
          endpoint,
          success: false,
          error: 'Endpoint not allowed by webhook test allowlist',
        });
        continue;
      }

      let attempt = 0;
      let lastError: unknown = null;

      while (attempt < this.maxRetries) {
        attempt += 1;
        const start = Date.now();
        try {
          const response = await this.axiosClient.post(endpoint, payload, {
            headers: {
              'Content-Type': 'application/json',
            },
          });
          const duration = Date.now() - start;
          results.push({
            endpoint,
            success: response.status >= 200 && response.status < 300,
            status: response.status,
            responseTimeMs: duration,
            error: response.status >= 300 ? `HTTP ${response.status}` : undefined,
          });
          break;
        } catch (error) {
          lastError = error;
          this.logger.warn(
            { endpoint, attempt, err: error },
            'Webhook test execution attempt failed'
          );
          if (attempt >= this.maxRetries) {
            results.push({
              endpoint,
              success: false,
              error: (error as Error).message,
            });
          }
        }
      }

      if (attempt === 0 && lastError) {
        results.push({
          endpoint,
          success: false,
          error: (lastError as Error).message,
        });
      }
    }

    return results;
  }
}

export const webhookService = new WebhookService();
