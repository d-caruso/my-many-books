import axios, { AxiosInstance, AxiosError } from 'axios';
import { getLogger } from '@my-many-books/shared-logging';

interface SmsExecutionResult {
  success: boolean;
  status?: number;
  error?: string;
  responseTimeMs?: number;
}

export class SmsService {
  private readonly httpClient: AxiosInstance;
  private readonly timeoutMs: number;
  private readonly allowedHosts: string[];
  private readonly logger = getLogger();

  constructor() {
    this.timeoutMs = Number(process.env['SMS_TEST_TIMEOUT_MS'] ?? '5000');
    const hosts = process.env['SMS_TEST_ALLOWLIST'] ?? '';
    this.allowedHosts = hosts
      .split(',')
      .map(host => host.trim())
      .filter(Boolean);

    this.httpClient = axios.create({
      timeout: this.timeoutMs,
      validateStatus: () => true,
    });
  }

  private isHostAllowed(url: string): boolean {
    if (this.allowedHosts.length === 0) {
      return true;
    }

    try {
      const parsed = new URL(url);
      return this.allowedHosts.includes(parsed.hostname);
    } catch (error) {
      this.logger.warn({ err: error, url }, 'Invalid SMS test endpoint');
      return false;
    }
  }

  async sendTestSms(
    endpoint: string,
    recipients: string[],
    body: string
  ): Promise<SmsExecutionResult> {
    if (!this.isHostAllowed(endpoint)) {
      return { success: false, error: 'SMS endpoint host not allowed' };
    }

    const start = Date.now();
    try {
      const response = await this.httpClient.post(endpoint, {
        recipients,
        body,
      });
      const duration = Date.now() - start;
      return {
        success: response.status >= 200 && response.status < 300,
        status: response.status,
        responseTimeMs: duration,
        error: response.status >= 300 ? `HTTP ${response.status}` : undefined,
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.warn({ err: error, endpoint }, 'SMS test failed');
      return {
        success: false,
        error: axiosError.message,
      };
    }
  }
}

export const smsService = new SmsService();
