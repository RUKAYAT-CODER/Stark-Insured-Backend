import { Injectable } from '@nestjs/common';

@Injectable()
export class DatabaseMonitoringService {
  async checkHealth(): Promise<{ status: string }> {
    return { status: 'ok' };
  }
}
