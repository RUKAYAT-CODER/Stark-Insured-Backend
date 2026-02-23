import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class QueueHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(QueueHealthIndicator.name);
  private client: any;

  constructor(private readonly configService: ConfigService) {
    super();
    this.initializeClient();
  }

  private initializeClient() {
    try {
      this.client = ClientProxyFactory.create({
        transport: Transport.RMQ,
        options: {
          urls: [this.configService.get<string>('RABBITMQ_URL', 'amqp://admin:admin@localhost:5672')],
          queue: 'health_check_queue',
          queueOptions: {
            durable: false,
            autoDelete: true,
          },
        },
      });
    } catch (error) {
      this.logger.error('Failed to initialize RabbitMQ client for health check', error);
    }
  }

  async isHealthy(key: string = 'queue'): Promise<HealthIndicatorResult> {
    try {
      if (!this.client) {
        return this.getStatus(key, false, {
          status: 'down',
          message: 'Queue client not initialized',
        });
      }

      // Test connection by sending a test message
      const testMessage = { healthCheck: true, timestamp: Date.now() };
      
      // Connect and test
      await this.client.connect();
      
      // Send test message to a temporary queue
      await this.client.emit('health.check', testMessage).toPromise();
      
      return this.getStatus(key, true, {
        status: 'up',
        message: 'Queue service is healthy',
      });
    } catch (error) {
      return this.getStatus(key, false, {
        status: 'down',
        message: `Queue health check failed: ${error.message}`,
      });
    } finally {
      if (this.client) {
        try {
          await this.client.close();
        } catch (error) {
          // Ignore close errors
        }
      }
    }
  }
}