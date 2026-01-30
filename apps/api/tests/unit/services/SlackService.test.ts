import axios from 'axios';
import { SlackService } from '../../../src/services/SlackService';

jest.mock('axios');

describe('SlackService', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env['SLACK_TEST_ALLOWLIST_HOSTS'] = '';
    process.env['SLACK_TEST_TIMEOUT_MS'] = '100';
  });

  it('posts to Slack webhook and reports success', async () => {
    const postMock = jest.fn().mockResolvedValue({ status: 200 });
    mockedAxios.create.mockReturnValue({
      post: postMock,
      interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    } as any);

    const service = new SlackService();
    const result = await service.postTestMessage('https://hooks.slack.com/services/TOKEN', {
      foo: 'bar',
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe(200);
    expect(postMock).toHaveBeenCalledWith('https://hooks.slack.com/services/TOKEN', expect.any(Object));
  });

  it('handles Slack webhook error responses', async () => {
    const postMock = jest.fn().mockResolvedValue({ status: 502 });
    mockedAxios.create.mockReturnValue({
      post: postMock,
      interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    } as any);

    const service = new SlackService();
    const result = await service.postTestMessage('https://hooks.slack.com/services/TOKEN', {});

    expect(result.success).toBe(false);
    expect(result.error).toContain('HTTP 502');
  });

  it('blocks Slack webhook URLs outside the allowlist', async () => {
    process.env['SLACK_TEST_ALLOWLIST_HOSTS'] = 'allowed.slack.com';
    const postMock = jest.fn();
    mockedAxios.create.mockReturnValue({
      post: postMock,
      interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    } as any);

    const service = new SlackService();
    const result = await service.postTestMessage('https://hooks.slack.com/services/TOKEN', {});

    expect(result.success).toBe(false);
    expect(result.error).toContain('not allowed');
    expect(postMock).not.toHaveBeenCalled();
  });
});
