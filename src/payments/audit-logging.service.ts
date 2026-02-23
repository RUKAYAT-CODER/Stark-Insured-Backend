import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AuditLoggingService {
  private logFilePath: string;

  constructor() {
    this.logFilePath = path.join(__dirname, '../../logs/audit.log');
    if (!fs.existsSync(path.dirname(this.logFilePath))) {
      fs.mkdirSync(path.dirname(this.logFilePath), { recursive: true });
    }
  }

  logEvent(event: string, data: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      data,
    };

    fs.appendFileSync(this.logFilePath, JSON.stringify(logEntry) + '\n');
  }
}