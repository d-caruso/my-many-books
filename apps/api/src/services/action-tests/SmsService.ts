import { ActionTestResult } from './ActionTestResult';
import { AbstractActionService } from './AbstractActionService';

export class SmsService extends AbstractActionService {
  constructor() {
    super(
      Number(process.env['SMS_TEST_TIMEOUT_MS'] ?? '5000'),
      process.env['SMS_TEST_ALLOWLIST']
    );
  }

  async sendTestSms(endpoint: string, recipients: string[], body: string): Promise<ActionTestResult> {
    if (!this.isHostAllowed(endpoint)) {
      return { success: false, error: 'SMS endpoint host not allowed' };
    }

    const start = Date.now();
    const response = await this.httpClient.post(endpoint, { recipients, body });
    return {
      success: response.status >= 200 && response.status < 300,
      status: response.status,
      responseTimeMs: Date.now() - start,
      error: response.status >= 300 ? `HTTP ${response.status}` : undefined,
    };
  }
}

export const smsService = new SmsService();
