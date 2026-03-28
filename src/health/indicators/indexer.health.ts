import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { IndexerService } from '../../indexer/services/indexer.service';
import { rpc as SorobanRpc } from 'stellar-sdk';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class IndexerHealthIndicator extends HealthIndicator {
  private readonly rpc: SorobanRpc.Server;

  constructor(
    private readonly configService: ConfigService,
    private readonly indexerService: IndexerService,
  ) {
    super();
    const rpcUrl = this.configService.get<string>(
      'STELLAR_RPC_URL',
      'https://soroban-testnet.stellar.org',
    );
    this.rpc = new SorobanRpc.Server(rpcUrl, {
      allowHttp: rpcUrl.startsWith('http://'),
    });
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const health = await this.rpc.getHealth();
      const isHealthy = health.status === 'healthy';
      
      const result = this.getStatus(key, isHealthy, { 
        rpcStatus: health.status,
        network: this.configService.get<string>('STELLAR_NETWORK', 'testnet'),
      });

      if (isHealthy) {
        return result;
      }
      
      throw new HealthCheckError('Indexer RPC reported unhealthy status', result);
    } catch (error) {
      const result = this.getStatus(key, false, { message: error.message });
      throw new HealthCheckError('Indexer health check failed', result);
    }
  }
}
