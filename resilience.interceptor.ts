import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { ResilienceService } from '../services/resilience.service';
import { RESILIENCE_OPTIONS_KEY, ResilienceOptions } from '../interfaces/resilience.interface';

@Injectable()
export class ResilienceInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private resilienceService: ResilienceService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const options = this.reflector.get<ResilienceOptions>(
      RESILIENCE_OPTIONS_KEY,
      context.getHandler(),
    );

    if (!options) {
      return next.handle();
    }

    const className = context.getClass().name;
    const handlerName = context.getHandler().name;
    const key = options.key || `${className}.${handlerName}`;
    
    // We need to wrap the next.handle() observable in a promise for the service
    // and then convert back to observable
    const operation = async () => {
      return await next.handle().toPromise();
    };

    // Get the instance to bind fallback methods
    const instance = context.getClass().prototype; // Or context.switchToHttp().getRequest() for controllers? No, we need the service instance.
    // Note: In NestJS interceptors, 'this' context for fallback methods might be tricky.
    // We pass the controller/service instance from the context if possible, but usually interceptors wrap the handler.
    // For simplicity, we assume the service handles the execution logic.
    
    // Actually, for the interceptor to work correctly with 'this' in fallbacks, 
    // we should rely on the service instance which is not easily accessible here for binding.
    // However, we can pass the instance if the method is on the same class.
    // A better approach for 'this' context is using a Proxy or wrapper service, but let's try to get the instance.
    // context.getClass() returns the Type. We don't have the instance easily in Interceptor scope for the *Service* method if it's not a Controller.
    // If this is used on Controllers, context.getClass() is the Controller class.
    
    // For now, we pass the options. If fallbackMethod is used, it might need the instance.
    // We will use a simplified approach: The ResilienceService will try to call the method on the context if passed.
    // But context in interceptor is ExecutionContext.
    
    // Let's proceed with the execution wrapper.
    return from(this.resilienceService.execute(key, operation, options, context.switchToHttp().getRequest())); 
    // Note: Passing request as context is common for controllers, but for services we might need a different approach.
    // For this implementation, we'll assume fallback methods are static or don't rely on 'this' heavily, 
    // or the user uses the ResilienceService directly for complex cases.
  }
}