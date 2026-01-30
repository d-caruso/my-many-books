import axios, { AxiosError, AxiosInstance } from 'axios';
import { getLogger } from '@my-many-books/shared-logging';

interface SlackExecutionResult {
  success: boolean;
  status?: number;
  error?: string;
  responseTimeMs?: number;
}

export class SlackService {
  private readonly axiosClient: AxiosInstance;
  private readonly allowlist: string[];
  private readonly timeoutMs: number;
  private readonly logger = getLogger();

  constructor() {
    this.timeoutMs = Number(process.env['SLACK_TEST_TIMEOUT_MS'] ?? '5000');
    const hosts = process.env['SLACK_TEST_ALLOWLIST_HOSTS'] ?? '';
    this.allowlist = hosts
      .split(',')
      .map(host => host.trim())
      .filter(Boolean);
    this.axiosClient = axios.create({
      timeout: this.timeoutMs,
      validateStatus: () => true,
    });
  }

  private isAllowedWebhook(url: string): boolean {
    if (this.allowlist.length === 0) {
      return true;
    }

    try {
      const parsed = new URL(url);
      return this.allowlist.includes(parsed.hostname);
    } catch (error) {
      this.logger.warn({ err: error, url }, 'Invalid Slack webhook URL');
      return false;
    }
  }

  async postTestMessage(
    webhookUrl: string,
    payload: Record<string, unknown>
  ): Promise<SlackExecutionResult> {
    if (!this.isAllowedWebhook(webhookUrl)) {
      return {
        success: false,
        error: 'Slack webhook host not allowed',
      };
    }

    const start = Date.now();
    try {
      const response = await this.axiosClient.post(webhookUrl, {
        text: `[TEST] Mobile hook alert\n${JSON.stringify(payload)}`,
      });
      const responseTime = Date.now() - start;
      return {
        success: response.status >= 200 && response.status < 300,
        status: response.status,
        responseTimeMs: responseTime,
        error: response.status >= 300 ? `HTTP ${response.status}` : undefined,
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.warn({ err: error }, 'Slack webhook test failed');
      return {
        success: false,
        error: axiosError.message,
      };
    }
  }
}

export const slackService = new SlackService();
