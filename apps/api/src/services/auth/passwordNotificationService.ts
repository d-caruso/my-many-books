import * as AWS from 'aws-sdk';
import { getLogger } from '@my-many-books/shared-logging';

type PasswordNotificationType = 'change' | 'reset';

export interface PasswordNotificationInput {
  email: string;
  locale?: string;
  type: PasswordNotificationType;
}

export interface SesClientLike {
  sendEmail(params: AWS.SES.SendEmailRequest): {
    promise(): Promise<unknown>;
  };
}

const PASSWORD_NOTIFICATION_FROM_EMAIL_ENV = 'PASSWORD_NOTIFICATION_FROM_EMAIL';
const DEFAULT_AWS_REGION = 'us-east-1';

const createDefaultSesClient = (): SesClientLike => {
  const sesConstructor = (AWS as unknown as { SES?: new (config: { region: string }) => SesClientLike }).SES;
  if (typeof sesConstructor !== 'function') {
    return {
      sendEmail: () => ({
        promise: async () => undefined,
      }),
    };
  }

  return new sesConstructor({
    region: process.env['AWS_REGION'] || DEFAULT_AWS_REGION,
  });
};

const buildNotificationSubject = (type: PasswordNotificationType, isItalian: boolean): string => {
  if (type === 'reset') {
    return isItalian
      ? 'Password reimpostata - My Many Books'
      : 'Password reset completed - My Many Books';
  }

  return isItalian
    ? 'Password aggiornata - My Many Books'
    : 'Password changed - My Many Books';
};

const buildNotificationText = (type: PasswordNotificationType, isItalian: boolean): string => {
  if (type === 'reset') {
    return isItalian
      ? 'La password del tuo account My Many Books è stata reimpostata con successo. Se non hai eseguito tu questa operazione, contatta subito il supporto.'
      : 'Your My Many Books account password was reset successfully. If you did not perform this action, contact support immediately.';
  }

  return isItalian
    ? 'La password del tuo account My Many Books è stata modificata con successo. Se non hai eseguito tu questa operazione, contatta subito il supporto.'
    : 'Your My Many Books account password was changed successfully. If you did not perform this action, contact support immediately.';
};

export class PasswordNotificationService {
  constructor(private readonly sesClient: SesClientLike = createDefaultSesClient()) {}

  async sendPasswordSecurityNotification(input: PasswordNotificationInput): Promise<void> {
    const sourceEmail = process.env[PASSWORD_NOTIFICATION_FROM_EMAIL_ENV];
    if (!sourceEmail) {
      getLogger().warn(
        { envVar: PASSWORD_NOTIFICATION_FROM_EMAIL_ENV },
        'Password notification skipped: source email not configured'
      );
      return;
    }

    const normalizedLocale = input.locale?.trim().toLowerCase() || 'en';
    const isItalian = normalizedLocale.startsWith('it');
    const subject = buildNotificationSubject(input.type, isItalian);
    const textBody = buildNotificationText(input.type, isItalian);

    const destinationAddress = input.email.trim().toLowerCase();

    await this.sesClient.sendEmail({
      Source: sourceEmail,
      Destination: {
        ToAddresses: [destinationAddress],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: textBody,
            Charset: 'UTF-8',
          },
        },
      },
    }).promise();
  }
}

export const passwordNotificationService = new PasswordNotificationService();
