import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('notification_preferences')
export class NotificationPreferences {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'boolean', default: true })
  email: boolean;

  @Column({ type: 'boolean', default: false })
  sms: boolean;

  @Column({ type: 'boolean', default: false })
  push: boolean;
}
