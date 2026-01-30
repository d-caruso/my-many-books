import { ActionTestResult } from './ActionTestResult';
import { AbstractActionService } from './AbstractActionService';

export class EmailService extends AbstractActionService {
  constructor() {
    super(
      Number(process.env['EMAIL_TEST_TIMEOUT_MS'] ?? '5000'),
      process.env['EMAIL_TEST_ALLOWLIST_HOSTS']
    );
  }

  async sendTestEmail(
    endpoint: string,
    recipients: string[],
    subject: string,
    body: string | Record<string, unknown>
  ): Promise<ActionTestResult> {
    if (!this.isHostAllowed(endpoint)) {
      return { success: false, error: 'Email provider host not allowed', responseTimeMs: 0 };
    }

    const start = Date.now();
    const response = await this.httpClient.post(endpoint, {
      to: recipients,
      subject,
      body,
    });

    return {
      success: response.status >= 200 && response.status < 300,
      status: response.status,
      responseTimeMs: Date.now() - start,
      error: response.status >= 300 ? `HTTP ${response.status}` : undefined,
    };
  }
}

export const emailService = new EmailService();
