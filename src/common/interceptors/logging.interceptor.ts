import { 
  Injectable, 
  NestInterceptor, 
  ExecutionContext, 
  CallHandler, 
  Logger 
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid'; 
import { requestContext } from '../context/request-context.storage';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    const start = Date.now();

   
    const correlationId = 
      requestContext.getStore()?.get('correlationId') || 
      req['correlationId'] || 
      req.headers['x-correlation-id'] || 
      uuidv4(); 

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          
          this.logger.log(`[${correlationId}] ${method} ${url} - ${duration}ms - SUCCESS`);
        },
        error: (err) => {
          const duration = Date.now() - start;
          
          this.logger.error(
            `[${correlationId}] ${method} ${url} - ${duration}ms - ERROR: ${err.message}`,
            err.stack
          );
        }
      })
    );
  }
}