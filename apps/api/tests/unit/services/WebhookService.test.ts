import axios from 'axios';
jest.mock('axios');

describe('WebhookService', () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env['WEBHOOK_TEST_ALLOWLIST_HOSTS'] = '';
    process.env['WEBHOOK_TEST_TIMEOUT_MS'] = '100';
    process.env['WEBHOOK_TEST_RETRY_ATTEMPTS'] = '2';
  });

  it('executes allowed endpoints and reports success', async () => {
    mockedAxios.create.mockReturnValue({
      post: jest.fn().mockResolvedValue({ status: 200 }),
      interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    } as any);

    const service = new (require('../../../src/services/action-tests/WebhookService').WebhookService)();
    const results = await service.executeTestEndpoints(['https://hooks.test/success'], { foo: 'bar' });

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(results[0].status).toBe(200);
  });

  it('retries on failure and reports last error', async () => {
    const postMock = jest.fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ status: 500 });

    mockedAxios.create.mockReturnValue({
      post: postMock,
      interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    } as any);

    const service = new (require('../../../src/services/action-tests/WebhookService').WebhookService)();
    const results = await service.executeTestEndpoints(['https://hooks.test/retry'], {});

    expect(postMock).toHaveBeenCalledTimes(2);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toContain('HTTP 500');
  });

  it('blocks endpoints not in allowlist', async () => {
    process.env['WEBHOOK_TEST_ALLOWLIST_HOSTS'] = 'allowed.example.com';

    mockedAxios.create.mockReturnValue({
      post: jest.fn(),
      interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    } as any);

    const service = new (require('../../../src/services/action-tests/WebhookService').WebhookService)();
    const results = await service.executeTestEndpoints(['https://blocked.example.com/hook'], {});

    expect(results[0].success).toBe(false);
    expect(results[0].error).toContain('allowlist');
    expect(mockedAxios.create().post).not.toHaveBeenCalled();
  });
});
