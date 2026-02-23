import { NotificationChannel } from './notification-channel.interface';

export class PushChannel implements NotificationChannel {
  async send(to: string, subject: string, message: string, options?: any) {
    // Integrate with push notification provider here (e.g., Firebase, OneSignal)
    // For now, just simulate
    console.log(`[PUSH] To: ${to} | ${subject} | ${message}`);
    return { success: true };
  }
}
