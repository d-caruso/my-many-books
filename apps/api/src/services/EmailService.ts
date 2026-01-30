import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { getLogger } from '@my-many-books/shared-logging';

export interface EmailSendResult {
  success: boolean;
  status?: number;
  error?: string;
  responseTimeMs?: number;
  endpoint?: string;
}

export class EmailService {
  private readonly httpClient: AxiosInstance;
  private readonly allowlist: string[];
  private readonly timeoutMs: number;
  private readonly logger = getLogger();

  constructor() {
    this.timeoutMs = Number(process.env['EMAIL_TEST_TIMEOUT_MS'] ?? '5000');
    const hosts = process.env['EMAIL_TEST_ALLOWLIST_HOSTS'] ?? '';
    this.allowlist = hosts
      .split(',')
      .map(host => host.trim())
      .filter(Boolean);
    this.httpClient = axios.create({
      timeout: this.timeoutMs,
      validateStatus: () => true,
    });
  }

  private isProviderAllowed(endpoint: string): boolean {
    if (this.allowlist.length === 0) {
      return true;
    }

    try {
      const parsed = new URL(endpoint);
      return this.allowlist.includes(parsed.hostname);
    } catch (error) {
      this.logger.warn({ endpoint, err: error }, 'Email test endpoint invalid');
      return false;
    }
  }

  async sendTestEmail(
    endpoint: string,
    recipients: string[],
    subject: string,
    body: string
  ): Promise<EmailSendResult> {
    if (!this.isProviderAllowed(endpoint)) {
      return {
        success: false,
        error: 'Email provider host not allowed',
        endpoint,
      };
    }

    const start = Date.now();
    try {
      const response: AxiosResponse = await this.httpClient.post(
        endpoint,
        {
          to: recipients,
          subject,
          body,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const duration = Date.now() - start;
      return {
        success: response.status >= 200 && response.status < 300,
        status: response.status,
        responseTimeMs: duration,
        endpoint,
        error: response.status >= 300 ? `HTTP ${response.status}` : undefined,
      };
    } catch (error) {
      this.logger.warn({ err: error, endpoint }, 'Email test execution failed');
      return {
        success: false,
        error: (error as Error).message,
        endpoint,
      };
    }
  }
}

export const emailService = new EmailService();
