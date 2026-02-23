import { NotificationChannel } from './notification-channel.interface';
import { EmailService } from '../email.service';

export class EmailChannel implements NotificationChannel {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  async send(to: string, subject: string, message: string, options?: any) {
    // If options.template is provided, use template
    if (options?.template && options?.context) {
      return this.emailService.sendTemplateMail(to, subject, options.template, options.context);
    }
    // Otherwise, send raw HTML/text
    return this.emailService.sendTemplateMail(to, subject, 'raw', { html: message });
  }
}
