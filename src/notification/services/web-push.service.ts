import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);

  constructor(private readonly configService: ConfigService) {
    const publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.configService.get<string>('VAPID_SUBJECT_EMAIL');

    if (publicKey && privateKey) {
      webpush.setVapidDetails(
        `mailto:${subject}`,
        publicKey,
        privateKey,
      );
    } else {
      this.logger.warn('VAPID keys not set. Web push notifications will not work.');
    }
  }

  async sendNotification(subscription: webpush.PushSubscription, payload: any): Promise<void> {
    try {
      if (!this.configService.get<string>('VAPID_PUBLIC_KEY')) return;

      await webpush.sendNotification(subscription, JSON.stringify(payload));
      this.logger.log(`Push notification sent to endpoint: ${subscription.endpoint}`);
    } catch (error) {
      this.logger.error(`Failed to send push notification: ${error.message}`);
      // Consider handling expired subscriptions (HTTP 410) by deleting them from the DB
      throw error;
    }
  }
}
