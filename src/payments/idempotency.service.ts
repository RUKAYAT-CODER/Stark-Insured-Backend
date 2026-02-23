import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class IdempotencyService {
  private idempotencyKeys = new Map<string, any>();

  generateKey(data: any): string {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  storeKey(key: string, result: any): void {
    this.idempotencyKeys.set(key, result);
  }

  getStoredResult(key: string): any {
    return this.idempotencyKeys.get(key);
  }

  hasKey(key: string): boolean {
    return this.idempotencyKeys.has(key);
  }
}