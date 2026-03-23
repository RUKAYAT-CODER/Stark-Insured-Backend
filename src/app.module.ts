import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { UserController } from './user.controller';
import { AppService } from './app.service';
import { validateEnv } from './config/env.validation';
import { ReputationModule } from './reputation/reputation.module';
import { DatabaseModule } from './database.module';
import { IndexerModule } from './indexer/indexer.module';
import { NotificationModule } from './notification/notification.module';
import { GovernanceModule } from './governance/governance.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),
    ReputationModule,
    DatabaseModule,
    IndexerModule,
    NotificationModule,
    GovernanceModule,
  ],
  controllers: [AppController, UserController],
  providers: [AppService],
})
export class AppModule {}
