import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { NotificationAbstractService, NotificationChannelType } from './notification-abstract.service';

@Processor('notification-queue')
export class NotificationQueueProcessor {
  private notificationService = new NotificationAbstractService();

  @Process()
  async handleNotification(job: Job) {
    const { channel, to, subject, message, options } = job.data;
    try {
      await this.notificationService.send(channel as NotificationChannelType, to, subject, message, options);
      return true;
    } catch (error) {
      // Optionally log error
      throw error;
    }
  }
}
