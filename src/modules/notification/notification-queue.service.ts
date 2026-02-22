import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { NotificationChannelType } from './notification-abstract.service';

@Injectable()
export class NotificationQueueService {
  constructor(@InjectQueue('notification-queue') private queue: Queue) {}

  async enqueueNotification(
    channel: NotificationChannelType,
    to: string,
    subject: string,
    message: string,
    options?: any,
    attempts = 3
  ) {
    return this.queue.add(
      { channel, to, subject, message, options },
      { attempts, backoff: { type: 'exponential', delay: 5000 } }
    );
  }
}
