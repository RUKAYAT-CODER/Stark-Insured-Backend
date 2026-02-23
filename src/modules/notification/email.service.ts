import * as nodemailer from 'nodemailer';
import { EmailTemplateService } from './email-template.service';

export class EmailService {
  private transporter: nodemailer.Transporter;
  private templateService: EmailTemplateService;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    this.templateService = new EmailTemplateService();
  }

  async sendTemplateMail(to: string, subject: string, template: string, context: Record<string, any>) {
    const html = this.templateService.render(template, context);
    return this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'no-reply@example.com',
      to,
      subject,
      html,
    });
  }
}
