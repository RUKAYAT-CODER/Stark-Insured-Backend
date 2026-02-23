import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import checkDiskSpace from 'check-disk-space';

@Injectable()
export class DiskHealthIndicator extends HealthIndicator {
  async isHealthy(
    key: string = 'disk',
    path: string = process.cwd(),
    thresholdPercent: number = 90,
  ): Promise<HealthIndicatorResult> {
    try {
      const diskSpace = await checkDiskSpace(path);
      const usedPercent = (diskSpace.size - diskSpace.free) / diskSpace.size * 100;
      
      const isHealthy = usedPercent < thresholdPercent;
      
      return this.getStatus(key, isHealthy, {
        status: isHealthy ? 'up' : 'down',
        message: isHealthy 
          ? `Disk usage is healthy (${usedPercent.toFixed(2)}%)` 
          : `Disk usage is critical (${usedPercent.toFixed(2)}%)`,
        free: diskSpace.free,
        size: diskSpace.size,
        used: diskSpace.size - diskSpace.free,
        usedPercent: usedPercent,
        threshold: thresholdPercent,
      });
    } catch (error) {
      return this.getStatus(key, false, {
        status: 'down',
        message: `Disk health check failed: ${error.message}`,
      });
    }
  }
}