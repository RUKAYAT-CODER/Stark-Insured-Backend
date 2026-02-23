import { NotificationChannel } from './notification-channel.interface';

export class SmsChannel implements NotificationChannel {
  async send(to: string, subject: string, message: string, options?: any) {
    // Integrate with SMS provider here (e.g., Twilio, Nexmo)
    // For now, just simulate
    console.log(`[SMS] To: ${to} | ${subject} | ${message}`);
    return { success: true };
  }
}
