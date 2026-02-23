import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

import { Notification } from './notification.entity';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationPreferences } from './notification-preferences.entity';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationQueueProcessor } from './notification-queue.processor';
import { NotificationQueueService } from './notification-queue.service';
import {
  ClaimEventListeners,
  PolicyEventListeners,
  DaoEventListeners,
} from './listeners';

/**
 * NotificationModule handles notification creation via event listeners.
 * Does NOT import business modules - communication is purely event-driven.
 * Now integrated with TypeORM for persistence.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationPreferences]),
    BullModule.registerQueue({
      name: 'notification-queue',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    }),
  ],
  controllers: [NotificationController, NotificationPreferencesController],
  providers: [
    NotificationService,
    NotificationPreferencesService,
    NotificationQueueProcessor,
    NotificationQueueService,
    ClaimEventListeners,
    PolicyEventListeners,
    DaoEventListeners,
  ],
  exports: [NotificationService, NotificationPreferencesService, NotificationQueueService],
})
export class NotificationModule {}
