import { Injectable } from '@nestjs/common';

@Injectable()
export class SecurityStorageService {
  // In-memory storage for demonstration. In production, replace with Redis.
  private storage = new Map<string, { value: any; expiry: number }>();

  async get(key: string): Promise<any> {
    const data = this.storage.get(key);
    if (!data) return null;
    if (Date.now() > data.expiry) {
      this.storage.delete(key);
      return null;
    }
    return data.value;
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    this.storage.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  async increment(key: string, ttlSeconds: number): Promise<number> {
    const current = (await this.get(key)) || 0;
    const newValue = Number(current) + 1;
    await this.set(key, newValue, ttlSeconds);
    return newValue;
  }
}