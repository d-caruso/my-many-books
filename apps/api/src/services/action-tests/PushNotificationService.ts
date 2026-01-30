import { ActionTestResult } from './ActionTestResult';
import { AbstractActionService } from './AbstractActionService';

export class PushNotificationService extends AbstractActionService {
  constructor() {
    super(
      Number(process.env['PUSH_NOTIFICATION_TEST_TIMEOUT_MS'] ?? '5000'),
      process.env['PUSH_NOTIFICATION_TEST_ALLOWLIST']
    );
  }

  async sendTestNotification(endpoint: string, payload: Record<string, unknown>): Promise<ActionTestResult> {
    if (!this.isHostAllowed(endpoint)) {
      return { success: false, error: 'Push endpoint host not allowed' };
    }

    const start = Date.now();
    const response = await this.httpClient.post(endpoint, payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    return {
      success: response.status >= 200 && response.status < 300,
      status: response.status,
      responseTimeMs: Date.now() - start,
      error: response.status >= 300 ? `HTTP ${response.status}` : undefined,
    };
  }
}

export const pushNotificationService = new PushNotificationService();
