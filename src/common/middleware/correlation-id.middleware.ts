import { Injectable, NestMiddleware } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { requestContext } from '../context/request-context.storage';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const id = (req.headers['x-correlation-id'] as string) || uuidv4();
    
    
    req['correlationId'] = id;
    req.correlationId = id; 

    res.setHeader('x-correlation-id', id);

    const store = new Map().set('correlationId', id);
    requestContext.run(store, () => next());
  }
}