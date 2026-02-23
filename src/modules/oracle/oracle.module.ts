import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OracleController } from './oracle.controller';
import { OracleService } from './oracle.service';
import { OracleData } from './entities/oracle-data.entity';
import { OracleAuthGuard } from './guards/oracle-auth.guard';
import { ConfigModule } from '../../config/config.module';
import { ExternalServiceClient } from '../../common/services/external-service.client';

@Module({
  imports: [
    TypeOrmModule.forFeature([OracleData]),
    ConfigModule,
  ],
  controllers: [OracleController],
  providers: [OracleService, OracleAuthGuard, ExternalServiceClient],
  exports: [OracleService],
})
export class OracleModule {}
