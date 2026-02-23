import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StripeService } from './payments/stripe.service';
import { ReconciliationService } from './payments/reconciliation.service';
import { IdempotencyService } from './payments/idempotency.service';
import { WebhookController } from './payments/webhook.controller';
import { AuditLoggingService } from './payments/audit-logging.service';

@Module({
  imports: [],
  controllers: [AppController, WebhookController],
  providers: [AppService, StripeService, ReconciliationService, IdempotencyService, AuditLoggingService],
})
export class AppModule {}
