import axios from 'axios';
import { EmailService } from '../../../src/services/action-tests/EmailService';

jest.mock('axios');

describe('EmailService', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env['EMAIL_TEST_ALLOWLIST_HOSTS'] = '';
    process.env['EMAIL_TEST_TIMEOUT_MS'] = '100';
  });

  it('sends test email and reports success', async () => {
    const postMock = jest.fn().mockResolvedValue({ status: 200 });
    mockedAxios.create.mockReturnValue({
      post: postMock,
      interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    } as any);

    const service = new EmailService();
    const result = await service.sendTestEmail(
      'https://email-provider.test/send',
      ['user@example.com'],
      'Subject',
      'body'
    );

    expect(result.success).toBe(true);
    expect(result.status).toBe(200);
    expect(postMock).toHaveBeenCalledTimes(1);
    const [url, payload] = postMock.mock.calls[0];
    expect(url).toBe('https://email-provider.test/send');
    expect(payload).toEqual({ to: ['user@example.com'], subject: 'Subject', body: 'body' });
  });

  it('returns failure when provider responds with error status', async () => {
    const postMock = jest.fn().mockResolvedValue({ status: 500 });
    mockedAxios.create.mockReturnValue({
      post: postMock,
      interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    } as any);

    const service = new EmailService();
    const result = await service.sendTestEmail(
      'https://email-provider.test/send',
      ['user@example.com'],
      'Subject',
      'body'
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('HTTP 500');
  });

  it('blocks endpoints outside allowlist', async () => {
    process.env['EMAIL_TEST_ALLOWLIST_HOSTS'] = 'allowed.mail';
    const postMock = jest.fn();
    mockedAxios.create.mockReturnValue({
      post: postMock,
      interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    } as any);

    const service = new EmailService();
    const result = await service.sendTestEmail(
      'https://blocked.mail/send',
      ['user@example.com'],
      'Subject',
      'body'
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('not allowed');
    expect(postMock).not.toHaveBeenCalled();
  });
});
