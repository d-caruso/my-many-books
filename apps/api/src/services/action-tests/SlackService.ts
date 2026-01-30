import { ActionTestResult } from './ActionTestResult';
import { AbstractActionService } from './AbstractActionService';

export class SlackService extends AbstractActionService {
  constructor() {
    super(
      Number(process.env['SLACK_TEST_TIMEOUT_MS'] ?? '5000'),
      process.env['SLACK_TEST_ALLOWLIST_HOSTS']
    );
  }

  async postTestMessage(webhookUrl: string, payload: Record<string, unknown>): Promise<ActionTestResult> {
    if (!this.isHostAllowed(webhookUrl)) {
      return {
        success: false,
        error: 'Slack webhook host not allowed',
      };
    }

    const start = Date.now();
    const response = await this.httpClient.post(webhookUrl, {
      text: `[TEST] Mobile hook alert\n${JSON.stringify(payload)}`,
    });
    const duration = Date.now() - start;

    return {
      success: response.status >= 200 && response.status < 300,
      status: response.status,
      responseTimeMs: duration,
      error: response.status >= 300 ? `HTTP ${response.status}` : undefined,
    };
  }
}

export const slackService = new SlackService();
