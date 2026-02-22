import { EmailChannel } from './channels/email-channel';
import { SmsChannel } from './channels/sms-channel';
import { PushChannel } from './channels/push-channel';
import { NotificationChannel } from './channels/notification-channel.interface';

export type NotificationChannelType = 'email' | 'sms' | 'push';

export class NotificationAbstractService {
  private channels: Record<NotificationChannelType, NotificationChannel> = {
    email: new EmailChannel(),
    sms: new SmsChannel(),
    push: new PushChannel(),
  };

  async send(
    channel: NotificationChannelType,
    to: string,
    subject: string,
    message: string,
    options?: any
  ) {
    const handler = this.channels[channel];
    if (!handler) throw new Error(`Channel ${channel} not supported`);
    return handler.send(to, subject, message, options);
  }
}
