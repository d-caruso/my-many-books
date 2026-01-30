import axios from 'axios';
import { SmsService } from '../../../src/services/action-tests/SmsService';

jest.mock('axios');

describe('SmsService', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env['SMS_TEST_ALLOWLIST'] = '';
    process.env['SMS_TEST_TIMEOUT_MS'] = '100';
  });

  it('posts to allowed SMS endpoint and reports success', async () => {
    const postMock = jest.fn().mockResolvedValue({ status: 200 });
    mockedAxios.create.mockReturnValue({
      post: postMock,
      interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    } as any);

    const service = new SmsService();
    const result = await service.sendTestSms('https://sms.example.com/send', ['+123'], 'payload');

    expect(result.success).toBe(true);
    expect(postMock).toHaveBeenCalledWith(
      'https://sms.example.com/send',
      { recipients: ['+123'], body: 'payload' }
    );
  });

  it('reports failure when SMS provider errors', async () => {
    const postMock = jest.fn().mockResolvedValue({ status: 500 });
    mockedAxios.create.mockReturnValue({
      post: postMock,
      interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    } as any);

    const service = new SmsService();
    const result = await service.sendTestSms('https://sms.example.com/send', ['+123'], 'payload');

    expect(result.success).toBe(false);
    expect(result.error).toContain('HTTP 500');
  });

  it('blocks endpoints not in allowlist', async () => {
    process.env['SMS_TEST_ALLOWLIST'] = 'allowed.sms';
    const postMock = jest.fn();
    mockedAxios.create.mockReturnValue({
      post: postMock,
      interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    } as any);

    const service = new SmsService();
    const result = await service.sendTestSms('https://blocked.sms/send', ['+123'], 'payload');

    expect(result.success).toBe(false);
    expect(result.error).toContain('not allowed');
    expect(postMock).not.toHaveBeenCalled();
  });
});
