import { EmailAction, EmailService, EmailActionConfig, ConsoleEmailService } from '../EmailAction';
import { HookActionContext } from '../../types';

// Mock email service for testing
class MockEmailService implements EmailService {
  public sentEmails: Array<{
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject: string;
    body: string;
    from?: string;
  }> = [];

  async sendEmail(options: {
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject: string;
    body: string;
    from?: string;
  }): Promise<void> {
    this.sentEmails.push(options);
  }

  reset() {
    this.sentEmails = [];
  }

  getLastEmail() {
    const email = this.sentEmails[this.sentEmails.length - 1];
    if (!email) {
      throw new Error('Expected at least one sent email');
    }
    return email;
  }
}

describe('EmailAction', () => {
  let mockEmailService: MockEmailService;

  beforeEach(() => {
    mockEmailService = new MockEmailService();
  });

  describe('basic email sending', () => {
    it('sends email with simple config', async () => {
      const config: EmailActionConfig = {
        to: 'user@example.com',
        subject: 'Test Subject',
        template: 'Test Body',
      };

      const action = new EmailAction(config, mockEmailService);
      const context: HookActionContext = {
        eventName: 'test.event',
        payload: {},
      };

      await action.execute(context);

      expect(mockEmailService.sentEmails).toHaveLength(1);
      const email = mockEmailService.getLastEmail();
      expect(email.to).toBe('user@example.com');
      expect(email.subject).toBe('Test Subject');
      expect(email.body).toBe('Test Body');
    });

    it('sends email with from address', async () => {
      const config: EmailActionConfig = {
        to: 'user@example.com',
        subject: 'Test',
        template: 'Body',
        from: 'sender@example.com',
      };

      const action = new EmailAction(config, mockEmailService);
      await action.execute({ eventName: 'test', payload: {} });

      const email = mockEmailService.getLastEmail();
      expect(email.from).toBe('sender@example.com');
    });

    it('sends email with multiple recipients', async () => {
      const config: EmailActionConfig = {
        to: ['user1@example.com', 'user2@example.com'],
        subject: 'Test',
        template: 'Body',
      };

      const action = new EmailAction(config, mockEmailService);
      await action.execute({ eventName: 'test', payload: {} });

      const email = mockEmailService.getLastEmail();
      expect(email.to).toEqual(['user1@example.com', 'user2@example.com']);
    });

    it('sends email with cc recipients', async () => {
      const config: EmailActionConfig = {
        to: 'user@example.com',
        cc: 'cc@example.com',
        subject: 'Test',
        template: 'Body',
      };

      const action = new EmailAction(config, mockEmailService);
      await action.execute({ eventName: 'test', payload: {} });

      const email = mockEmailService.getLastEmail();
      expect(email.cc).toBe('cc@example.com');
    });

    it('sends email with multiple cc recipients', async () => {
      const config: EmailActionConfig = {
        to: 'user@example.com',
        cc: ['cc1@example.com', 'cc2@example.com'],
        subject: 'Test',
        template: 'Body',
      };

      const action = new EmailAction(config, mockEmailService);
      await action.execute({ eventName: 'test', payload: {} });

      const email = mockEmailService.getLastEmail();
      expect(email.cc).toEqual(['cc1@example.com', 'cc2@example.com']);
    });

    it('sends email with bcc recipients', async () => {
      const config: EmailActionConfig = {
        to: 'user@example.com',
        bcc: ['bcc1@example.com', 'bcc2@example.com'],
        subject: 'Test',
        template: 'Body',
      };

      const action = new EmailAction(config, mockEmailService);
      await action.execute({ eventName: 'test', payload: {} });

      const email = mockEmailService.getLastEmail();
      expect(email.bcc).toEqual(['bcc1@example.com', 'bcc2@example.com']);
    });

    it('sends email with cc and bcc', async () => {
      const config: EmailActionConfig = {
        to: 'user@example.com',
        cc: 'cc@example.com',
        bcc: 'bcc@example.com',
        subject: 'Test',
        template: 'Body',
      };

      const action = new EmailAction(config, mockEmailService);
      await action.execute({ eventName: 'test', payload: {} });

      const email = mockEmailService.getLastEmail();
      expect(email.cc).toBe('cc@example.com');
      expect(email.bcc).toBe('bcc@example.com');
    });
  });

  describe('template variable replacement', () => {
    it('replaces variables in subject', async () => {
      const config: EmailActionConfig = {
        to: 'user@example.com',
        subject: 'Hello {{name}}!',
        template: 'Body',
      };

      const action = new EmailAction(config, mockEmailService);
      const context: HookActionContext = {
        eventName: 'test',
        payload: { name: 'John' },
      };

      await action.execute(context);

      const email = mockEmailService.getLastEmail();
      expect(email.subject).toBe('Hello John!');
    });

    it('replaces variables in template body', async () => {
      const config: EmailActionConfig = {
        to: 'user@example.com',
        subject: 'Test',
        template: 'Hello {{user.name}}, you created a book titled "{{book.title}}"',
      };

      const action = new EmailAction(config, mockEmailService);
      const context: HookActionContext = {
        eventName: 'book.create.after',
        payload: {
          user: { name: 'Jane' },
          book: { title: '1984' },
        },
      };

      await action.execute(context);

      const email = mockEmailService.getLastEmail();
      expect(email.body).toBe('Hello Jane, you created a book titled "1984"');
    });

    it('replaces variables in recipient addresses', async () => {
      const config: EmailActionConfig = {
        to: '{{user.email}}',
        subject: 'Test',
        template: 'Body',
      };

      const action = new EmailAction(config, mockEmailService);
      const context: HookActionContext = {
        eventName: 'test',
        payload: { user: { email: 'jane@example.com' } },
      };

      await action.execute(context);

      const email = mockEmailService.getLastEmail();
      expect(email.to).toBe('jane@example.com');
    });

    it('replaces variables in multiple recipients', async () => {
      const config: EmailActionConfig = {
        to: ['{{user.email}}', 'admin@example.com'],
        subject: 'Test',
        template: 'Body',
      };

      const action = new EmailAction(config, mockEmailService);
      const context: HookActionContext = {
        eventName: 'test',
        payload: { user: { email: 'jane@example.com' } },
      };

      await action.execute(context);

      const email = mockEmailService.getLastEmail();
      expect(email.to).toEqual(['jane@example.com', 'admin@example.com']);
    });

    it('replaces variables in cc recipients', async () => {
      const config: EmailActionConfig = {
        to: 'user@example.com',
        cc: '{{manager.email}}',
        subject: 'Test',
        template: 'Body',
      };

      const action = new EmailAction(config, mockEmailService);
      const context: HookActionContext = {
        eventName: 'test',
        payload: { manager: { email: 'boss@example.com' } },
      };

      await action.execute(context);

      const email = mockEmailService.getLastEmail();
      expect(email.cc).toBe('boss@example.com');
    });

    it('handles multiple variables in subject and body', async () => {
      const config: EmailActionConfig = {
        to: 'user@example.com',
        subject: 'Book {{book.title}} by {{book.author}}',
        template: 'Hello {{user.name}}, your book "{{book.title}}" has {{book.pages}} pages.',
      };

      const action = new EmailAction(config, mockEmailService);
      const context: HookActionContext = {
        eventName: 'book.create.after',
        payload: {
          user: { name: 'Alice' },
          book: { title: 'Brave New World', author: 'Huxley', pages: 311 },
        },
      };

      await action.execute(context);

      const email = mockEmailService.getLastEmail();
      expect(email.subject).toBe('Book Brave New World by Huxley');
      expect(email.body).toBe('Hello Alice, your book "Brave New World" has 311 pages.');
    });

    it('keeps placeholder for missing variables', async () => {
      const config: EmailActionConfig = {
        to: 'user@example.com',
        subject: 'Hello {{name}}!',
        template: 'Book: {{book.title}}',
      };

      const action = new EmailAction(config, mockEmailService);
      const context: HookActionContext = {
        eventName: 'test',
        payload: {},
      };

      await action.execute(context);

      const email = mockEmailService.getLastEmail();
      expect(email.subject).toBe('Hello {{name}}!');
      expect(email.body).toBe('Book: {{book.title}}');
    });
  });

  describe('edge cases', () => {
    it('handles empty payload', async () => {
      const config: EmailActionConfig = {
        to: 'user@example.com',
        subject: 'Test',
        template: 'Body',
      };

      const action = new EmailAction(config, mockEmailService);
      const context: HookActionContext = {
        eventName: 'test',
      };

      await action.execute(context);

      expect(mockEmailService.sentEmails).toHaveLength(1);
      const email = mockEmailService.getLastEmail();
      expect(email.subject).toBe('Test');
      expect(email.body).toBe('Body');
    });

    it('handles undefined payload', async () => {
      const config: EmailActionConfig = {
        to: 'user@example.com',
        subject: 'Test',
        template: 'Body',
      };

      const action = new EmailAction(config, mockEmailService);
      const context: HookActionContext = {
        eventName: 'test',
        payload: undefined,
      };

      await action.execute(context);

      expect(mockEmailService.sentEmails).toHaveLength(1);
    });

    it('handles complex nested data', async () => {
      const config: EmailActionConfig = {
        to: '{{user.contact.email}}',
        subject: 'Book by {{book.author.name}}',
        template: 'Published: {{book.metadata.publishDate}}',
      };

      const action = new EmailAction(config, mockEmailService);
      const context: HookActionContext = {
        eventName: 'test',
        payload: {
          user: { contact: { email: 'deep@example.com' } },
          book: {
            author: { name: 'Orwell' },
            metadata: { publishDate: '1949' },
          },
        },
      };

      await action.execute(context);

      const email = mockEmailService.getLastEmail();
      expect(email.to).toBe('deep@example.com');
      expect(email.subject).toBe('Book by Orwell');
      expect(email.body).toBe('Published: 1949');
    });
  });

  describe('ConsoleEmailService', () => {
    it('logs email to console', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const service = new ConsoleEmailService();
      await service.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        body: 'Body',
      });

      expect(consoleSpy).toHaveBeenCalledWith('[EmailService] Sending email:');
      expect(consoleSpy).toHaveBeenCalledWith('  To:', 'user@example.com');
      expect(consoleSpy).toHaveBeenCalledWith('  Subject:', 'Test');
      expect(consoleSpy).toHaveBeenCalledWith('  Body:', 'Body');

      consoleSpy.mockRestore();
    });

    it('logs from address or default', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const service = new ConsoleEmailService();
      await service.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        body: 'Body',
        from: 'custom@example.com',
      });

      expect(consoleSpy).toHaveBeenCalledWith('  From:', 'custom@example.com');

      consoleSpy.mockRestore();
    });
  });
});
