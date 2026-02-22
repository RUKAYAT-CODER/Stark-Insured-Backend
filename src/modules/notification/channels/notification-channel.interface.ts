export interface NotificationChannel {
  send(to: string, subject: string, message: string, options?: any): Promise<any>;
}
