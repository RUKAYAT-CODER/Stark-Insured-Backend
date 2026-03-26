import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CsrfService {
  constructor(private configService: ConfigService) {}

  getCsrfOptions() {
    return {
      cookie: {
        httpOnly: true,
        secure: this.configService.get<string>('NODE_ENV') === 'production',
        sameSite: 'strict' as const,
      },
      ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
      value: (req: any) => {
        return req.csrfToken();
      },
    };
  }
}
