import { PasswordNotificationService } from '../../../src/services/auth/passwordNotificationService';

const warnSpy = jest.fn();

jest.mock('@my-many-books/shared-logging', () => ({
  getLogger: () => ({
    warn: warnSpy,
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('PasswordNotificationService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      PASSWORD_NOTIFICATION_FROM_EMAIL: 'security@my-many-books.test',
      AWS_REGION: 'us-east-1',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('sends English change notification email', async () => {
    const sendPromise = jest.fn().mockResolvedValue(undefined);
    const sendEmail = jest.fn().mockReturnValue({ promise: sendPromise });
    const service = new PasswordNotificationService({ sendEmail });

    await service.sendPasswordSecurityNotification({
      email: 'USER@Example.COM',
      type: 'change',
      locale: 'en',
    });

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        Source: 'security@my-many-books.test',
        Destination: { ToAddresses: ['user@example.com'] },
        Message: expect.objectContaining({
          Subject: expect.objectContaining({
            Data: 'Password changed - My Many Books',
          }),
        }),
      })
    );
    expect(sendPromise).toHaveBeenCalledTimes(1);
  });

  it('sends Italian reset notification email', async () => {
    const sendEmail = jest.fn().mockReturnValue({ promise: jest.fn().mockResolvedValue(undefined) });
    const service = new PasswordNotificationService({ sendEmail });

    await service.sendPasswordSecurityNotification({
      email: 'utente@example.com',
      type: 'reset',
      locale: 'it-IT',
    });

    const params = sendEmail.mock.calls[0][0];
    expect(params.Message.Subject.Data).toBe('Password reimpostata - My Many Books');
  });

  it('skips sending when source email is not configured', async () => {
    delete process.env['PASSWORD_NOTIFICATION_FROM_EMAIL'];

    const sendEmail = jest.fn().mockReturnValue({ promise: jest.fn().mockResolvedValue(undefined) });
    const service = new PasswordNotificationService({ sendEmail });

    await service.sendPasswordSecurityNotification({
      email: 'user@example.com',
      type: 'change',
    });

    expect(sendEmail).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });
});
