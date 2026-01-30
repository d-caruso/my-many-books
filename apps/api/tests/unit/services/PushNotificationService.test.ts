import axios from 'axios';
import { PushNotificationService } from '../../../src/services/action-tests/PushNotificationService';

jest.mock('axios');

describe('PushNotificationService', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env['PUSH_NOTIFICATION_TEST_ALLOWLIST'] = '';
    process.env['PUSH_NOTIFICATION_TEST_TIMEOUT_MS'] = '100';
  });

  it('posts to allowed endpoint and reports success', async () => {
    const postMock = jest.fn().mockResolvedValue({ status: 200 });
    mockedAxios.create.mockReturnValue({
      post: postMock,
      interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    } as any);

    const service = new PushNotificationService();
    const result = await service.sendTestNotification('https://push.example.com/send', {
      notification: 'test',
    });

    expect(result.success).toBe(true);
    expect(postMock).toHaveBeenCalledWith(
      'https://push.example.com/send',
      expect.any(Object),
      expect.any(Object)
    );
  });

  it('reports failure when provider returns error', async () => {
    const postMock = jest.fn().mockResolvedValue({ status: 500 });
    mockedAxios.create.mockReturnValue({
      post: postMock,
      interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    } as any);

    const service = new PushNotificationService();
    const result = await service.sendTestNotification('https://push.example.com/send', {});

    expect(result.success).toBe(false);
    expect(result.error).toContain('HTTP 500');
  });

  it('blocks endpoints not on the allowlist', async () => {
    process.env['PUSH_NOTIFICATION_TEST_ALLOWLIST'] = 'allowed.push';
    const postMock = jest.fn();
    mockedAxios.create.mockReturnValue({
      post: postMock,
      interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    } as any);

    const service = new PushNotificationService();
    const result = await service.sendTestNotification('https://blocked.push/send', {});

    expect(result.success).toBe(false);
    expect(result.error).toContain('not allowed');
    expect(postMock).not.toHaveBeenCalled();
  });
});
