import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPreferences } from './notification-preferences.entity';

@Injectable()
export class NotificationPreferencesService {
  constructor(
    @InjectRepository(NotificationPreferences)
    private readonly preferencesRepo: Repository<NotificationPreferences>,
  ) {}

  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    let prefs = await this.preferencesRepo.findOne({ where: { userId } });
    if (!prefs) {
      prefs = this.preferencesRepo.create({ userId });
      await this.preferencesRepo.save(prefs);
    }
    return prefs;
  }

  async updateUserPreferences(userId: string, updates: Partial<NotificationPreferences>) {
    let prefs = await this.getUserPreferences(userId);
    Object.assign(prefs, updates);
    return this.preferencesRepo.save(prefs);
  }
}
