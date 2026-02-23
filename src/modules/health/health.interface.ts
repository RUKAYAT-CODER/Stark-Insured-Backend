export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  version?: string;
  environment?: string;
  checks?: {
    database?: any;
    queues?: any;
  };
  error?: string;
}
