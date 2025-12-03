import { HookAction, HookActionContext } from '../types';
import { replaceTemplateVariables } from '../utils/templateEngine';

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

/**
 * Default email service implementation
 * This is a mock implementation that logs emails to console
 * In production, replace with actual email service (nodemailer, SendGrid, etc.)
 */
export class ConsoleEmailService implements EmailService {
  async sendEmail(options: {
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject: string;
    body: string;
    from?: string;
  }): Promise<void> {
    console.log('[EmailService] Sending email:');
    console.log('  From:', options.from || 'noreply@example.com');
    console.log('  To:', Array.isArray(options.to) ? options.to.join(', ') : options.to);
    if (options.cc) {
      console.log('  CC:', Array.isArray(options.cc) ? options.cc.join(', ') : options.cc);
    }
    if (options.bcc) {
      console.log('  BCC:', Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc);
    }
    console.log('  Subject:', options.subject);
    console.log('  Body:', options.body);
  }
}

export class EmailAction implements HookAction {
  constructor(
    private readonly config: EmailActionConfig,
    private readonly emailService: EmailService = new ConsoleEmailService()
  ) {}

  async execute(context: HookActionContext): Promise<void> {
    // Extract data from context payload
    const data = (context.payload as Record<string, unknown>) || {};

    // Replace template variables in subject and template
    const subject = replaceTemplateVariables(this.config.subject, data);
    const body = replaceTemplateVariables(this.config.template, data);

    // Process recipient fields (to, cc, bcc) for template variables
    const to = this.processRecipients(this.config.to, data);
    const cc = this.config.cc ? this.processRecipients(this.config.cc, data) : undefined;
    const bcc = this.config.bcc ? this.processRecipients(this.config.bcc, data) : undefined;

    // Send email via email service
    await this.emailService.sendEmail({
      to,
      cc,
      bcc,
      subject,
      body,
      from: this.config.from,
    });
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
