import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DatabaseMonitoringService } from './database-monitoring.service';

@Injectable()
export class QueryPerformanceInterceptor implements NestInterceptor {
  constructor(private readonly monitoringService: DatabaseMonitoringService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    
    return next.handle().pipe(
      tap(() => {
        const executionTime = Date.now() - startTime;
        
        // Try to extract query information from the context
        const queryInfo = this.extractQueryInfo(context);
        
        if (queryInfo) {
          this.monitoringService.recordQuery(
            queryInfo.query,
            executionTime,
            queryInfo.parameters,
            queryInfo.rowsAffected,
          );
        }
      }),
    );
  }

  private extractQueryInfo(context: ExecutionContext): {
    query: string;
    parameters?: any[];
    rowsAffected?: number;
  } | null {
    // This is a simplified implementation
    // In a real scenario, you might want to use TypeORM's query logging
    // or custom decorators to capture query information
    
    const request = context.switchToHttp().getRequest();
    
    // For now, we'll return null and rely on TypeORM's built-in logging
    // You can enhance this based on your specific needs
    return null;
  }
}
