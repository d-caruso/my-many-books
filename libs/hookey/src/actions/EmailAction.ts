import { HookAction, HookActionContext } from '../types';
import { replaceTemplateVariables, toTemplateData } from '../utils/templateEngine';
import { getLogger, type AppLogger } from '@my-many-books/shared-logging';

export interface EmailActionConfig {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  template: string;
  from?: string;
}

export interface EmailService {
  sendEmail(options: {
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject: string;
    body: string;
    from?: string;
  }): Promise<void>;
}

const EMAIL_LOG_PREFIX = '[EmailService]';
const DEFAULT_FROM_ADDRESS = 'noreply@example.com';
const RECIPIENT_SEPARATOR = ', ';

function formatRecipients(value: string | string[]): string {
  return Array.isArray(value) ? value.join(RECIPIENT_SEPARATOR) : value;
}

/**
 * Default email service implementation
 * This is a mock implementation that logs emails through shared logging
 * In production, replace with actual email service (nodemailer, SendGrid, etc.)
 */
export class ConsoleEmailService implements EmailService {
  private readonly logger: AppLogger;

  constructor(logger: AppLogger = getLogger()) {
    this.logger = logger;
  }

  sendEmail(options: {
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject: string;
    body: string;
    from?: string;
  }): Promise<void> {
    this.logger.info(
      {
        from: options.from ?? DEFAULT_FROM_ADDRESS,
        to: formatRecipients(options.to),
        cc: options.cc ? formatRecipients(options.cc) : undefined,
        bcc: options.bcc ? formatRecipients(options.bcc) : undefined,
        subject: options.subject,
        body: options.body,
      },
      `${EMAIL_LOG_PREFIX} Sending email`
    );
    return Promise.resolve();
  }
}

export class EmailAction implements HookAction {
  constructor(
    private readonly config: EmailActionConfig,
    private readonly emailService: EmailService = new ConsoleEmailService()
  ) {}

  async execute(context: HookActionContext): Promise<void> {
    // Extract data from context payload
    const data = toTemplateData(context.payload);

    // Replace template variables in subject and template
    const subject = replaceTemplateVariables(this.config.subject, data);
    const body = replaceTemplateVariables(this.config.template, data);

    // Process recipient fields (to, cc, bcc) for template variables
    const to = this.processRecipients(this.config.to, data);
    const cc = this.config.cc ? this.processRecipients(this.config.cc, data) : undefined;
    const bcc = this.config.bcc ? this.processRecipients(this.config.bcc, data) : undefined;

    const emailPayload: Parameters<EmailService['sendEmail']>[0] = {
      to,
      subject,
      body,
    };

    if (cc !== undefined) {
      emailPayload.cc = cc;
    }

    if (bcc !== undefined) {
      emailPayload.bcc = bcc;
    }

    if (this.config.from !== undefined) {
      emailPayload.from = this.config.from;
    }

    // Send email via email service
    await this.emailService.sendEmail(emailPayload);
  }

  /**
   * Process recipient field (to/cc/bcc) to replace template variables
   */
  private processRecipients(
    recipients: string | string[],
    data: Record<string, unknown>
  ): string | string[] {
    if (Array.isArray(recipients)) {
      return recipients.map((recipient) => replaceTemplateVariables(recipient, data));
    }
    return replaceTemplateVariables(recipients, data);
  }
}
