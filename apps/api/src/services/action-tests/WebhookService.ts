import { ActionTestResult } from './ActionTestResult';
import { AbstractActionService } from './AbstractActionService';

export class WebhookService extends AbstractActionService {
  private readonly maxRetries: number;

  constructor() {
    super(
      Number(process.env['WEBHOOK_TEST_TIMEOUT_MS'] ?? '5000'),
      process.env['WEBHOOK_TEST_ALLOWLIST_HOSTS']
    );
    this.maxRetries = Number(process.env['WEBHOOK_TEST_RETRY_ATTEMPTS'] ?? '1');
  }

  async executeTestEndpoints(
    endpoints: string[],
    payload: Record<string, unknown>
  ): Promise<ActionTestResult[]> {
    const results: ActionTestResult[] = [];

    for (const endpoint of endpoints) {
      if (!this.isHostAllowed(endpoint)) {
        results.push({
          success: false,
          error: 'Endpoint not allowed by webhook test allowlist',
        });
        continue;
      }

      let attempt = 0;
      let lastResult: ActionTestResult | null = null;

      while (attempt < this.maxRetries) {
        attempt += 1;
        const start = Date.now();
        try {
          const response = await this.httpClient.post(endpoint, payload, {
            headers: { 'Content-Type': 'application/json' },
          });

          const duration = Date.now() - start;
          const result: ActionTestResult = {
            success: response.status >= 200 && response.status < 300,
            status: response.status,
            responseTimeMs: duration,
            error: response.status >= 300 ? `HTTP ${response.status}` : undefined,
          };
          results.push(result);
          lastResult = result;
          break;
        } catch (error) {
          const duration = Date.now() - start;
          lastResult = {
            success: false,
            error: (error as Error).message,
            responseTimeMs: duration,
          };
          if (attempt >= this.maxRetries) {
            results.push(lastResult);
          }
        }
      }

      if (!lastResult) {
        results.push({
          success: false,
          error: 'No attempts made',
        });
      }
    }

    return results;
  }
}

export const webhookService = new WebhookService();
