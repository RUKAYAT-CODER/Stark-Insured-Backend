import { Controller, Get, Patch, Body, Param } from '@nestjs/common';
import { NotificationPreferencesService } from './notification-preferences.service';

@Controller('notification-preferences')
export class NotificationPreferencesController {
  constructor(private readonly prefsService: NotificationPreferencesService) {}

  @Get(':userId')
  async getPreferences(@Param('userId') userId: string) {
    return this.prefsService.getUserPreferences(userId);
  }

  @Patch(':userId')
  async updatePreferences(
    @Param('userId') userId: string,
    @Body() updates: any,
  ) {
    return this.prefsService.updateUserPreferences(userId, updates);
  }
}
