import { Controller, Get } from '@nestjs/common';
import { 
  HealthCheckService, 
  TypeOrmHealthIndicator, 
  HealthCheck, 
  PrismaHealthIndicator, 
  MicroserviceHealthIndicator 
} from '@nestjs/terminus';
import { IndexerHealthIndicator } from './indicators/indexer.health';
import { PrismaService } from '../prisma.service';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private typeorm: TypeOrmHealthIndicator,
    private prisma: PrismaHealthIndicator,
    private prismaService: PrismaService,
    private indexer: IndexerHealthIndicator,
    private microservice: MicroserviceHealthIndicator,
    private config: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    const checks: any[] = [
      () => this.typeorm.pingCheck('typeorm', { timeout: 1000 }),
      () => this.prisma.isHealthy('prisma', this.prismaService),
      () => this.indexer.isHealthy('indexer_rpc'),
    ];

    // Check Redis if host/port defined
    const redisHost = this.config.get<string>('REDIS_HOST');
    const redisPort = this.config.get<number>('REDIS_PORT');
    
    if (redisHost && redisPort) {
      checks.push(() => this.microservice.pingCheck('redis', {
        transport: Transport.REDIS,
        options: {
          host: redisHost,
          port: redisPort,
          password: this.config.get<string>('REDIS_PASSWORD'),
        },
      }));
    }

    return this.health.check(checks);
  }
}
