import { Module, MiddlewareConsumer, RequestMethod, Global } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SecurityPolicyService } from './services/security-policy.service';
import { SecurityStorageService } from './services/security-storage.service';
import { ThreatIntelligenceService } from './services/threat-intelligence.service';
import { DdosGuard } from './guards/ddos.guard';
import { WafMiddleware } from './middleware/waf.middleware';
import { SecurityController } from './controllers/security.controller';

@Global()
@Module({
  controllers: [SecurityController],
  providers: [
    SecurityPolicyService,
    SecurityStorageService,
    ThreatIntelligenceService,
    {
      provide: APP_GUARD,
      useClass: DdosGuard,
    },
  ],
  exports: [SecurityPolicyService, SecurityStorageService],
})
export class SecurityModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(WafMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}